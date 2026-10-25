/**
 * @akalin/storage_module - Buluta Dosya Yükleme Modalı (UploadToCloud.tsx)
 * Yerel bir dosyayı Google Drive, OneDrive veya Dropbox hesabına yükler;
 * Belge ID veya Belge GUID ile ilişkilendirir.
 */

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, Cloud, File as FileIcon } from 'lucide-react';
import { FileUploadProgressBar, BasePopup, BaseButton, CancelButton } from '@akalin/ui';
import { useTranslation } from 'react-i18next';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { ProviderLogo } from '../logos/ProviderLogo';
import { StorageIntegrationDTO } from '../types';

export interface UploadToCloudProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: number;
  documentGuid?: string;
  documentType?: string;
  documentNo?: string;
  integrations?: StorageIntegrationDTO[];
  initialFile?: File | null;
  initialProvider?: string;
  klasorId?: number;
  onUploadSuccess?: (fileInfo: any, originalFile?: File) => void;
}

export const UploadToCloud: React.FC<UploadToCloudProps> = ({
  isOpen,
  onClose,
  documentId,
  documentGuid,
  documentType,
  documentNo,
  integrations: propIntegrations,
  initialFile,
  initialProvider,
  klasorId,
  onUploadSuccess,
}) => {
  const { t } = useTranslation();
  const { adapter, onNotify } = useStorageModule();

  const [integrations, setIntegrations] = useState<StorageIntegrationDTO[]>(propIntegrations || []);
  const [selectedProvider, setSelectedProvider] = useState<string>(initialProvider || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [autoUploadTriggered, setAutoUploadTriggered] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!propIntegrations || propIntegrations.length === 0) {
      adapter
        .getIntegrations()
        .then((data) => setIntegrations(data || []))
        .catch(() => {});
    } else {
      setIntegrations(propIntegrations);
    }
  }, [propIntegrations, adapter]);

  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      setAutoUploadTriggered(false);
    }
  }, [initialFile]);

  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  useEffect(() => {
    if (selectedFile && !isUploading && !autoUploadTriggered) {
      if (integrations.length === 1 || (integrations.length > 1 && selectedProvider)) {
        setAutoUploadTriggered(true);
        handleUpload();
      }
    }
  }, [selectedFile, selectedProvider, integrations.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const notify = (type: 'success' | 'error' | 'info' | 'warning', msg: string) => {
    if (onNotify) {
      onNotify(type, msg);
    } else if (type === 'success') {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      notify('error', t('UploadToCloud_selectFile', 'Lütfen bir dosya seçin.'));
      return;
    }

    if (integrations.length > 1 && !selectedProvider) {
      notify('error', t('UploadToCloud_selectProvider', 'Lütfen bir bulut sağlayıcısı seçin.'));
      return;
    }

    setIsUploading(true);
    const providerToUse = integrations.length === 1 ? integrations[0].providerType : selectedProvider;

    try {
      setUploadProgress(0);
      setLoadedBytes(0);
      setTotalBytes(selectedFile.size);

      abortControllerRef.current = new AbortController();

      const result = await adapter.uploadFile(
        {
          dosya: selectedFile,
          provider: providerToUse,
          klasorId,
          belgeTuru: documentType,
          belgeId: documentId,
          belgeGuid: documentGuid,
          belgeNo: documentNo,
        },
        (percent, loaded, total) => {
          setUploadProgress(percent);
          setLoadedBytes(loaded);
          setTotalBytes(total);
        },
        abortControllerRef.current.signal
      );

      notify('success', result?.mesaj || t('UploadToCloud_uploadSuccess', 'Dosya başarıyla yüklendi.'));
      if (onUploadSuccess) onUploadSuccess(result.dosya, selectedFile);
      onClose();

      setSelectedFile(null);
      setSelectedProvider('');
      setUploadProgress(0);
      setLoadedBytes(0);
      setTotalBytes(0);
      setAutoUploadTriggered(false);
    } catch (error: any) {
      if (error?.isCancel || error?.name === 'AbortError') {
        notify('info', t('UploadToCloud_uploadCancelled', 'Yükleme işlemi iptal edildi.'));
      } else {
        const msg = error?.message || t('UploadToCloud_uploadError', 'Dosya yüklenirken bir hata oluştu.');
        notify('error', msg);
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  if (!isOpen) return null;

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={onClose}
      title={t('UploadToCloud_title', 'Buluta Dosya Yükle')}
      modalSize="md"
      hideFooter={true}
    >
      <div className="p-24 flex flex-col gap-24 max-w-600 mx-auto w-full">
        {integrations.length > 1 && (
          <div className="form-group flex flex-col gap-8">
            <label className="text-13 font-semibold text-secondary">
              {t('UploadToCloud_selectProviderLabel', 'Hedef Bulut Hesabı')}
            </label>
            <div className="grid grid-cols-2 gap-12">
              {integrations.map((item) => {
                const isSelected = selectedProvider === item.providerType;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProvider(item.providerType)}
                    className={`flex items-center gap-12 p-12 rounded-12 border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-light text-primary shadow-xs'
                        : 'border-glass bg-surface hover:border-secondary'
                    }`}
                  >
                    <ProviderLogo provider={item.providerType} size={24} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-13 font-medium truncate">{item.name || item.providerType}</span>
                      <span className="text-11 text-secondary truncate">{item.email}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-16 p-32 text-center flex flex-col items-center justify-center gap-12 cursor-pointer transition-all ${
            selectedFile ? 'border-primary bg-primary-light' : 'border-glass hover:border-primary hover:bg-hover'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <div className="icon-box-large bg-surface rounded-full shadow-xs">
            {selectedFile ? <FileIcon size={32} className="text-primary" /> : <Upload size={32} className="text-secondary" />}
          </div>
          <div>
            <h4 className="m-0 text-15 font-semibold text-primary">
              {selectedFile ? selectedFile.name : t('UploadToCloud_dragDropText', 'Dosya seçmek için tıklayın veya sürükleyin')}
            </h4>
            <p className="m-0 text-12 text-secondary mt-4">
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : t('UploadToCloud_supportedFormats', 'PDF, Excel, Görseller ve dökümanlar')}
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="flex flex-col gap-8">
            <FileUploadProgressBar
              progress={uploadProgress}
              loadedBytes={loadedBytes}
              totalBytes={totalBytes}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-8 w-full mt-8">
          {!isUploading ? (
            <>
              <CancelButton onClick={onClose} text={t('Iptal', 'İptal')} />
              <BaseButton
                onClick={handleUpload}
                isSaving={false}
                disabled={!selectedFile || (integrations.length > 1 && !selectedProvider)}
                text={t('Yukle', 'Yükle')}
                icon={<Cloud size={16} />}
                type="button"
                className="btn-primary"
              />
            </>
          ) : (
            <CancelButton onClick={cancelUpload} text={t('UploadToCloud_cancelUpload', 'Yüklemeyi İptal Et')} />
          )}
        </div>
      </div>
    </BasePopup>
  );
};

export default UploadToCloud;
