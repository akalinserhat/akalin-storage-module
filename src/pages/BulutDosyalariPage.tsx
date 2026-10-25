/**
 * @akalin/storage_module - Bulut Dosyaları Sayfası (BulutDosyalariPage.tsx)
 * BaseCardPage standart şablonundan türetilmiştir.
 * Hem bağımsız sayfa rotası (/araclar/bulut-dosyalari) hem de belgelerden açılan tam ekran
 * BaseCardPage modal arabirimi olarak çift yönlü çalışır.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, Settings, RefreshCw, Upload, FolderPlus, HardDrive, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { BaseCardPage, ActionMenu, BaseSwitch } from '@akalin/ui';
import FilesOnClouds, { FilesOnCloudsHandle } from '../components/FilesOnClouds';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { CloudFileItem } from '../types';

export interface BulutDosyalariPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  documentId?: number;
  documentGuid?: string;
  documentType?: string;
  documentNo?: string;
  isModal?: boolean;
  showFolderTree?: boolean;
  isSelectMode?: boolean;
  onFileSelected?: (file: CloudFileItem) => void;
  onSelectFile?: (file: CloudFileItem) => void;
  asPage?: boolean;
}

export const BulutDosyalariPage: React.FC<BulutDosyalariPageProps> = ({
  isOpen = true,
  onClose,
  documentId,
  documentGuid,
  documentType,
  documentNo,
  isModal,
  showFolderTree = true,
  isSelectMode = false,
  onFileSelected,
  onSelectFile,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { adapter, showAlert, onNotify } = useStorageModule();

  const activeDocId = documentId ?? (location.state as any)?.documentId;
  const activeDocGuid = documentGuid ?? (location.state as any)?.documentGuid;
  const activeDocType = documentType ?? (location.state as any)?.documentType;
  const activeDocNo = documentNo ?? (location.state as any)?.documentNo;

  const isModalMode = Boolean(isModal);
  const [hasIntegrations, setHasIntegrations] = useState<boolean | null>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAttachedOnly, setIsAttachedOnly] = useState<boolean>(true);
  const filesOnCloudsRef = useRef<FilesOnCloudsHandle>(null);

  useEffect(() => {
    if (activeDocId || activeDocGuid || activeDocType) {
      setIsAttachedOnly(true);
    }
  }, [activeDocId, activeDocGuid, activeDocType]);

  const shouldShowFolderTree = showFolderTree && !isAttachedOnly;

  const notify = (type: 'success' | 'error' | 'info' | 'warning', msg: string) => {
    if (onNotify) {
      onNotify(type, msg);
    } else if (type === 'success') {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const handleAnalyzeCloudFiles = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    const toastId = toast.loading(
      t('BulutDosyalari_analizEdiliyor', 'Bulut sürücüsü taranıyor ve dosyalar analiz ediliyor...')
    );
    try {
      const res = await adapter.analyzeCloudFiles();
      toast.dismiss(toastId);
      notify('success', res?.mesaj || t('BulutDosyalari_analizTamamlandi', 'Bulut dosyaları başarıyla eşitlendi.'));
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.dismiss(toastId);
      notify('error', err?.message || t('BulutDosyalari_analizHata', 'Bulut dosyaları analiz edilirken hata oluştu.'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, adapter, t]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (location.pathname.endsWith('/bulut-dosyalari')) {
      const parentPath = location.pathname.replace(/\/bulut-dosyalari$/, '');
      navigate(parentPath, { state: location.state });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [onClose, location.pathname, location.state, navigate]);

  useEffect(() => {
    let isMounted = true;
    const checkIntegrations = async () => {
      try {
        const data = await adapter.getIntegrations();
        const active = Array.isArray(data) && data.length > 0 && data.some((i) => i.isConnected !== false);
        if (isMounted) {
          setHasIntegrations(active);
          setLoadingIntegrations(false);
          if (!active) {
            showAlert(
              'warning',
              t('BulutDepolama_entegrasyonYokBaslik', 'Bulut Depolama Entegrasyonu Bulunamadı'),
              t(
                'BulutDepolama_entegrasyonYokMesaj',
                'Bulut depolama için henüz hiçbir entegrasyon yapılmamış. Dosyaları görüntülemek veya yüklemek için lütfen en az bir bulut sağlayıcısı entegre ediniz.'
              ),
              () => navigate('/ayarlar/bulut-depolama'),
              t('BulutDepolama_entegrasyonSayfasinaGit', 'Entegrasyon Ayarlarına Git'),
              t('Iptal', 'İptal'),
              true
            );
          }
        }
      } catch {
        if (isMounted) {
          setHasIntegrations(false);
          setLoadingIntegrations(false);
          showAlert(
            'warning',
            t('BulutDepolama_entegrasyonYokBaslik', 'Bulut Depolama Entegrasyonu Bulunamadı'),
            t(
              'BulutDepolama_entegrasyonYokMesaj',
              'Bulut depolama için henüz hiçbir entegrasyon yapılmamış. Dosyaları görüntülemek veya yüklemek için lütfen en az bir bulut sağlayıcısı entegre ediniz.'
            ),
            () => navigate('/ayarlar/bulut-depolama'),
            t('BulutDepolama_entegrasyonSayfasinaGit', 'Entegrasyon Ayarlarına Git'),
            t('Iptal', 'İptal'),
            true
          );
        }
      }
    };
    checkIntegrations();
    return () => {
      isMounted = false;
    };
  }, [showAlert, navigate, adapter, t]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (isModalMode && !isOpen) {
    return null;
  }

  const subtitleText = activeDocNo
    ? `${t('Belge No')}: ${activeDocNo}`
    : activeDocType
    ? `${t('Belge')}: ${t(activeDocType)}`
    : t('FilesOnClouds_subtitle', 'Google Drive, OneDrive ve bulut sürücülerinizdeki dökümanları yönetin.');

  const subtitleBadge = activeDocType ? (activeDocNo ? t(activeDocType) : t('Yeni Belge')) : undefined;

  const cardContent = (
    <BaseCardPage
      id="bulutDosyalariCardPage"
      icon={<Cloud size={20} />}
      title={t('FilesOnClouds_title', 'Bulut Dosyaları')}
      pageTitle={t('FilesOnClouds_title', 'Bulut Dosyaları')}
      subtitleLeft={subtitleText}
      subtitleRight={subtitleBadge}
      showBackButton={true}
      onClose={handleClose}
      onBack={handleClose}
      hideSaveButton={true}
      asForm={false}
      className="cloud-files-card-page fade-in"
      headerExtra={
        hasIntegrations ? (
          <ActionMenu
            actions={[
              {
                label: t('UploadToCloud_title', 'Buluta Dosya Yükle'),
                icon: <Upload size={16} />,
                onClick: () => filesOnCloudsRef.current?.openUpload(),
              },
              ...(shouldShowFolderTree
                ? [
                    {
                      label: t('FilesOnClouds_addFolderTitle', 'Yeni Klasör Oluştur'),
                      icon: <FolderPlus size={16} />,
                      onClick: () => filesOnCloudsRef.current?.openCreateFolder(),
                    },
                  ]
                : []),
              {
                label: t('BulutDosyalari_analizEt', 'Bulut Dosyalarını Analiz Et'),
                icon: <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />,
                onClick: handleAnalyzeCloudFiles,
              },
              {
                label: t('FilesOnClouds_refresh', 'Yenile'),
                icon: <RefreshCw size={16} />,
                onClick: () => filesOnCloudsRef.current?.refresh(),
              },
              ...(onFileSelected || onSelectFile
                ? [
                    {
                      label: t('Bilgisayarımdan Seç', 'Bilgisayarımdan Seç'),
                      icon: <HardDrive size={16} />,
                      onClick: () => filesOnCloudsRef.current?.openLocalFilePicker?.(),
                    },
                  ]
                : []),
              {
                custom: (
                  <BaseSwitch
                    id="actionMenuAttachedFilesSwitch"
                    checked={isAttachedOnly}
                    onChange={(e) => setIsAttachedOnly(e.target.checked)}
                    label={
                      <span className="flex items-center gap-8">
                        <Paperclip size={15} className={isAttachedOnly ? 'text-primary' : 'text-secondary'} />
                        <span>{t('FilesOnClouds_attachedFilesOnly', 'Bu Belgeye Ekli Dosyalar')}</span>
                      </span>
                    }
                    className="action-menu-switch-item"
                  />
                ),
                dividerAbove: true,
              },
            ]}
          />
        ) : undefined
      }
    >
      {loadingIntegrations ? (
        <div className="flex-1 flex items-center justify-center min-h-200">
          <RefreshCw size={32} className="spinning loading-icon text-secondary" />
        </div>
      ) : hasIntegrations === false ? (
        <div className="surface-card p-40 rounded-16 flex flex-col items-center justify-center text-center my-24 max-w-500 mx-auto">
          <div className="icon-box-large bg-warning-light text-warning rounded-full mb-16">
            <CloudOff size={32} />
          </div>
          <div className="flex flex-col gap-8 mb-20">
            <h3 className="m-0 text-18 font-bold text-primary">
              {t('BulutDepolama_entegrasyonYokBaslik', 'Bulut Depolama Entegrasyonu Bulunamadı')}
            </h3>
            <p className="m-0 text-13 text-secondary leading-relaxed">
              {t(
                'BulutDepolama_entegrasyonYokMesaj',
                'Bulut depolama için henüz hiçbir entegrasyon yapılmamış. Dosyaları görüntülemek veya yüklemek için lütfen en az bir bulut sağlayıcısı entegre ediniz.'
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-8"
            onClick={() => navigate('/ayarlar/bulut-depolama')}
          >
            <Settings size={16} />
            <span>{t('BulutDepolama_entegrasyonSayfasinaGit', 'Entegrasyon Ayarlarına Git')}</span>
          </button>
        </div>
      ) : (
        <div className="cloud-files-page-content flex-1 flex flex-col min-h-0 h-full overflow-hidden">
          <FilesOnClouds
            ref={filesOnCloudsRef}
            key={refreshKey}
            isModal={false}
            showFolderTree={shouldShowFolderTree}
            documentId={activeDocId}
            documentGuid={activeDocGuid}
            documentType={activeDocType}
            documentNo={activeDocNo}
            isSelectMode={isSelectMode}
            onFileSelected={onFileSelected}
            onSelectFile={onSelectFile}
            onAnalyzeCloudFiles={handleAnalyzeCloudFiles}
            hideToolbarActions={true}
            isAttachedOnly={isAttachedOnly}
            onAttachedOnlyChange={setIsAttachedOnly}
          />
        </div>
      )}
    </BaseCardPage>
  );

  if (isModalMode) {
    const contentArea =
      typeof document !== 'undefined' ? (document.querySelector('.content-area') as HTMLElement) : null;
    if (contentArea && getComputedStyle(contentArea).position === 'static') {
      contentArea.style.position = 'relative';
    }

    const modalElement = <div className="cloud-files-modal-wrapper">{cardContent}</div>;

    if (contentArea) {
      return createPortal(modalElement, contentArea);
    }
    return modalElement;
  }

  return cardContent;
};

export default BulutDosyalariPage;
