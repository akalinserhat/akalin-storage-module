/**
 * @akalin/file_manager_module - Bulut Dosyaları Yönetim Bileşeni (FilesOnClouds.tsx)
 * Kullanıcının Google Drive, OneDrive vb. bulut sağlayıcılarındaki dosyalarını listeler,
 * klasör ağacını yönetir, dosya tipi filtreleme ve tekli/çoklu dosya seçimi sunar,
 * yeni dosya yükler ve belgelerle ilişkilendirir.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, useImperativeHandle } from 'react';
import toast from 'react-hot-toast';
import {
  Upload,
  ExternalLink,
  Trash2,
  Edit2,
  RefreshCw,
  FolderPlus,
  Paperclip,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileCode,
  File as FileGenericIcon,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ActionMenu,
  BasePromptDialog,
  DataTable,
  CloudDirectoryView,
  BaseSwitch,
  AlertDialog,
} from '@akalin/ui';
import UploadToCloud from './UploadToCloud';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { ProviderLogo } from '../logos/ProviderLogo';
import { CloudFileItem, CloudFolderItem, FileSelectionMode, StorageIntegrationDTO } from '../types';
import { validateFolderName, validateFileName } from '../validators/storageValidation';

export const formatFileBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getFileExtension = (fileName?: string): string => {
  if (!fileName || !fileName.includes('.')) return '';
  return (fileName.split('.').pop() || '').toLowerCase().trim();
};

export const renderFileTypeIcon = (fileName?: string, size = 18) => {
  const ext = getFileExtension(fileName);
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
    return <FileSpreadsheet size={size} />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return <FileText size={size} />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return <ImageIcon size={size} />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={size} />;
  }
  if (['json', 'xml', 'html', 'js', 'ts'].includes(ext)) {
    return <FileCode size={size} />;
  }
  return <FileGenericIcon size={size} />;
};

const normalizeFolderName = (s: string) => s.trim().toLowerCase().replace(/[\s_\-.]/g, '');

const findFolderRecursively = (
  items: CloudFolderItem[],
  predicate: (item: CloudFolderItem) => boolean
): CloudFolderItem | null => {
  for (const item of items) {
    if (predicate(item)) return item;
    if (item.altKlasorler && item.altKlasorler.length > 0) {
      const found = findFolderRecursively(item.altKlasorler, predicate);
      if (found) return found;
    }
  }
  return null;
};

export const findDocumentFolder = (
  folderList: CloudFolderItem[],
  targetDocType?: string,
  targetDocNo?: string
): CloudFolderItem | null => {
  if (!targetDocType && !targetDocNo) return null;

  let typeFolder: CloudFolderItem | null = null;
  if (targetDocType) {
    const normDocType = normalizeFolderName(targetDocType);
    typeFolder = findFolderRecursively(folderList, (item) => {
      return normalizeFolderName(item.klasorAdi) === normDocType;
    });
  }

  if (targetDocNo) {
    const normDocNo = normalizeFolderName(targetDocNo);
    if (typeFolder && typeFolder.altKlasorler && typeFolder.altKlasorler.length > 0) {
      const docNoFolder = findFolderRecursively(
        typeFolder.altKlasorler,
        (item) => normalizeFolderName(item.klasorAdi) === normDocNo
      );
      if (docNoFolder) return docNoFolder;
    }
    const globalDocNoFolder = findFolderRecursively(
      folderList,
      (item) => normalizeFolderName(item.klasorAdi) === normDocNo
    );
    if (globalDocNoFolder) return globalDocNoFolder;
  }

  return typeFolder;
};

export interface FilesOnCloudsProps {
  isOpen?: boolean;
  onClose?: () => void;
  documentId?: number;
  documentGuid?: string;
  documentType?: string;
  documentNo?: string;
  isModal?: boolean;
  showFolderTree?: boolean;
  isSelectMode?: boolean;
  selectionMode?: FileSelectionMode;
  selectedFileIds?: number[];
  allowedExtensions?: string[];
  onFileSelected?: (file: CloudFileItem) => void;
  onSelectFile?: (file: CloudFileItem) => void;
  onToggleSelectFile?: (file: CloudFileItem) => void;
  onAnalyzeCloudFiles?: () => void;
  hideToolbarActions?: boolean;
  isAttachedOnly?: boolean;
  onAttachedOnlyChange?: (val: boolean) => void;
  asPage?: boolean;
}

export interface FilesOnCloudsHandle {
  openUpload: () => void;
  openCreateFolder: () => void;
  refresh: () => void;
  analyze: () => void;
  openLocalFilePicker?: () => void;
  setIsAttachedOnly?: (val: boolean) => void;
}

export const FilesOnClouds = React.forwardRef<FilesOnCloudsHandle, FilesOnCloudsProps>(
  (
    {
      isOpen = true,
      onClose,
      documentId,
      documentGuid,
      documentType,
      documentNo,
      isModal = false,
      showFolderTree = true,
      isSelectMode = false,
      selectionMode = 'single',
      selectedFileIds = [],
      allowedExtensions,
      onFileSelected,
      onSelectFile,
      onToggleSelectFile,
      onAnalyzeCloudFiles,
      hideToolbarActions = false,
      isAttachedOnly,
      onAttachedOnlyChange,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const { adapter, onNotify } = useStorageModule();

    const isAttachedMode = !!(documentId || documentGuid || documentType);
    const [files, setFiles] = useState<CloudFileItem[]>([]);
    const [folders, setFolders] = useState<CloudFolderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [integrations, setIntegrations] = useState<StorageIntegrationDTO[]>([]);
    const [internalAttachedOnly, setInternalAttachedOnly] = useState<boolean>(() =>
      isAttachedOnly !== undefined ? isAttachedOnly : isAttachedMode
    );

    const effectiveAttachedOnly = isAttachedOnly !== undefined ? isAttachedOnly : internalAttachedOnly;
    const shouldShowFolderTree = showFolderTree && !effectiveAttachedOnly;

    const handleAttachedOnlyToggle = useCallback(
      (val: boolean) => {
        if (onAttachedOnlyChange) {
          onAttachedOnlyChange(val);
        } else {
          setInternalAttachedOnly(val);
        }
      },
      [onAttachedOnlyChange]
    );

    const [selectedFolder, setSelectedFolder] = useState<CloudFolderItem | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [renamingFile, setRenamingFile] = useState<CloudFileItem | null>(null);
    const [newFileName, setNewFileName] = useState('');
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [searchTerm] = useState('');

    const [deleteModalState, setDeleteModalState] = useState<{
      isOpen: boolean;
      fileToDelete: CloudFileItem | null;
      isDeleting: boolean;
    }>({
      isOpen: false,
      fileToDelete: null,
      isDeleting: false,
    });

    const localFileInputRef = useRef<HTMLInputElement>(null);

    const notify = (type: 'success' | 'error' | 'info' | 'warning', msg: string) => {
      if (onNotify) {
        onNotify(type, msg);
      } else if (type === 'success') {
        toast.success(msg);
      } else {
        toast.error(msg);
      }
    };

    const fetchIntegrations = useCallback(async () => {
      try {
        const data = await adapter.getIntegrations();
        setIntegrations(data || []);
      } catch {
        setIntegrations([]);
      }
    }, [adapter]);

    useEffect(() => {
      fetchIntegrations();
    }, [fetchIntegrations]);

    const fetchFolders = useCallback(async () => {
      try {
        const params: any = {};
        if (documentType) params.belgeTuru = documentType;
        if (documentId) params.belgeId = documentId;
        if (documentGuid) params.belgeGuid = documentGuid;
        if (documentNo) params.belgeNo = documentNo;

        const data = await adapter.getFolders(params);
        setFolders(data || []);

        if (documentType || documentNo) {
          const matched = findDocumentFolder(data || [], documentType, documentNo);
          if (matched && !selectedFolder) {
            setSelectedFolder(matched);
            setSelectedFolderId(matched.id);
          }
        }
      } catch (err) {
        console.error('Klasörler yüklenirken hata:', err);
      }
    }, [adapter, documentType, documentId, documentGuid, documentNo, selectedFolder]);

    const fetchFiles = useCallback(async () => {
      try {
        setLoading(true);
        const params: any = {};

        if (effectiveAttachedOnly) {
          if (documentGuid) params.belgeGuid = documentGuid;
          if (documentId) params.belgeId = documentId;
          if (documentType) params.belgeTuru = documentType;
          if (documentNo) params.belgeNo = documentNo;
          params.isAttachedOnly = true;
        } else if (selectedFolderId) {
          params.klasorId = selectedFolderId;
        }

        if (searchTerm) {
          params.arama = searchTerm;
        }

        const data = await adapter.getFiles(params);
        setFiles(data || []);
      } catch {
        notify('error', t('FilesOnClouds_loadError', 'Dosyalar yüklenirken bir hata oluştu.'));
      } finally {
        setLoading(false);
      }
    }, [adapter, effectiveAttachedOnly, selectedFolderId, searchTerm, documentGuid, documentId, documentType, documentNo, t]);

    useEffect(() => {
      fetchFolders();
    }, [fetchFolders]);

    useEffect(() => {
      fetchFiles();
    }, [fetchFiles]);

    // Uzantı filtresine göre dosyaları süz
    const filteredFiles = useMemo(() => {
      if (!allowedExtensions || allowedExtensions.length === 0) return files;
      const normalizedAllowed = allowedExtensions.map((ext) => ext.replace(/^\./, '').toLowerCase().trim());
      return files.filter((f) => {
        const ext = getFileExtension(f.dosyaAdi);
        return normalizedAllowed.includes(ext);
      });
    }, [files, allowedExtensions]);

    const handleCreateFolder = async (folderName?: string) => {
      const name = folderName || newFolderName;
      const valResult = validateFolderName(name);
      if (!valResult.isValid) {
        notify('error', valResult.message || t('Gecersiz_klasor_adi', 'Geçersiz klasör adı.'));
        return;
      }

      try {
        const provider = integrations[0]?.providerType || 'google';
        await adapter.createFolder({
          ad: name.trim(),
          provider,
          ustKlasorId: selectedFolderId,
        });
        notify('success', t('FilesOnClouds_folderCreated', 'Klasör başarıyla oluşturuldu.'));
        setIsCreateFolderOpen(false);
        setNewFolderName('');
        fetchFolders();
      } catch (err: any) {
        notify('error', err?.message || t('FilesOnClouds_folderCreateError', 'Klasör oluşturulamadı.'));
      }
    };

    const handleRenameFile = async (fileName?: string) => {
      if (!renamingFile) return;
      const name = fileName || newFileName;
      const valResult = validateFileName(name);
      if (!valResult.isValid) {
        notify('error', valResult.message || t('Gecersiz_dosya_adi', 'Geçersiz dosya adı.'));
        return;
      }

      try {
        await adapter.renameFile(renamingFile.id, name.trim());
        notify('success', t('FilesOnClouds_fileRenamed', 'Dosya adı güncellendi.'));
        setIsRenameOpen(false);
        setRenamingFile(null);
        setNewFileName('');
        fetchFiles();
      } catch (err: any) {
        notify('error', err?.message || t('FilesOnClouds_fileRenameError', 'Dosya adı değiştirilemedi.'));
      }
    };

    const handleDeleteFile = async (file: CloudFileItem) => {
      setDeleteModalState({
        isOpen: true,
        fileToDelete: file,
        isDeleting: false,
      });
    };

    const executeDeleteFile = async () => {
      const file = deleteModalState.fileToDelete;
      if (!file) return;

      try {
        setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));
        await adapter.deleteFile(file.id);
        notify('success', t('FilesOnClouds_fileDeleted', 'Dosya silindi.'));
        setDeleteModalState({ isOpen: false, fileToDelete: null, isDeleting: false });
        fetchFiles();
      } catch (err: any) {
        notify('error', err?.message || t('FilesOnClouds_fileDeleteError', 'Dosya silinemedi.'));
        setDeleteModalState((prev) => ({ ...prev, isDeleting: false }));
      }
    };

    const handleAnalyze = async () => {
      if (onAnalyzeCloudFiles) {
        onAnalyzeCloudFiles();
        return;
      }
      setIsAnalyzing(true);
      const toastId = toast.loading(
        t('BulutDosyalari_analizEdiliyor', 'Bulut sürücüsü taranıyor ve dosyalar analiz ediliyor...')
      );
      try {
        const res = await adapter.analyzeCloudFiles();
        toast.dismiss(toastId);
        notify('success', res?.mesaj || t('BulutDosyalari_analizTamamlandi', 'Bulut dosyaları başarıyla eşitlendi.'));
        fetchFolders();
        fetchFiles();
      } catch (err: any) {
        toast.dismiss(toastId);
        notify('error', err?.message || t('BulutDosyalari_analizHata', 'Bulut dosyaları analiz edilirken hata oluştu.'));
      } finally {
        setIsAnalyzing(false);
      }
    };

    const handleRowSelection = useCallback(
      (row: CloudFileItem) => {
        if (selectionMode === 'multiple' && onToggleSelectFile) {
          onToggleSelectFile(row);
          return;
        }
        if (onFileSelected) onFileSelected(row);
        if (onSelectFile) onSelectFile(row);
        if (onClose && selectionMode === 'single') onClose();
      },
      [selectionMode, onToggleSelectFile, onFileSelected, onSelectFile, onClose]
    );

    useImperativeHandle(ref, () => ({
      openUpload: () => setIsUploadModalOpen(true),
      openCreateFolder: () => setIsCreateFolderOpen(true),
      refresh: () => {
        fetchFolders();
        fetchFiles();
      },
      analyze: handleAnalyze,
      openLocalFilePicker: () => localFileInputRef.current?.click(),
      setIsAttachedOnly: handleAttachedOnlyToggle,
    }));

    const columns = useMemo(
      () => [
        ...(isSelectMode && selectionMode === 'multiple'
          ? [
              {
                id: 'selectCheck',
                header: '',
                accessor: 'id',
                width: '44px',
                render: (row: CloudFileItem) => {
                  const isChecked = selectedFileIds.includes(row.id);
                  return (
                    <div className="flex items-center justify-center">
                      {isChecked ? (
                        <CheckCircle2 size={18} className="text-primary" />
                      ) : (
                        <Circle size={18} className="text-secondary" />
                      )}
                    </div>
                  );
                },
              },
            ]
          : []),
        {
          id: 'dosyaAdi',
          header: t('FilesOnClouds_colName', 'Dosya Adı'),
          accessor: 'dosyaAdi',
          render: (row: CloudFileItem) => {
            const isChecked = isSelectMode && selectionMode === 'multiple' && selectedFileIds.includes(row.id);
            return (
              <div className="flex items-center gap-12 py-4">
                <div
                  className={`flex items-center justify-center w-36 h-36 rounded-8 border border-glass flex-shrink-0 ${
                    isChecked ? 'bg-primary-light text-primary' : 'bg-surface-variant text-primary'
                  }`}
                >
                  {renderFileTypeIcon(row.dosyaAdi, 18)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-13 text-primary truncate" title={row.dosyaAdi}>
                    {row.dosyaAdi}
                  </span>
                  <span className="text-11 text-secondary">
                    {formatFileBytes(row.boyut)} •{' '}
                    {row.yuklemeTarihi ? new Date(row.yuklemeTarihi).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            );
          },
        },
        {
          id: 'provider',
          header: t('FilesOnClouds_colProvider', 'Sağlayıcı'),
          accessor: 'provider',
          render: (row: CloudFileItem) => (
            <div className="flex items-center gap-6">
              {row.provider && <ProviderLogo provider={row.provider} size={18} />}
              <span className="text-12 font-medium capitalize text-secondary">
                {row.provider || t('Bulut', 'Bulut')}
              </span>
            </div>
          ),
        },
        {
          id: 'actions',
          header: '',
          accessor: 'id',
          width: '50px',
          render: (row: CloudFileItem) => (
            <ActionMenu
              actions={[
                ...(isSelectMode
                  ? [
                      {
                        label:
                          selectionMode === 'multiple' && selectedFileIds.includes(row.id)
                            ? t('FilesOnClouds_unselect', 'Seçimi Kaldır')
                            : t('FilesOnClouds_select', 'Seç'),
                        icon: <Paperclip size={15} />,
                        onClick: () => handleRowSelection(row),
                      },
                    ]
                  : []),
                ...(row.dosyaUrl
                  ? [
                      {
                        label: t('FilesOnClouds_open', 'Aç / Görüntüle'),
                        icon: <ExternalLink size={15} />,
                        onClick: () => window.open(row.dosyaUrl, '_blank'),
                      },
                    ]
                  : []),
                {
                  label: t('FilesOnClouds_rename', 'Yeniden Adlandır'),
                  icon: <Edit2 size={15} />,
                  onClick: () => {
                    setRenamingFile(row);
                    setNewFileName(row.dosyaAdi);
                    setIsRenameOpen(true);
                  },
                },
                {
                  label: t('FilesOnClouds_delete', 'Sil'),
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onClick: () => handleDeleteFile(row),
                },
              ]}
            />
          ),
        },
      ],
      [t, isSelectMode, selectionMode, selectedFileIds, handleRowSelection]
    );

    if (!isOpen) return null;

    return (
      <div className="flex flex-col flex-1 h-full w-full min-h-0 bg-surface rounded-16 overflow-hidden">
        {/* Gizli yerel dosya seçici input'u */}
        <input
          ref={localFileInputRef}
          type="file"
          className="hidden"
          multiple={selectionMode === 'multiple'}
          accept={
            allowedExtensions && allowedExtensions.length > 0
              ? allowedExtensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)).join(',')
              : undefined
          }
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              if (onFileSelected) onFileSelected({ id: 0, dosyaAdi: file.name, boyut: file.size, localFile: file } as any);
              if (onSelectFile) onSelectFile({ id: 0, dosyaAdi: file.name, boyut: file.size, localFile: file } as any);
              if (onClose && selectionMode === 'single') onClose();
            }
          }}
        />

        {!hideToolbarActions && (
          <div className="p-16 border-b border-glass flex items-center justify-between gap-12 flex-wrap bg-surface-variant">
            <div className="flex items-center gap-8">
              <button
                type="button"
                className="btn btn-primary flex items-center gap-8 text-13"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload size={16} />
                <span>{t('UploadToCloud_title', 'Buluta Dosya Yükle')}</span>
              </button>

              {shouldShowFolderTree && (
                <button
                  type="button"
                  className="btn btn-outline-secondary flex items-center gap-8 text-13"
                  onClick={() => setIsCreateFolderOpen(true)}
                >
                  <FolderPlus size={16} />
                  <span>{t('FilesOnClouds_addFolderTitle', 'Yeni Klasör')}</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-ghost flex items-center gap-8 text-13"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                <RefreshCw size={15} className={isAnalyzing ? 'animate-spin' : ''} />
                <span>{t('BulutDosyalari_analizEt', 'Eşitle & Analiz Et')}</span>
              </button>
            </div>

            <div className="flex items-center gap-16">
              {isAttachedMode && (
                <BaseSwitch
                  id="attachedFilesOnlySwitch"
                  checked={effectiveAttachedOnly}
                  onChange={(e) => handleAttachedOnlyToggle(e.target.checked)}
                  label={
                    <span className="flex items-center gap-6 text-13">
                      <Paperclip size={14} className={effectiveAttachedOnly ? 'text-primary' : 'text-secondary'} />
                      <span>{t('FilesOnClouds_attachedFilesOnly', 'Bu Belgeye Ekli Dosyalar')}</span>
                    </span>
                  }
                />
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {shouldShowFolderTree && (
            <div className="w-260 border-r border-glass p-16 overflow-y-auto flex-shrink-0 bg-surface">
              <div className="flex items-center justify-between mb-12">
                <span className="text-12 font-semibold text-secondary uppercase tracking-wider">
                  {t('FilesOnClouds_folders', 'Klasörler')}
                </span>
                <button
                  type="button"
                  className="btn-icon-xs text-secondary hover:text-primary"
                  onClick={() => setIsCreateFolderOpen(true)}
                  title={t('FilesOnClouds_addFolderTitle', 'Yeni Klasör')}
                >
                  <FolderPlus size={15} />
                </button>
              </div>
              <CloudDirectoryView
                folders={folders}
                selectedFolder={selectedFolder}
                onSelectFolder={(folder) => {
                  setSelectedFolder(folder);
                  setSelectedFolderId(folder?.id || null);
                }}
                showAddFolderButton={true}
                onAddFolder={() => setIsCreateFolderOpen(true)}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-16">
            <DataTable
              columns={columns}
              data={filteredFiles}
              loading={loading}
              emptyMessage={
                effectiveAttachedOnly
                  ? t('FilesOnClouds_noAttachedFiles', 'Bu belgeye iliştirilmiş bulut dosyası bulunmuyor.')
                  : t('FilesOnClouds_noFiles', 'Bu klasörde henüz uygun dosya bulunmuyor.')
              }
              onRowClick={isSelectMode ? handleRowSelection : undefined}
            />
          </div>
        </div>

        {/* Modal: Buluta Dosya Yükle */}
        <UploadToCloud
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          documentId={documentId}
          documentGuid={documentGuid}
          documentType={documentType}
          documentNo={documentNo}
          klasorId={selectedFolderId || undefined}
          onUploadSuccess={() => {
            fetchFiles();
            fetchFolders();
          }}
        />

        {/* Dialog: Yeni Klasör Oluştur */}
        <BasePromptDialog
          isOpen={isCreateFolderOpen}
          onClose={() => setIsCreateFolderOpen(false)}
          title={t('FilesOnClouds_addFolderTitle', 'Yeni Klasör Oluştur')}
          label={t('FilesOnClouds_folderNamePrompt', 'Lütfen klasör adını yazın:')}
          initialValue={newFolderName}
          onConfirm={(val) => handleCreateFolder(val)}
          confirmText={t('Olustur', 'Oluştur')}
          cancelText={t('Iptal', 'İptal')}
          placeholder={t('FilesOnClouds_folderPlaceholder', 'Örn: Faturalar, Sözleşmeler')}
        />

        {/* Dialog: Dosya Yeniden Adlandır */}
        <BasePromptDialog
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          title={t('FilesOnClouds_renameTitle', 'Dosyayı Yeniden Adlandır')}
          label={t('FilesOnClouds_renamePrompt', 'Yeni dosya adını girin:')}
          initialValue={newFileName}
          onConfirm={(val) => handleRenameFile(val)}
          confirmText={t('Kaydet', 'Kaydet')}
          cancelText={t('Iptal', 'İptal')}
        />

        {/* Dialog: Dosya Sil Onayı */}
        <AlertDialog
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, fileToDelete: null, isDeleting: false })}
          title={t('Emin_misiniz', 'Emin misiniz?')}
          message={t(
            'FilesOnClouds_deleteConfirm',
            '"{{name}}" dosyasını bulut sürücünüzden silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            { name: deleteModalState.fileToDelete?.dosyaAdi || '' }
          )}
          type="confirm"
          showCancel={true}
          confirmText={t('Sil', 'Sil')}
          cancelText={t('Iptal', 'İptal')}
          onConfirm={executeDeleteFile}
        />
      </div>
    );
  }
);

export default FilesOnClouds;
