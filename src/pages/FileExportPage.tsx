/**
 * @akalin/file_manager_module - Yerel & Bulut Dosya Dışa Aktarma / Kaydetme Sayfası (FileExportPage.tsx)
 * BaseCardPage standart şablonundan türetilmiştir.
 * Özellikler:
 * 1) Dosya adı ve dışa aktarma formatı seçimi (.xlsx, .csv, .json, .xml, .txt, .html veya hazır File/Blob).
 * 2) Bilgisayara İndir (Yerel) ve Bulut Klasörüne Kaydet (Google Drive, OneDrive, Dropbox) hedefleri.
 * 3) Tablo verisi (data + columns) verildiğinde dışa aktarılacak sütunları seçme ve önizleme.
 * 4) Belge bağlamı (documentType, documentNo, documentId, documentGuid) ile otomatik bulut klasörü eşleştirme.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Cloud,
  HardDrive,
  FolderPlus,
  CheckCircle2,
  Circle,
  ExternalLink,
  Layers,
  FolderTree,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  BaseCardPage,
  BaseDropdownSecici,
  BaseSwitch,
  TabLayout,
  CloudDirectoryView,
  BasePromptDialog,
  FileUploadProgressBar,
  type ActionMenuItem,
  type DropdownOption,
} from '@akalin/ui';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { ProviderLogo } from '../logos/ProviderLogo';
import {
  findDocumentFolder,
  formatFileBytes,
  renderFileTypeIcon,
} from '../components/FilesOnClouds';
import { validateFileName, validateFolderName } from '../validators/storageValidation';
import { openExcelInNewTab } from './FileImportPage';
import {
  CloudFileItem,
  CloudFolderItem,
  ExcelSheet,
  ExportColumnDef,
  ExportDestinationType,
  ExportFormatType,
  StorageIntegrationDTO,
} from '../types';

export type { ExportColumnDef, ExportDestinationType, ExportFormatType };

export interface FileExportResult {
  fileName: string;
  format: string;
  destination: ExportDestinationType;
  blob: Blob;
  cloudFile?: CloudFileItem;
}

export interface FileExportPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  /**
   * Varsayılan dosya adı (uzantısız veya uzantılı)
   */
  defaultFileName?: string;
  /**
   * Varsayılan dışa aktarma formatı
   */
  defaultFormat?: ExportFormatType;
  /**
   * İzin verilen dışa aktarma formatları listesi
   */
  availableFormats?: ExportFormatType[];
  /**
   * Tablo verisi dışa aktarılacaksa satır dizisi
   */
  data?: any[];
  /**
   * Tablo verisi sütun tanımları
   */
  columns?: ExportColumnDef[];
  /**
   * Excel sayfa (sheet) adı
   */
  sheetName?: string;
  /**
   * Hazır bir File veya Blob nesnesi kaydedilecekse
   */
  file?: File | Blob | null;
  /**
   * Özel dosya üretici fonksiyon (örn: backend'den PDF/Excel blob çeken asenkron fonksiyon)
   */
  onGenerateFile?: (format: ExportFormatType, fileName: string) => Promise<File | Blob>;
  /**
   * Dışa aktarma tamamlandığında tetiklenen callback
   */
  onExportSuccess?: (result: FileExportResult) => void;
  /**
   * Başlangıç hedef sekmesi ('local' | 'cloud')
   */
  defaultTargetTab?: 'local' | 'cloud';
  /**
   * Yerel indirme yapılırken aynı zamanda buluta da kaydedilsin mi?
   */
  defaultAlsoSaveToCloud?: boolean;
  documentId?: number;
  documentGuid?: string;
  documentType?: string;
  documentNo?: string;
  isModal?: boolean;
  asPage?: boolean;
}

export type ExcelExportPageProps = FileExportPageProps;
export type FileExportModalProps = FileExportPageProps;

const FORMAT_LABELS: Record<ExportFormatType, { label: string; mime: string; ext: string }> = {
  xlsx: {
    label: 'Excel Çalışma Kitabı (.xlsx)',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
  },
  csv: {
    label: 'CSV - Virgülle Ayrılmış Değerler (.csv)',
    mime: 'text/csv;charset=utf-8;',
    ext: 'csv',
  },
  json: {
    label: 'JSON Veri Dosyası (.json)',
    mime: 'application/json;charset=utf-8;',
    ext: 'json',
  },
  xml: {
    label: 'XML Veri Dosyası (.xml)',
    mime: 'application/xml;charset=utf-8;',
    ext: 'xml',
  },
  html: {
    label: 'HTML Tablo Belgesi (.html)',
    mime: 'text/html;charset=utf-8;',
    ext: 'html',
  },
  txt: {
    label: 'Düz Metin Dosyası (.txt)',
    mime: 'text/plain;charset=utf-8;',
    ext: 'txt',
  },
};

function stripFileExtension(name: string): string {
  return name.replace(/\.(xlsx|xls|csv|json|xml|html|txt|pdf)$/i, '').trim();
}

export const FileExportPage: React.FC<FileExportPageProps> = ({
  isOpen = true,
  onClose,
  title,
  subtitle,
  defaultFileName = 'webakus_disa_aktarim',
  defaultFormat = 'xlsx',
  availableFormats = ['xlsx', 'csv', 'json', 'xml', 'html'],
  data = [],
  columns: propColumns = [],
  sheetName = 'Veriler',
  file: externalFile,
  onGenerateFile,
  onExportSuccess,
  defaultTargetTab = 'local',
  defaultAlsoSaveToCloud = false,
  documentId,
  documentGuid,
  documentType,
  documentNo,
  isModal = true,
  asPage = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { adapter } = useStorageModule();
  const isBulutActive = true;

  const isExportRoute =
    location.pathname.endsWith('/file-export') ||
    location.pathname.endsWith('/excel-export') ||
    location.pathname.endsWith('/dosya-kaydet');
  const isEffectivelyOpen = Boolean(isOpen) || isExportRoute;
  const isModalMode = Boolean(isModal) && !asPage;

  const effectiveDocumentType = documentType || (location.state as any)?.documentType;
  const effectiveDocumentNo = documentNo || (location.state as any)?.documentNo;
  const effectiveDocumentId = documentId || (location.state as any)?.documentId;
  const effectiveDocumentGuid = documentGuid || (location.state as any)?.documentGuid;
  const stateData: any[] = data.length > 0 ? data : (location.state as any)?.exportData || [];
  const stateColumns: ExportColumnDef[] =
    propColumns.length > 0 ? propColumns : (location.state as any)?.exportColumns || [];

  // Otomatik sütun çıkarımı (eğer data verilmiş ama columns verilmemişse)
  const effectiveColumns = useMemo<ExportColumnDef[]>(() => {
    if (stateColumns.length > 0) return stateColumns;
    if (stateData.length > 0 && typeof stateData[0] === 'object' && stateData[0] !== null) {
      return Object.keys(stateData[0])
        .filter((k) => !k.startsWith('_'))
        .map((k) => ({
          key: k,
          label: k,
          selected: true,
        }));
    }
    return [];
  }, [stateColumns, stateData]);

  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() =>
    effectiveColumns.filter((c) => c.selected !== false).map((c) => c.key)
  );

  useEffect(() => {
    setSelectedColumnKeys(effectiveColumns.filter((c) => c.selected !== false).map((c) => c.key));
  }, [effectiveColumns]);

  const [baseFileName, setBaseFileName] = useState<string>(() => {
    if (externalFile && 'name' in externalFile && externalFile.name) {
      return stripFileExtension(externalFile.name);
    }
    if (effectiveDocumentNo) {
      return stripFileExtension(`${effectiveDocumentType || 'belge'}_${effectiveDocumentNo}`);
    }
    return stripFileExtension(defaultFileName);
  });

  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>(defaultFormat);
  const [targetTab, setTargetTab] = useState<'local' | 'cloud'>(defaultTargetTab);
  const [alsoSaveToCloud, setAlsoSaveToCloud] = useState<boolean>(defaultAlsoSaveToCloud);

  // Bulut sağlayıcıları ve klasörleri
  const [integrations, setIntegrations] = useState<StorageIntegrationDTO[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('google');
  const [folders, setFolders] = useState<CloudFolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CloudFolderItem | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loadingCloud, setLoadingCloud] = useState<boolean>(false);

  // Yeni klasör oluşturma
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  // Yükleme / Dışa Aktarma İlerleme Durumu
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fullFileName = useMemo(() => {
    if (externalFile && 'name' in externalFile && externalFile.name && !availableFormats.length) {
      return externalFile.name;
    }
    const cleanBase = stripFileExtension(baseFileName || 'dosya');
    const ext = FORMAT_LABELS[selectedFormat]?.ext || selectedFormat;
    return `${cleanBase}.${ext}`;
  }, [baseFileName, selectedFormat, externalFile, availableFormats.length]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    setUploadPercent(0);
    if (isExportRoute) {
      const parentPath = location.pathname.replace(/\/(file-export|excel-export|dosya-kaydet)$/, '');
      navigate(parentPath || '/', {
        state: {
          ...(location.state as any),
        },
      });
    }
    if (onClose) {
      onClose();
    }
  }, [isExportRoute, location.pathname, location.state, navigate, onClose]);

  // Escape ile çıkış
  useEffect(() => {
    if (!isEffectivelyOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEffectivelyOpen, isExporting, handleClose]);

  const fetchCloudContext = useCallback(async () => {
    if (!isBulutActive) return;
    setLoadingCloud(true);
    try {
      const [intList, folderList] = await Promise.all([
        adapter.getIntegrations(),
        adapter.getFolders({
          belgeTuru: effectiveDocumentType,
          belgeId: effectiveDocumentId,
          belgeGuid: effectiveDocumentGuid,
          belgeNo: effectiveDocumentNo,
        }),
      ]);

      const activeInts = (intList || []).filter((i) => i.isConnected !== false);
      setIntegrations(activeInts);
      if (activeInts.length > 0) {
        setSelectedProvider(activeInts[0].providerType);
      }

      setFolders(folderList || []);
      if (effectiveDocumentType || effectiveDocumentNo) {
        const matched = findDocumentFolder(folderList || [], effectiveDocumentType, effectiveDocumentNo);
        if (matched) {
          setSelectedFolder(matched);
          setSelectedFolderId(matched.id);
        }
      }
    } catch (err) {
      console.error('Bulut bilgileri alınırken hata:', err);
    } finally {
      setLoadingCloud(false);
    }
  }, [
    isBulutActive,
    adapter,
    effectiveDocumentType,
    effectiveDocumentId,
    effectiveDocumentGuid,
    effectiveDocumentNo,
  ]);

  useEffect(() => {
    if (isEffectivelyOpen && isBulutActive) {
      fetchCloudContext();
    }
  }, [isEffectivelyOpen, isBulutActive, fetchCloudContext]);

  const handleCreateFolder = async (folderNameInput?: string) => {
    const name = folderNameInput || newFolderName;
    const valResult = validateFolderName(name);
    if (!valResult.isValid) {
      toast.error(valResult.message || t('Gecersiz_klasor_adi', 'Geçersiz klasör adı.'));
      return;
    }

    try {
      const created = await adapter.createFolder({
        ad: name.trim(),
        provider: selectedProvider || 'google',
        ustKlasorId: selectedFolderId,
      });
      toast.success(t('FilesOnClouds_folderCreated', 'Klasör başarıyla oluşturuldu.'));
      setIsCreateFolderOpen(false);
      setNewFolderName('');
      await fetchCloudContext();
      if (created) {
        setSelectedFolder(created);
        setSelectedFolderId(created.id);
      }
    } catch (err: any) {
      toast.error(err?.message || t('FilesOnClouds_folderCreateError', 'Klasör oluşturulamadı.'));
    }
  };

  const activeExportColumns = useMemo(
    () => effectiveColumns.filter((c) => selectedColumnKeys.includes(c.key)),
    [effectiveColumns, selectedColumnKeys]
  );

  // Tablo verisinden Blob oluşturma
  const buildBlobFromData = useCallback(async (): Promise<Blob> => {
    if (externalFile) {
      return externalFile;
    }
    if (onGenerateFile) {
      return await onGenerateFile(selectedFormat, fullFileName);
    }

    const cols = activeExportColumns;
    const headerRow = cols.map((c) => c.label);
    const bodyRows = stateData.map((row) =>
      cols.map((c) => {
        const raw = row?.[c.key];
        const formatted = c.format ? c.format(raw, row) : raw;
        return formatted !== undefined && formatted !== null ? formatted : '';
      })
    );

    if (selectedFormat === 'xlsx' || selectedFormat === 'csv' || selectedFormat === 'html' || selectedFormat === 'txt') {
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
      if (cols.some((c) => c.width)) {
        ws['!cols'] = cols.map((c) => ({ wch: c.width || 18 }));
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Veriler');

      if (selectedFormat === 'xlsx') {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([wbout], { type: FORMAT_LABELS.xlsx.mime });
      }
      if (selectedFormat === 'csv') {
        const csvStr = XLSX.utils.sheet_to_csv(ws);
        // UTF-8 BOM ekleyerek Türkçe karakterlerin Excel'de bozulmasını önle
        return new Blob(['\uFEFF' + csvStr], { type: FORMAT_LABELS.csv.mime });
      }
      if (selectedFormat === 'html') {
        const htmlStr = XLSX.utils.sheet_to_html(ws);
        return new Blob([htmlStr], { type: FORMAT_LABELS.html.mime });
      }
      const txtStr = XLSX.utils.sheet_to_txt(ws);
      return new Blob([txtStr], { type: FORMAT_LABELS.txt.mime });
    }

    if (selectedFormat === 'json') {
      const jsonObjects = stateData.map((row) => {
        const obj: Record<string, any> = {};
        cols.forEach((c) => {
          const raw = row?.[c.key];
          obj[c.key] = c.format ? c.format(raw, row) : raw;
        });
        return obj;
      });
      return new Blob([JSON.stringify(jsonObjects, null, 2)], { type: FORMAT_LABELS.json.mime });
    }

    if (selectedFormat === 'xml') {
      const escapeXml = (unsafe: any) =>
        String(unsafe ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

      const xmlRows = stateData
        .map((row) => {
          const fields = cols
            .map((c) => {
              const tag = c.key.replace(/[^a-zA-Z0-9_]/g, '_') || 'Alan';
              const val = c.format ? c.format(row?.[c.key], row) : row?.[c.key];
              return `    <${tag}>${escapeXml(val)}</${tag}>`;
            })
            .join('\n');
          return `  <Kayit>\n${fields}\n  </Kayit>`;
        })
        .join('\n');

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<Kayitlar>\n${xmlRows}\n</Kayitlar>`;
      return new Blob([xmlContent], { type: FORMAT_LABELS.xml.mime });
    }

    return new Blob([], { type: 'application/octet-stream' });
  }, [externalFile, onGenerateFile, selectedFormat, fullFileName, activeExportColumns, stateData, sheetName]);

  // Yeni Sekmede Önizleme
  const handlePreviewInNewTab = useCallback(() => {
    if (stateData.length === 0 || activeExportColumns.length === 0) {
      toast.error(t('ExcelImport_noDataToPreview', 'Önizlenecek sayfa verisi bulunamadı.'));
      return;
    }

    const headerRow = activeExportColumns.map((c) => c.label);
    const bodyRows = stateData.map((row) =>
      activeExportColumns.map((c) => {
        const raw = row?.[c.key];
        return c.format ? c.format(raw, row) : raw;
      })
    );

    const previewSheet: ExcelSheet = {
      name: sheetName || t('Veriler', 'Veriler'),
      isActive: true,
      data: [headerRow, ...bodyRows],
      maxCols: activeExportColumns.length,
      validColumns: activeExportColumns.map((_, idx) => idx),
      mapping: {},
    };

    openExcelInNewTab(fullFileName, [previewSheet], previewSheet.name, t);
  }, [stateData, activeExportColumns, sheetName, fullFileName, t]);

  // Dosyayı Kaydet / Dışa Aktar
  const handleExport = async () => {
    const nameValidation = validateFileName(fullFileName);
    if (!nameValidation.isValid) {
      toast.error(nameValidation.message || t('Gecersiz_dosya_adi', 'Geçersiz dosya adı.'));
      return;
    }

    if (!externalFile && !onGenerateFile && stateData.length > 0 && activeExportColumns.length === 0) {
      toast.error(t('FileExport_noColumnsSelected', 'Lütfen dışa aktarılacak en az bir sütun seçin.'));
      return;
    }

    const shouldSaveLocal = targetTab === 'local';
    const shouldSaveCloud = targetTab === 'cloud' || (targetTab === 'local' && isBulutActive && alsoSaveToCloud);

    if (shouldSaveCloud && integrations.length === 0) {
      toast.error(
        t(
          'BulutDepolama_entegrasyonYokMesaj',
          'Bulut depolama için henüz hiçbir entegrasyon yapılmamış. Lütfen önce bir bulut sağlayıcısı bağlayın.'
        )
      );
      return;
    }

    try {
      setIsExporting(true);
      const blob = await buildBlobFromData();
      setTotalBytes(blob.size);

      let uploadedCloudFile: CloudFileItem | undefined;

      // 1) Bulut Depolamaya Kaydet
      if (shouldSaveCloud && isBulutActive) {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setUploadPercent(1);

        const fileObj = new File([blob], fullFileName, {
          type: blob.type || FORMAT_LABELS[selectedFormat]?.mime || 'application/octet-stream',
        });

        const uploadRes = await adapter.uploadFile(
          {
            dosya: fileObj,
            provider: selectedProvider || integrations[0]?.providerType || 'google',
            klasorId: selectedFolderId,
            belgeTuru: effectiveDocumentType,
            belgeId: effectiveDocumentId,
            belgeGuid: effectiveDocumentGuid,
            belgeNo: effectiveDocumentNo,
          },
          (percent, loaded, total) => {
            setUploadPercent(percent);
            setUploadedBytes(loaded);
            setTotalBytes(total);
          },
          controller.signal
        );

        uploadedCloudFile = uploadRes?.dosya;
        toast.success(t('FileExport_cloudSaveSuccess', 'Dosya bulut depolamaya başarıyla kaydedildi.'));
      }

      // 2) Bilgisayara İndir (Yerel Kayıt)
      if (shouldSaveLocal) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fullFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast.success(t('FileExport_localDownloadSuccess', 'Dosya bilgisayarınıza indirildi.'));
      }

      const destination: ExportDestinationType =
        shouldSaveLocal && shouldSaveCloud ? 'both' : shouldSaveCloud ? 'cloud' : 'local';

      if (onExportSuccess) {
        onExportSuccess({
          fileName: fullFileName,
          format: selectedFormat,
          destination,
          blob,
          cloudFile: uploadedCloudFile,
        });
      }

      setIsExporting(false);
      handleClose();
    } catch (err: any) {
      setIsExporting(false);
      setUploadPercent(0);
      if (err?.isCancel) {
        toast(t('UploadToCloud_cancelled', 'Yükleme işlemi iptal edildi.'));
        return;
      }
      toast.error(err?.message || t('FileExport_exportError', 'Dosya kaydedilirken bir hata oluştu.'));
    }
  };

  const toggleColumnSelection = (key: string) => {
    setSelectedColumnKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleAllColumns = () => {
    if (selectedColumnKeys.length === effectiveColumns.length) {
      setSelectedColumnKeys([]);
    } else {
      setSelectedColumnKeys(effectiveColumns.map((c) => c.key));
    }
  };

  const alsoSaveToCloudAction = useMemo<ActionMenuItem>(() => {
    const isChecked = isBulutActive && alsoSaveToCloud;
    return {
      label: t('Buluta_Kaydet', 'Buluta Kaydet'),
      icon: <Cloud size={16} className={isChecked ? 'text-primary' : 'text-secondary'} />,
      isDefault: true,
      default: true,
      variant: isChecked ? 'primary' : 'default',
      disabled: !isBulutActive,
      onClick: () => {
        if (isBulutActive) setAlsoSaveToCloud((prev) => !prev);
      },
      custom: (
        <div>
          <BaseSwitch
            id="fileExportAlsoSaveToCloudSwitch"
            checked={isChecked}
            disabled={!isBulutActive}
            onChange={(e) => setAlsoSaveToCloud(e.target.checked)}
            label={
              <span className="flex items-center gap-8">
                <Cloud size={15} className={isChecked ? 'text-primary' : 'text-secondary'} />
                <span>{t('Buluta_Kaydet', 'Buluta Kaydet')}</span>
              </span>
            }
            className="action-menu-switch-item"
          />
        </div>
      ),
      dividerAbove: true,
    };
  }, [isBulutActive, alsoSaveToCloud, t]);

  const tabActions = useMemo<ActionMenuItem[]>(() => {
    if (targetTab === 'cloud') {
      return [
        {
          label: t('FilesOnClouds_addFolderTitle', 'Yeni Klasör Oluştur'),
          icon: <FolderPlus size={16} />,
          isDefault: true,
          default: true,
          onClick: () => setIsCreateFolderOpen(true),
        },
        {
          label: t('FilesOnClouds_refresh', 'Yenile'),
          icon: <RefreshCw size={16} />,
          onClick: fetchCloudContext,
        },
      ];
    }
    return isBulutActive ? [alsoSaveToCloudAction] : [];
  }, [targetTab, isBulutActive, alsoSaveToCloudAction, fetchCloudContext, t]);

  const cardExtraActions = useMemo<ActionMenuItem[]>(() => {
    const items: ActionMenuItem[] = [];
    if (stateData.length > 0 && activeExportColumns.length > 0) {
      items.push({
        label: t('ExcelImport_openInNewTab', 'Yeni Sekmede Aç'),
        icon: <ExternalLink size={16} />,
        onClick: handlePreviewInNewTab,
      });
    }
    if (targetTab === 'local' && isBulutActive) {
      items.push({
        ...alsoSaveToCloudAction,
        isDefault: false,
        default: false,
      });
    }
    return items;
  }, [stateData.length, activeExportColumns.length, handlePreviewInNewTab, targetTab, isBulutActive, alsoSaveToCloudAction, t]);

  if (isModalMode && !isEffectivelyOpen) {
    return null;
  }

  const pageTitleText = title || t('FileExport_title', 'Dosya Kaydet / Dışa Aktar');
  const subtitleText =
    subtitle ||
    (effectiveDocumentNo
      ? `${t('Belge No')}: ${effectiveDocumentNo}`
      : effectiveDocumentType
        ? `${t('Belge')}: ${t(effectiveDocumentType)}`
        : t('FileExport_subtitle', 'Dosyayı bilgisayarınıza indirin veya doğrudan bulut depolama klasörünüze kaydedin'));

  const saveBtnLabel =
    targetTab === 'cloud'
      ? t('FileExport_saveToCloudBtn', 'Buluta Kaydet')
      : isBulutActive && alsoSaveToCloud
        ? t('FileExport_downloadAndCloudBtn', 'İndir ve Buluta Kaydet')
        : t('FileExport_downloadLocalBtn', 'Bilgisayara İndir');

  const cardContent = (
    <BaseCardPage
      id="fileExportCardPage"
      icon={<Download size={20} />}
      title={pageTitleText}
      pageTitle={pageTitleText}
      subtitleLeft={subtitleText}
      showBackButton={true}
      onClose={handleClose}
      onBack={handleClose}
      saveButtonText={saveBtnLabel}
      onSave={handleExport}
      isSaving={isExporting}
      extraDropdownActions={cardExtraActions}
      asForm={false}
      className="excel-import-card-page"
    >
      <div className="excel-import-content flex flex-col gap-20">
        {/* 1. Dosya Adı ve Format Yapılandırma Kartı */}
        <div className="surface-card p-20 rounded-12 border border-glass flex flex-col gap-16">
          <div className="flex items-center justify-between border-b border-glass pb-12 flex-wrap gap-12">
            <div className="flex items-center gap-12">
              <div className="icon-box-md rounded-10 bg-primary-light text-primary flex items-center justify-center">
                {renderFileTypeIcon(fullFileName, 20)}
              </div>
              <div className="flex flex-col">
                <h3 className="m-0 text-15 font-bold text-primary">
                  {t('FileExport_fileConfigTitle', 'Dosya Bilgileri ve Format')}
                </h3>
                <span className="text-12 text-secondary">
                  {t('FileExport_outputFileNameLabel', 'Çıktı Dosyası')}: <strong>{fullFileName}</strong>
                  {externalFile ? ` (${formatFileBytes(externalFile.size)})` : ''}
                  {stateData.length > 0 ? ` • ${stateData.length} ${t('satır', 'satır')}` : ''}
                </span>
              </div>
            </div>

            {stateData.length > 0 && activeExportColumns.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm flex items-center gap-6"
                onClick={handlePreviewInNewTab}
              >
                <ExternalLink size={14} />
                <span>{t('ExcelImport_openInNewTab', 'Yeni Sekmede Aç')}</span>
              </button>
            )}
          </div>

          <div className="form-grid gap-16">
            <div className="form-group flex flex-col gap-6">
              <label className="form-field-label font-semibold text-13 text-primary">
                {t('FilesOnClouds_colName', 'Dosya Adı')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={baseFileName}
                onChange={(e) => setBaseFileName(e.target.value)}
                placeholder={t('FileExport_fileNamePlaceholder', 'Örn: fiyat_listesi_2026')}
                autoFocus
              />
            </div>

            {!externalFile && availableFormats.length > 0 && (
              <div className="form-group flex flex-col gap-6">
                <label className="form-field-label font-semibold text-13 text-primary">
                  {t('FileExport_formatLabel', 'Dosya Formatı')}
                </label>
                <BaseDropdownSecici
                  id="fileExportFormatSelect"
                  options={availableFormats.map(
                    (fmt): DropdownOption => ({
                      id: fmt,
                      value: fmt,
                      label: t(`FileExport_fmt_${fmt}`, FORMAT_LABELS[fmt]?.label || fmt.toUpperCase()),
                    })
                  )}
                  value={selectedFormat}
                  clearable={false}
                  onChange={(val) => {
                    if (val) {
                      setSelectedFormat(val as ExportFormatType);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 2. Kayıt Hedefi Seçimi (Yerel Cihaz / Bulut Depolama) */}
        <div className="surface-card p-20 rounded-12 border border-glass flex flex-col gap-16">
          {isBulutActive ? (
            <TabLayout
              tabs={[
                {
                  id: 'local',
                  label: t('FileExport_tabLocal', 'Bilgisayarıma İndir'),
                  icon: <HardDrive size={16} />,
                },
                {
                  id: 'cloud',
                  label: t('FileExport_tabCloud', 'Bulut Depolamaya Kaydet'),
                  icon: <Cloud size={16} />,
                },
              ]}
              activeTabId={targetTab}
              onChange={(tabId) => setTargetTab(tabId as 'local' | 'cloud')}
              actions={tabActions}
              actionMenuProps={{ showDefaultActionAsButton: true }}
            />
          ) : (
            <div className="flex items-center gap-10 pb-12 border-b border-glass">
              <HardDrive size={18} className="text-primary" />
              <span className="font-bold text-14 text-primary">
                {t('FileExport_tabLocal', 'Bilgisayarıma İndir')}
              </span>
            </div>
          )}

          {targetTab === 'local' ? (
            <div className="flex items-center justify-between p-16 rounded-12 bg-surface-variant border border-glass flex-wrap gap-12">
              <div className="flex items-center gap-12">
                <div className="w-40 h-40 rounded-10 bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
                  <Download size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-14 text-primary">
                    {t('FileExport_localReadyTitle', 'Yerel İndirmeye Hazır')}
                  </span>
                  <span className="text-12 text-secondary">
                    {t(
                      'FileExport_localReadyDesc',
                      '"{{fileName}}" dosyası tarayıcınız üzerinden doğrudan cihazınıza indirilecektir.',
                      { fileName: fullFileName }
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-16">
              {/* Sağlayıcı Seçimi */}
              {integrations.length > 1 && (
                <div className="flex items-center gap-12 flex-wrap">
                  <span className="text-13 font-semibold text-secondary">
                    {t('FilesOnClouds_colProvider', 'Sağlayıcı')}:
                  </span>
                  {integrations.map((intItem) => (
                    <button
                      key={intItem.id}
                      type="button"
                      className={`btn btn-sm flex items-center gap-8 ${selectedProvider === intItem.providerType ? 'btn-primary' : 'btn-outline-secondary'
                        }`}
                      onClick={() => setSelectedProvider(intItem.providerType)}
                    >
                      <ProviderLogo provider={intItem.providerType} size={16} />
                      <span>{intItem.name || intItem.providerType}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Klasör Ağacı */}
              <div className="border border-glass rounded-12 p-16 bg-surface flex flex-col gap-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <FolderTree size={16} className="text-primary" />
                    <span className="text-13 font-bold text-primary">
                      {t('FileExport_selectTargetFolder', 'Hedef Bulut Klasörü Seçin')}
                    </span>
                    {selectedFolder && (
                      <span className="text-12 text-secondary">
                        ({t('FileExport_selectedFolder', 'Seçili')}: <strong>{selectedFolder.klasorAdi}</strong>)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm flex items-center gap-6 text-12"
                    onClick={() => setIsCreateFolderOpen(true)}
                  >
                    <FolderPlus size={14} />
                    <span>{t('FilesOnClouds_addFolderTitle', 'Yeni Klasör')}</span>
                  </button>
                </div>

                {loadingCloud ? (
                  <div className="p-24 flex items-center justify-center text-secondary text-13">
                    <RefreshCw size={18} className="animate-spin mr-8" />
                    <span>{t('Yukleniyor', 'Yükleniyor...')}</span>
                  </div>
                ) : (
                  <div className="max-h-260 overflow-y-auto">
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
              </div>
            </div>
          )}

          {/* Bulut Yükleme İlerleme Çubuğu */}
          {isExporting && uploadPercent > 0 && (
            <FileUploadProgressBar
              progress={uploadPercent}
              loadedBytes={uploadedBytes}
              totalBytes={totalBytes}
            />
          )}
        </div>

        {/* 3. Tablo Verisi Varsa: Sütun Seçimi ve Önizleme */}
        {effectiveColumns.length > 0 && stateData.length > 0 && (
          <div className="surface-card p-20 rounded-12 border border-glass flex flex-col gap-16">
            <div className="flex items-center justify-between border-b border-glass pb-12 flex-wrap gap-12">
              <div className="flex items-center gap-10">
                <Layers size={18} className="text-primary" />
                <div className="flex flex-col">
                  <h4 className="m-0 text-14 font-bold text-primary">
                    {t('FileExport_columnsToExportTitle', 'Dışa Aktarılacak Sütunlar')} ({activeExportColumns.length} /{' '}
                    {effectiveColumns.length})
                  </h4>
                  <span className="text-12 text-secondary">
                    {t('FileExport_columnsToExportDesc', 'Dosyada yer almasını istediğiniz sütunları işaretleyin.')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm text-12 font-semibold"
                onClick={toggleAllColumns}
              >
                {selectedColumnKeys.length === effectiveColumns.length
                  ? t('Tumunu_Kaldir', 'Tümünü Kaldır')
                  : t('Tumunu_Sec', 'Tümünü Seç')}
              </button>
            </div>

            <div className="flex flex-wrap gap-8">
              {effectiveColumns.map((col) => {
                const isSelected = selectedColumnKeys.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumnSelection(col.key)}
                    className={`btn btn-sm flex items-center gap-6 ${isSelected ? 'btn-primary' : 'btn-outline-secondary'
                      }`}
                  >
                    {isSelected ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span>{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
          placeholder={t('FilesOnClouds_folderPlaceholder', 'Örn: Faturalar, Raporlar')}
        />
      </div>
    </BaseCardPage>
  );

  if (isModalMode) {
    const contentArea =
      typeof document !== 'undefined' ? (document.querySelector('.content-area') as HTMLElement) : null;
    if (contentArea && getComputedStyle(contentArea).position === 'static') {
      contentArea.classList.add('relative');
    }

    const modalElement = <div className="excel-import-modal-wrapper">{cardContent}</div>;

    if (contentArea) {
      return createPortal(modalElement, contentArea);
    }
    return modalElement;
  }

  return cardContent;
};

export default FileExportPage;
export {
  FileExportPage as ExcelExportPage,
  FileExportPage as ExcelExportModal,
  FileExportPage as FileExportModal,
};
