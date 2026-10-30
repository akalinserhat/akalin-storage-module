/**
 * @akalin/file_manager_module - Yerel & Bulut Dosya İçe Aktarma Sayfası / Bileşeni (FileImportPage.tsx)
 * BaseCardPage standart şablonundan türetilmiştir.
 * Özellikler:
 * 1) Dosya Tipi Filtreleme (Excel, PDF, Görsel, Word, CSV, JSON, XML, Arşiv veya özel uzantı listesi).
 * 2) Tekli (single) veya Çoklu (multiple) dosya seçimi (Yerel Sürükle-Bırak + Bulut Dosyaları).
 * 3) Excel Sütun Eşleştirme Modu (columns prop'u verildiğinde Sheet/Kolon eşleştirme ve AI otomatik eşleştirme).
 * 4) Yerel dosyaları içe aktarırken Bulut Depolamaya kaydetme (BaseSwitch) opsiyonu.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet,
  Upload,
  Cloud,
  Sparkles,
  AlertCircle,
  FolderUp,
  RefreshCw,
  CheckCircle2,
  Layers,
  ExternalLink,
  FolderTree,
  FolderClosed,
  Trash2,
  Filter,
  Files,
  FileCheck,
  Plus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  BaseCardPage,
  BaseDropdownSecici,
  BaseSwitch,
  TabLayout,
  DateInput,
  type ActionMenuItem,
  type DropdownOption,
  useModulGate,
} from '@akalin/ui';
import FilesOnClouds, {
  type FilesOnCloudsHandle,
  formatFileBytes,
  getFileExtension,
  renderFileTypeIcon,
} from '../components/FilesOnClouds';
import { useStorageModule } from '../adapters/StorageServiceContext';
import {
  CloudFileItem,
  ExcelColumnDef,
  ExcelSheet,
  FileFilterCategory,
  FileSelectionMode,
  ImportedFileItem,
} from '../types';
import {
  FileImportPagesettingsForExternal,
  type FileImportExternalSettingsValue,
} from './FileImportPagesettingsForExternal';

export type { ExcelColumnDef, ExcelSheet, FileFilterCategory, FileSelectionMode, ImportedFileItem };

export interface FileFilterPresetItem {
  extensions: string[];
  accept: string;
  labelKey: string;
  defaultLabel: string;
  groupKey?: string;
  defaultGroupLabel?: string;
  isAllOption?: boolean;
}

export const FILE_FILTER_PRESETS: Record<FileFilterCategory, FileFilterPresetItem> = {
  all: {
    extensions: [],
    accept: '*/*',
    labelKey: 'FileImport_filterAll',
    defaultLabel: 'Tüm Dosyalar',
    isAllOption: true,
  },
  pdf: {
    extensions: ['pdf'],
    accept: '.pdf',
    labelKey: 'FileImport_filterPdf',
    defaultLabel: 'PDF Belgeleri (.pdf)',
    groupKey: 'FileImport_groupTextDocs',
    defaultGroupLabel: 'Text Dokümanlar',
  },
  word: {
    extensions: ['doc', 'docx', 'rtf', 'odt'],
    accept: '.doc,.docx,.rtf,.odt',
    labelKey: 'FileImport_filterWord',
    defaultLabel: 'Word Dokümanları (.docx, .doc, .rtf, .odt)',
    groupKey: 'FileImport_groupTextDocs',
    defaultGroupLabel: 'Text Dokümanlar',
  },
  txt: {
    extensions: ['txt', 'md'],
    accept: '.txt,.md',
    labelKey: 'FileImport_filterTxt',
    defaultLabel: 'Metin Dokümanları (.txt, .md)',
    groupKey: 'FileImport_groupTextDocs',
    defaultGroupLabel: 'Text Dokümanlar',
  },
  png: {
    extensions: ['png'],
    accept: '.png',
    labelKey: 'FileImport_filterPng',
    defaultLabel: 'PNG Görselleri (.png)',
    groupKey: 'FileImport_groupImages',
    defaultGroupLabel: 'Resimler',
  },
  jpg: {
    extensions: ['jpg', 'jpeg'],
    accept: '.jpg,.jpeg',
    labelKey: 'FileImport_filterJpg',
    defaultLabel: 'JPEG / JPG Görselleri (.jpg, .jpeg)',
    groupKey: 'FileImport_groupImages',
    defaultGroupLabel: 'Resimler',
  },
  webp_svg: {
    extensions: ['webp', 'svg', 'gif', 'bmp'],
    accept: '.webp,.svg,.gif,.bmp',
    labelKey: 'FileImport_filterWebpSvg',
    defaultLabel: 'WebP, SVG & GIF Görselleri (.webp, .svg, .gif, .bmp)',
    groupKey: 'FileImport_groupImages',
    defaultGroupLabel: 'Resimler',
  },
  image: {
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'],
    accept: '.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp',
    labelKey: 'FileImport_filterImage',
    defaultLabel: 'Tüm Resimler (.png, .jpg, .webp, .svg, .gif)',
    groupKey: 'FileImport_groupImages',
    defaultGroupLabel: 'Resimler',
  },
  excel: {
    extensions: ['xlsx', 'xls', 'ods'],
    accept: '.xlsx,.xls,.ods',
    labelKey: 'FileImport_filterExcel',
    defaultLabel: 'Excel & Tablo (.xlsx, .xls, .ods)',
    groupKey: 'FileImport_groupSpreadsheets',
    defaultGroupLabel: 'Tablo & Veri Dokümanları',
  },
  csv: {
    extensions: ['csv'],
    accept: '.csv',
    labelKey: 'FileImport_filterCsv',
    defaultLabel: 'CSV (.csv)',
    groupKey: 'FileImport_groupSpreadsheets',
    defaultGroupLabel: 'Tablo & Veri Dokümanları',
  },
  json: {
    extensions: ['json'],
    accept: '.json',
    labelKey: 'FileImport_filterJson',
    defaultLabel: 'JSON (.json)',
    groupKey: 'FileImport_groupSpreadsheets',
    defaultGroupLabel: 'Tablo & Veri Dokümanları',
  },
  xml: {
    extensions: ['xml'],
    accept: '.xml',
    labelKey: 'FileImport_filterXml',
    defaultLabel: 'XML (.xml)',
    groupKey: 'FileImport_groupSpreadsheets',
    defaultGroupLabel: 'Tablo & Veri Dokümanları',
  },
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    accept: '.zip,.rar,.7z,.tar,.gz',
    labelKey: 'FileImport_filterArchive',
    defaultLabel: 'Arşiv (.zip, .rar, .7z)',
    groupKey: 'FileImport_groupArchives',
    defaultGroupLabel: 'Arşiv Dosyaları',
  },
};

export function resolveFileFilterExtensions(
  selection: FileFilterCategory | string | string[] | undefined
): string[] {
  if (!selection) return [];
  const rawArray = Array.isArray(selection) ? selection : [selection];
  if (rawArray.length === 0 || rawArray.includes('all')) return [];

  const extSet = new Set<string>();
  rawArray.forEach((item) => {
    const key = String(item || '').trim().toLowerCase();
    if (!key || key === 'all') return;
    const preset = (FILE_FILTER_PRESETS as Record<string, FileFilterPresetItem>)[key];
    if (preset && preset.extensions.length > 0) {
      preset.extensions.forEach((ext) => extSet.add(ext.replace(/^\./, '').toLowerCase()));
    } else {
      extSet.add(key.replace(/^\./, '').toLowerCase());
    }
  });

  return Array.from(extSet);
}

export function buildGroupedFileFilterOptions(
  t: (key: string, fallback: string) => string
): DropdownOption[] {
  const orderedKeys: FileFilterCategory[] = [
    'all',
    'pdf',
    'word',
    'txt',
    'png',
    'jpg',
    'webp_svg',
    'excel',
    'csv',
    'json',
    'xml',
    'archive',
  ];

  return orderedKeys.map((catKey) => {
    const preset = FILE_FILTER_PRESETS[catKey];
    const labelText = t(preset.labelKey, preset.defaultLabel);
    const groupText =
      preset.groupKey && preset.defaultGroupLabel
        ? t(preset.groupKey, preset.defaultGroupLabel)
        : undefined;

    return {
      id: catKey,
      value: catKey,
      label: labelText,
      group: groupText,
      isAllOption: Boolean(preset.isAllOption),
      searchText: `${groupText ? `${groupText} ` : ''}${labelText} ${preset.extensions.join(' ')}`,
    };
  });
}

export interface FileImportPageProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  /**
   * Dosya tipi filtresi: hazır kategori ('excel' | 'pdf' | 'image' | 'word' | 'csv' | 'json' | 'xml' | 'archive' | 'all')
   * veya özel uzantı dizisi (örn: ['xlsx', 'pdf'])
   */
  fileTypeFilter?: FileFilterCategory | string[];
  /**
   * Doğrudan izin verilen uzantı listesi (örn: ['xlsx', 'xls'])
   */
  allowedExtensions?: string[];
  /**
   * Kullanıcının arayüz üzerinden dosya tipi filtresini değiştirebilmesine izin verir
   */
  allowFilterChange?: boolean;
  /**
   * Seçim modu: 'single' (tek dosya) veya 'multiple' (çoklu dosya)
   */
  selectionMode?: FileSelectionMode;
  /**
   * selectionMode='multiple' için boolean kısayolu
   */
  multiple?: boolean;
  /**
   * Çoklu seçimde izin verilen maksimum dosya adedi
   */
  maxFiles?: number;
  /**
   * Maksimum dosya boyutu sınırı (MB)
   */
  maxFileSizeMb?: number;
  /**
   * Seçilen dosyaları (tekli veya çoklu) döndüren callback
   */
  onFilesImported?: (files: ImportedFileItem[]) => void;
  /**
   * Tekli dosya seçildiğinde veya aktarıldığında tetiklenen callback
   */
  onFileImported?: (file: ImportedFileItem) => void;
  /**
   * Excel sütun eşleştirme modunda veya genel aktarımda tetiklenen callback
   */
  onImport?: (data: any[]) => void;
  /**
   * Verildiğinde Excel Sayfa ve Sütun Eşleştirme (Column Mapping) modunu aktif eder
   */
  columns?: ExcelColumnDef[];
  documentId?: number;
  documentGuid?: string;
  documentType?: string;
  documentNo?: string;
  isModal?: boolean;
  asPage?: boolean;
  defaultSendToCloud?: boolean;
  /** Sayfanın düğüm/harici bileşen tarafından çağrılabilecek [sayfaİsmi]settingsForExternal.tsx ayar sayfası var mı? */
  hasExternalSettings?: boolean;
  /** Harici ayar bileşeni referansı */
  externalSettingsComponent?: React.ComponentType<any>;
}

// Geriye dönük uyumluluk için alias tipler
export type ExcelImportPageProps = FileImportPageProps;
export type ExcelImportModalProps = FileImportPageProps;

function escapeHtml(str: any): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const openExcelInNewTab = (
  fileName: string,
  sheets: ExcelSheet[],
  defaultSheetName?: string,
  tFunc?: (key: string, fallback: string) => string
): Window | null => {
  if (!sheets || sheets.length === 0) return null;

  const translate = tFunc || ((_k: string, fallback: string) => fallback);
  const activeSheetName = defaultSheetName || sheets[0]?.name || '';

  const sheetsHtml = sheets
    .map((sheet, sIdx) => {
      const isCurrent = sheet.name === activeSheetName || (!defaultSheetName && sIdx === 0);
      const colIndices =
        sheet.validColumns && sheet.validColumns.length > 0
          ? sheet.validColumns
          : sheet.data.length > 0
            ? Array.from({ length: sheet.maxCols || (sheet.data[0] as any[])?.length || 1 }, (_, i) => i)
            : [];

      const headerColsHtml = colIndices
        .map((cIdx) => {
          const colLetter = XLSX.utils.encode_col(cIdx);
          return `<th class="col-letter">${colLetter}</th>`;
        })
        .join('');

      const tableRowsHtml = sheet.data
        .map((row, rIdx) => {
          const rowArray = (row || []) as any[];
          const cellsHtml = colIndices
            .map((cIdx) => {
              const val = rowArray[cIdx];
              const displayVal = val != null ? String(val) : '';
              return `<td>${escapeHtml(displayVal)}</td>`;
            })
            .join('');

          return `<tr><th class="row-num">${rIdx + 1}</th>${cellsHtml}</tr>`;
        })
        .join('');

      return `
            <div id="sheet_container_${sIdx}" class="sheet-container ${isCurrent ? 'active' : ''}" style="display: ${isCurrent ? 'flex' : 'none'};">
                <div class="sheet-stats">
                    <span>${translate('Sayfa', 'Sayfa')}: <strong>${escapeHtml(sheet.name)}</strong></span>
                    <span>${translate('Satır', 'Satır')}: <strong>${sheet.data.length}</strong></span>
                    <span>${translate('Sütun', 'Sütun')}: <strong>${colIndices.length}</strong></span>
                </div>
                <div class="table-scroll-wrapper">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th class="row-num-header">#</th>
                                ${headerColsHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    })
    .join('');

  const tabsHtml =
    sheets.length > 1
      ? `
        <div class="tabs-bar">
            ${sheets
        .map((sheet, sIdx) => {
          const isCurrent = sheet.name === activeSheetName || (!defaultSheetName && sIdx === 0);
          return `
                    <button 
                        id="tab_btn_${sIdx}" 
                        class="tab-btn ${isCurrent ? 'active' : ''}" 
                        onclick="switchSheet(${sIdx})"
                    >
                        📄 ${escapeHtml(sheet.name)} (${sheet.data.length})
                    </button>
                `;
        })
        .join('')}
        </div>
    `
      : '';

  const htmlDoc = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 ${escapeHtml(fileName)} - ${translate('ExcelImport_previewTitle', 'Excel Önizleme')}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .top-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: #1e293b;
            border-bottom: 1px solid #334155;
            flex-shrink: 0;
        }
        .file-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 15px;
            font-weight: 600;
            color: #f8fafc;
        }
        .badge {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 500;
        }
        .tabs-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 20px;
            background: #1e293b;
            border-bottom: 1px solid #334155;
            overflow-x: auto;
            flex-shrink: 0;
        }
        .tab-btn {
            background: #0f172a;
            color: #94a3b8;
            border: 1px solid #334155;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }
        .tab-btn:hover { color: #f8fafc; border-color: #475569; }
        .tab-btn.active {
            background: #2563eb;
            color: #ffffff;
            border-color: #3b82f6;
        }
        .sheet-container {
            flex: 1;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
        }
        .sheet-stats {
            display: flex;
            gap: 20px;
            padding: 8px 20px;
            background: #0f172a;
            border-bottom: 1px solid #1e293b;
            font-size: 12px;
            color: #94a3b8;
            flex-shrink: 0;
        }
        .sheet-stats strong { color: #e2e8f0; }
        .table-scroll-wrapper {
            flex: 1;
            overflow: auto;
            padding: 0;
        }
        table.excel-table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
            font-size: 13px;
        }
        .excel-table th, .excel-table td {
            border: 1px solid #334155;
            padding: 6px 12px;
            text-align: left;
            white-space: nowrap;
            max-width: 420px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .excel-table thead th {
            position: sticky;
            top: 0;
            background: #1e293b;
            color: #38bdf8;
            font-weight: 700;
            text-align: center;
            z-index: 10;
            box-shadow: 0 1px 0 #334155;
        }
        .excel-table th.row-num-header {
            position: sticky;
            left: 0;
            z-index: 20;
            background: #1e293b;
            width: 48px;
        }
        .excel-table th.row-num {
            position: sticky;
            left: 0;
            background: #1e293b;
            color: #64748b;
            font-weight: 600;
            text-align: center;
            width: 48px;
            z-index: 5;
        }
        .excel-table tbody tr:nth-child(first) td {
            background: rgba(56, 189, 248, 0.08);
            font-weight: 600;
            color: #f8fafc;
        }
        .excel-table tbody tr:hover td {
            background: rgba(255, 255, 255, 0.04);
        }
    </style>
</head>
<body>
    <div class="top-header">
        <div class="file-title">
            <span>📊 ${escapeHtml(fileName)}</span>
            <span class="badge">${sheets.length} ${translate('Sayfa', 'Sayfa')}</span>
        </div>
    </div>
    ${tabsHtml}
    ${sheetsHtml}
    <script>
        function switchSheet(idx) {
            var containers = document.querySelectorAll('.sheet-container');
            var buttons = document.querySelectorAll('.tab-btn');
            for (var i = 0; i < containers.length; i++) {
                containers[i].style.display = (i === idx) ? 'flex' : 'none';
            }
            for (var j = 0; j < buttons.length; j++) {
                if (j === idx) buttons[j].classList.add('active');
                else buttons[j].classList.remove('active');
            }
        }
    </script>
</body>
</html>`;

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return window.open(url, '_blank');
};

export const FileImportPage: React.FC<FileImportPageProps> = ({
  isOpen = true,
  onClose,
  title,
  subtitle,
  fileTypeFilter,
  allowedExtensions: propAllowedExtensions,
  allowFilterChange = false,
  selectionMode: propSelectionMode,
  multiple = false,
  maxFiles,
  maxFileSizeMb,
  onFilesImported,
  onFileImported,
  onImport,
  columns,
  documentId,
  documentGuid,
  documentType,
  documentNo,
  isModal = true,
  asPage = false,
  defaultSendToCloud = true,
  hasExternalSettings = true,
  externalSettingsComponent = FileImportPagesettingsForExternal,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { adapter } = useStorageModule();
  const { isActive: modulGateActive } = useModulGate('MOD_BULUT_DEPOLAMA');
  const isBulutActive = Boolean(modulGateActive);

  // Düğüm / harici çağrıdan gelen [sayfaİsmi]settingsForExternal ayarlarını oku
  const externalNodeSettings = useMemo<FileImportExternalSettingsValue>(() => {
    const stateSettings = (location.state as any)?.externalSettings || (location.state as any)?.hariciSayfaAyarlari;
    if (stateSettings && typeof stateSettings === 'object') {
      return stateSettings;
    }
    try {
      const rawWaiting =
        sessionStorage.getItem('webakus_ai_waiting_entity') ||
        sessionStorage.getItem('ai_agent_waiting_form_data');
      if (rawWaiting) {
        const parsed = JSON.parse(rawWaiting);
        if (parsed?.hariciSayfaAyarlari && typeof parsed.hariciSayfaAyarlari === 'object') {
          return parsed.hariciSayfaAyarlari;
        }
      }
    } catch {
      // ignore
    }
    return {};
  }, [location.state]);

  // Excel sütun eşleştirme modu aktif mi?
  const isExcelMappingMode = Boolean(columns && columns.length > 0);

  // Seçim modu: Excel eşleştirme modunda her zaman 'single', aksi halde harici düğüm ayarı veya prop'a göre
  const effectiveSelectionMode: FileSelectionMode = isExcelMappingMode
    ? 'single'
    : externalNodeSettings.selectionMode || propSelectionMode || (multiple ? 'multiple' : 'single');

  const effectiveAllowFilterChange =
    externalNodeSettings.allowFilterChange !== undefined
      ? Boolean(externalNodeSettings.allowFilterChange)
      : allowFilterChange;

  // Başlangıç dosya filtresi (Çoklu seçim destekli)
  const initialFilterSelection = useMemo<string[]>(() => {
    if (
      Array.isArray(externalNodeSettings.fileTypeFilters) &&
      externalNodeSettings.fileTypeFilters.length > 0
    ) {
      return externalNodeSettings.fileTypeFilters.map(String);
    }
    if (externalNodeSettings.fileTypeFilter) {
      return Array.isArray(externalNodeSettings.fileTypeFilter)
        ? externalNodeSettings.fileTypeFilter.map(String)
        : [String(externalNodeSettings.fileTypeFilter)];
    }
    if (Array.isArray(fileTypeFilter) && fileTypeFilter.length > 0) {
      return fileTypeFilter.map(String);
    }
    if (typeof fileTypeFilter === 'string' && fileTypeFilter) {
      return [fileTypeFilter];
    }
    if (isExcelMappingMode) return ['excel'];
    return ['all'];
  }, [
    externalNodeSettings.fileTypeFilters,
    externalNodeSettings.fileTypeFilter,
    fileTypeFilter,
    isExcelMappingMode,
  ]);

  const [activeFilterSelection, setActiveFilterSelection] = useState<string[]>(initialFilterSelection);

  useEffect(() => {
    setActiveFilterSelection(initialFilterSelection);
  }, [initialFilterSelection]);

  const groupedFilterOptions = useMemo<DropdownOption[]>(
    () => buildGroupedFileFilterOptions(t),
    [t]
  );

  // Geçerli izin verilen dosya uzantıları
  const effectiveAllowedExtensions = useMemo<string[]>(() => {
    if (propAllowedExtensions && propAllowedExtensions.length > 0) {
      return propAllowedExtensions.map((e) => e.replace(/^\./, '').toLowerCase().trim());
    }
    if (
      Array.isArray(externalNodeSettings.allowedExtensions) &&
      externalNodeSettings.allowedExtensions.length > 0 &&
      JSON.stringify(activeFilterSelection) === JSON.stringify(initialFilterSelection)
    ) {
      return externalNodeSettings.allowedExtensions.map((e) =>
        e.replace(/^\./, '').toLowerCase().trim()
      );
    }
    return resolveFileFilterExtensions(activeFilterSelection);
  }, [
    propAllowedExtensions,
    externalNodeSettings.allowedExtensions,
    activeFilterSelection,
    initialFilterSelection,
  ]);

  const acceptAttribute = useMemo<string>(() => {
    if (effectiveAllowedExtensions.length === 0) return '*/*';
    return effectiveAllowedExtensions.map((ext) => `.${ext}`).join(',');
  }, [effectiveAllowedExtensions]);

  const isImportRoute =
    location.pathname.endsWith('/excel-import') ||
    location.pathname.endsWith('/file-import') ||
    location.pathname.endsWith('/dosya-al');
  const isEffectivelyOpen = Boolean(isOpen) || isImportRoute;
  const isModalMode = Boolean(isModal) && !asPage;

  const effectiveDocumentType = documentType || (location.state as any)?.documentType;
  const effectiveDocumentNo = documentNo || (location.state as any)?.documentNo;
  const effectiveDocumentId = documentId || (location.state as any)?.documentId;
  const effectiveDocumentGuid = documentGuid || (location.state as any)?.documentGuid;

  // Seçilen dosyalar durumu (Hem tekli hem çoklu mod için ortak dizi)
  const [selectedFiles, setSelectedFiles] = useState<ImportedFileItem[]>([]);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [fileSourceTab, setFileSourceTab] = useState<'local' | 'cloud'>('local');
  const [cloudShowFolders, setCloudShowFolders] = useState<boolean>(false);

  // İşlem durumları
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Bulut'a gönderme seçeneği
  const [sendToCloud, setSendToCloud] = useState<boolean>(
    externalNodeSettings.defaultSendToCloud !== undefined
      ? Boolean(externalNodeSettings.defaultSendToCloud)
      : defaultSendToCloud
  );

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const filesOnCloudsRef = useRef<FilesOnCloudsHandle>(null);

  const primaryFile = selectedFiles[0] || null;
  const hasLocalFiles = selectedFiles.some((f) => f.source === 'local');
  const allCloudFiles = selectedFiles.length > 0 && selectedFiles.every((f) => f.source === 'cloud');

  const handleClose = useCallback(() => {
    setSelectedFiles([]);
    setSheets([]);
    setActiveTab('');
    setIsDragging(false);
    setIsImporting(false);
    if (isImportRoute) {
      const returnRoute = (location.state as any)?.returnRoute;
      const parentPath = location.pathname.replace(/\/(excel-import|file-import|dosya-al)$/, '');
      const targetBack =
        returnRoute ||
        (parentPath && parentPath !== '/araclar' ? parentPath : '/');
      navigate(targetBack, {
        state: {
          ...(location.state as any),
        },
      });
    }
    if (onClose) {
      onClose();
    }
  }, [isImportRoute, location.pathname, location.state, navigate, onClose]);

  // Escape tuşu ile kapatma
  useEffect(() => {
    if (!isEffectivelyOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEffectivelyOpen, handleClose]);

  const validateFileExtensionAndSize = useCallback(
    (fileName: string, size?: number): boolean => {
      const ext = getFileExtension(fileName);
      if (effectiveAllowedExtensions.length > 0 && !effectiveAllowedExtensions.includes(ext)) {
        const allowedStr = effectiveAllowedExtensions.map((e) => `.${e}`).join(', ');
        toast.error(
          t('FileImport_invalidFileExt', 'Desteklenmeyen dosya formatı. İzin verilen formatlar: {{formats}}', {
            formats: allowedStr,
          })
        );
        return false;
      }
      if (maxFileSizeMb && size && size > maxFileSizeMb * 1024 * 1024) {
        toast.error(
          t('FileImport_fileTooLarge', '"{{name}}" dosyası maksimum boyut sınırını ({{max}} MB) aşıyor.', {
            name: fileName,
            max: maxFileSizeMb,
          })
        );
        return false;
      }
      return true;
    },
    [effectiveAllowedExtensions, maxFileSizeMb, t]
  );

  // Excel Workbook ayrıştırma
  const parseExcelFromBuffer = useCallback(
    (wb: XLSX.WorkBook, fileName: string, autoOpenTab = true): ExcelSheet[] => {
      const parsedSheets: ExcelSheet[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (ws['!ref']) {
          const range = XLSX.utils.decode_range(ws['!ref']);
          range.s.c = 0;
          range.s.r = 0;
          ws['!ref'] = XLSX.utils.encode_range(range);
        }
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        if (data.length > 0) {
          const maxCols = Math.max(...data.map((row) => (row as any[])?.length || 0), 0);

          const nonEmptyCols = new Set<number>();
          for (let i = 0; i < Math.min(data.length, 100); i++) {
            const row = data[i] as any[];
            if (row) {
              for (let c = 0; c < row.length; c++) {
                if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
                  nonEmptyCols.add(c);
                }
              }
            }
          }
          const validColumns = Array.from(nonEmptyCols).sort((a, b) => a - b);

          const initialMapping: Record<string, any> = {};
          columns?.forEach((col) => {
            initialMapping[col.key] = col.defaultValue !== undefined ? col.defaultValue : '';
          });

          parsedSheets.push({
            name: sheetName,
            isActive: parsedSheets.length === 0,
            data,
            maxCols,
            validColumns,
            mapping: initialMapping,
          });
        }
      }

      if (parsedSheets.length > 0 && autoOpenTab && isExcelMappingMode) {
        try {
          const win = openExcelInNewTab(fileName, parsedSheets, parsedSheets[0].name, t);
          if (win && !win.closed && typeof win.closed !== 'undefined') {
            toast.success(t('ExcelImport_openedInNewTab', 'Excel dosyası yeni sekmede açıldı.'));
          }
        } catch (err) {
          console.warn('Auto open in new tab failed:', err);
        }
      }

      return parsedSheets;
    },
    [columns, isExcelMappingMode, t]
  );

  // Yerel dosya(ları) okuma ve listeye ekleme
  const handleLocalFilesSelect = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      const filesToProcess = effectiveSelectionMode === 'single' ? [incoming[0]] : incoming;

      if (
        effectiveSelectionMode === 'multiple' &&
        maxFiles &&
        selectedFiles.length + filesToProcess.length > maxFiles
      ) {
        toast.error(
          t('FileImport_maxFilesExceeded', 'En fazla {{max}} adet dosya seçebilirsiniz.', { max: maxFiles })
        );
        return;
      }

      const validItems: ImportedFileItem[] = [];

      for (const rawFile of filesToProcess) {
        if (!validateFileExtensionAndSize(rawFile.name, rawFile.size)) {
          continue;
        }

        const ext = getFileExtension(rawFile.name);
        const arrayBuffer = await rawFile.arrayBuffer();

        if (isExcelMappingMode) {
          try {
            const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
            const parsedSheets = parseExcelFromBuffer(wb, rawFile.name, true);
            if (parsedSheets.length === 0) {
              toast.error(t('ExcelImport_emptyWorkbook', 'Excel dosyasındaki tüm sayfalar boş görünüyor.'));
              return;
            }
            setSheets(parsedSheets);
            setActiveTab(parsedSheets[0].name);
          } catch (error) {
            console.error('Local Excel read error:', error);
            toast.error(t('ExcelImport_fileReadError', 'Excel dosyası okunurken bir hata oluştu.'));
            return;
          }
        }

        validItems.push({
          id: `local_${rawFile.name}_${rawFile.size}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: rawFile.name,
          size: rawFile.size,
          extension: ext,
          mimeType: rawFile.type,
          source: 'local',
          localFile: rawFile,
          arrayBuffer,
        });
      }

      if (validItems.length === 0) return;

      setSelectedFiles((prev) => {
        if (effectiveSelectionMode === 'single') {
          return [validItems[0]];
        }
        // Aynı isimli yerel dosya varsa güncelle, yoksa ekle
        const existingNames = new Set(prev.map((p) => `${p.source}_${p.name}_${p.size}`));
        const uniqueNew = validItems.filter((v) => !existingNames.has(`${v.source}_${v.name}_${v.size}`));
        return [...prev, ...uniqueNew];
      });
    },
    [
      effectiveSelectionMode,
      maxFiles,
      selectedFiles.length,
      validateFileExtensionAndSize,
      isExcelMappingMode,
      parseExcelFromBuffer,
      t,
    ]
  );

  // Buluttan tekli veya çoklu dosya seçimi
  const handleCloudFileSelect = useCallback(
    async (cloudFile: any) => {
      if (!cloudFile) return;

      if (cloudFile.localFile) {
        await handleLocalFilesSelect([cloudFile.localFile]);
        return;
      }

      const fileName = cloudFile.dosyaAdi || cloudFile.ad || cloudFile.name || '';
      const fileSize = cloudFile.boyut || cloudFile.size || 0;
      const fileId = cloudFile.id || cloudFile.Id;

      if (!validateFileExtensionAndSize(fileName, fileSize)) {
        return;
      }

      if (!fileId) {
        toast.error(t('ExcelImport_invalidCloudFileId', 'Seçilen bulut dosyasının kimliği bulunamadı.'));
        return;
      }

      // Çoklu seçim modunda bulut dosyası zaten seçiliyse listeden çıkar (toggle)
      if (effectiveSelectionMode === 'multiple') {
        const alreadySelected = selectedFiles.some((f) => f.source === 'cloud' && f.cloudFile?.id === fileId);
        if (alreadySelected) {
          setSelectedFiles((prev) => prev.filter((f) => !(f.source === 'cloud' && f.cloudFile?.id === fileId)));
          return;
        }
        if (maxFiles && selectedFiles.length >= maxFiles) {
          toast.error(
            t('FileImport_maxFilesExceeded', 'En fazla {{max}} adet dosya seçebilirsiniz.', { max: maxFiles })
          );
          return;
        }
      }

      const toastId = toast.loading(t('ExcelImport_downloading', 'Bulut dosyası indiriliyor...'));
      try {
        let buffer: ArrayBuffer;
        if (adapter.downloadFile) {
          buffer = await adapter.downloadFile(fileId);
        } else {
          const response = await axios.get(`/api/Storage/Download/${fileId}`, {
            responseType: 'arraybuffer',
          });
          buffer = response.data;
        }

        const ext = getFileExtension(fileName);

        if (isExcelMappingMode) {
          const data = new Uint8Array(buffer);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const parsedSheets = parseExcelFromBuffer(wb, fileName, true);
          if (parsedSheets.length === 0) {
            toast.dismiss(toastId);
            toast.error(t('ExcelImport_emptyWorkbook', 'Excel dosyasındaki tüm sayfalar boş görünüyor.'));
            return;
          }
          setSheets(parsedSheets);
          setActiveTab(parsedSheets[0].name);
        }

        const newItem: ImportedFileItem = {
          id: `cloud_${fileId}`,
          name: fileName,
          size: fileSize || buffer.byteLength,
          extension: ext,
          mimeType: cloudFile.contentType,
          source: 'cloud',
          cloudFile,
          arrayBuffer: buffer,
        };

        setSelectedFiles((prev) => (effectiveSelectionMode === 'single' ? [newItem] : [...prev, newItem]));
        toast.dismiss(toastId);
      } catch (error: any) {
        console.error('Download/Read Error:', error);
        toast.dismiss(toastId);
        const serverMsg =
          error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : null);
        toast.error(serverMsg || error.message || t('ExcelImport_fileReadError', 'Dosya okunurken bir hata oluştu.'));
      }
    },
    [
      handleLocalFilesSelect,
      validateFileExtensionAndSize,
      effectiveSelectionMode,
      selectedFiles,
      maxFiles,
      adapter,
      isExcelMappingMode,
      parseExcelFromBuffer,
      t,
    ]
  );

  const handlePreviewFileInNewTab = useCallback(
    (item?: ImportedFileItem) => {
      const target = item || primaryFile;
      if (!target) return;

      if (sheets.length > 0 && target.id === primaryFile?.id) {
        const win = openExcelInNewTab(target.name, sheets, activeTab, t);
        if (!win || win.closed || typeof win.closed === 'undefined') {
          toast.error(
            t(
              'ExcelImport_popupBlockedNotice',
              "Tarayıcınız yeni sekmeyi engelledi. Lütfen 'Yeni Sekmede Aç' butonuna tıklayın."
            )
          );
        }
        return;
      }

      if (['xlsx', 'xls', 'csv', 'ods'].includes(target.extension) && target.arrayBuffer) {
        try {
          const wb = XLSX.read(new Uint8Array(target.arrayBuffer), { type: 'array', cellDates: true });
          const tempSheets = parseExcelFromBuffer(wb, target.name, false);
          openExcelInNewTab(target.name, tempSheets, tempSheets[0]?.name, t);
          return;
        } catch { }
      }

      if (target.localFile) {
        const url = URL.createObjectURL(target.localFile);
        window.open(url, '_blank');
      } else if (target.cloudFile?.dosyaUrl) {
        window.open(target.cloudFile.dosyaUrl, '_blank');
      }
    },
    [primaryFile, sheets, activeTab, parseExcelFromBuffer, t]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLocalFilesSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeSelectedFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) {
        setSheets([]);
        setActiveTab('');
      }
      return next;
    });
  }, []);

  const clearAllSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
    setSheets([]);
    setActiveTab('');
  }, []);

  const updateSheet = (sheetName: string, updates: Partial<ExcelSheet>) => {
    setSheets((prev) => prev.map((s) => (s.name === sheetName ? { ...s, ...updates } : s)));
  };

  const updateMapping = (sheetName: string, field: string, value: string) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.name === sheetName) {
          return {
            ...s,
            isActive: true,
            mapping: { ...s.mapping, [field]: value },
          };
        }
        return s;
      })
    );
  };

  // Yapay Zeka (AI) Otomatik Sütun Eşleştirme
  const handleAiAutoMatch = async () => {
    if (!columns || columns.length === 0) return;
    const currentSheet = sheets.find((s) => s.name === activeTab);
    if (!currentSheet || currentSheet.data.length === 0) {
      toast.error(t('ExcelImport_noValidData', 'Eşleştirilecek veri veya sayfa bulunamadı.'));
      return;
    }

    setIsAiMatching(true);
    const toastId = toast.loading(
      t('ExcelImport_aiMatching', 'Yapay zeka sütun başlıklarını ve verileri analiz ediyor...')
    );

    try {
      const excelKolonlari = currentSheet.validColumns.map((i) => {
        const headerValue =
          currentSheet.data.length > 0 && currentSheet.data[0][i] !== undefined && currentSheet.data[0][i] !== null
            ? String(currentSheet.data[0][i]).trim()
            : `${t('ExcelImport_columnPrefix', 'Sütun')} ${XLSX.utils.encode_col(i)}`;
        return { index: i, baslik: headerValue };
      });

      const hedefAlanlar = columns.map((c) => ({
        key: c.key,
        label: c.label,
        expectedType: c.expectedType || (c.type === 'date' ? 'date' : 'string'),
        required: Boolean(c.required),
      }));

      const ornekSatirlar = currentSheet.data
        .slice(0, 4)
        .map((row) => currentSheet.validColumns.map((colIdx) => (row?.[colIdx] != null ? String(row[colIdx]) : '')));

      const payload = {
        belgeTuru: effectiveDocumentType || 'Belge',
        hedefAlanlar,
        excelKolonlari,
        ornekSatirlar,
      };

      const response = await axios.post('/api/AiAjanlar/excel-kolon-esle', payload);
      toast.dismiss(toastId);

      if (response.data?.basarili && response.data?.eslesmeler) {
        const eslesmeler: Record<string, number | null> = response.data.eslesmeler;
        let matchCount = 0;

        setSheets((prev) =>
          prev.map((s) => {
            if (s.name === activeTab) {
              const newMapping = { ...s.mapping };
              Object.entries(eslesmeler).forEach(([fieldKey, colIdx]) => {
                if (colIdx !== null && colIdx !== undefined) {
                  newMapping[fieldKey] = String(colIdx);
                  matchCount++;
                }
              });
              return {
                ...s,
                isActive: true,
                mapping: newMapping,
              };
            }
            return s;
          })
        );

        if (matchCount > 0) {
          toast.success(t('ExcelImport_aiMatchSuccess', 'Sütunlar yapay zeka ile otomatik eşleştirildi.'));
        } else {
          toast(t('ExcelImport_aiMatchNotFound', 'Eşleştirilecek sütun bulunamadı.'));
        }
      } else {
        toast.error(response.data?.aciklama || t('ExcelImport_aiMatchError', 'Yapay zeka eşleştirme hatası'));
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      const msg =
        error.response?.data?.mesaj || error.message || t('ExcelImport_aiMatchError', 'Yapay zeka eşleştirme hatası');
      toast.error(msg);
    } finally {
      setIsAiMatching(false);
    }
  };

  // Seçili yerel dosyaları bulut depolamaya yükleme yardımcısı
  const uploadLocalFilesToCloudIfEnabled = async (): Promise<CloudFileItem[]> => {
    const uploadedCloudFiles: CloudFileItem[] = [];
    if (!isBulutActive || !sendToCloud) return uploadedCloudFiles;
    const localItems = selectedFiles.filter((f) => f.source === 'local' && f.localFile);
    if (localItems.length === 0) return uploadedCloudFiles;

    try {
      for (const item of localItems) {
        if (!item.localFile) continue;
        const uploadRes = await adapter.uploadFile({
          dosya: item.localFile,
          provider: 'google',
          belgeTuru: effectiveDocumentType,
          belgeId: effectiveDocumentId,
          belgeGuid: effectiveDocumentGuid,
          belgeNo: effectiveDocumentNo,
        });
        if (uploadRes?.dosya) {
          item.cloudFile = uploadRes.dosya;
          uploadedCloudFiles.push(uploadRes.dosya);
        }
      }
      toast.success(t('ExcelImport_cloudUploadSuccess', 'Dosya(lar) bulut depolamaya başarıyla kaydedildi.'));
    } catch (cloudErr) {
      console.error('Cloud auto-upload error:', cloudErr);
      toast.error(
        t('ExcelImport_cloudUploadError', 'Dosya içeri aktarıldı ancak bulut depolamaya yüklenirken bir hata oluştu.')
      );
    }
    return uploadedCloudFiles;
  };

  // Yapay Zeka Görev Akışı (Flowchart FORM_AC) için aktarılan dosya özetini ve metnini hazırlayıp olay fırlatan yardımcı
  const notifyAiAssistantOnFileImport = async (items: ImportedFileItem[]) => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    const waitingRaw = sessionStorage.getItem('webakus_ai_waiting_entity');
    const fromAiChat = Boolean((location.state as any)?.fromAiChat);
    if (!waitingRaw && !fromAiChat) return;

    let waitingMeta: any = null;
    if (waitingRaw) {
      try {
        waitingMeta = JSON.parse(waitingRaw);
      } catch {
        // ignore
      }
      setTimeout(() => {
        try {
          sessionStorage.removeItem('webakus_ai_waiting_entity');
        } catch {
          // ignore
        }
      }, 1200);
    }

    const importedFiles: Array<{
      dosyaAdi: string;
      uzanti: string;
      boyut: number;
      kaynak: 'local' | 'cloud';
      bulutDosyaId?: number | string;
      metinIcerigi?: string;
    }> = [];

    for (const item of items) {
      const cloudId = item.cloudFile?.id || (item.cloudFile as any)?.Id;
      let extractedText = '';

      try {
        if (['txt', 'md', 'csv', 'json', 'xml'].includes(item.extension) && item.arrayBuffer) {
          extractedText = new TextDecoder('utf-8').decode(item.arrayBuffer).trim();
        } else if (['xlsx', 'xls', 'ods'].includes(item.extension) && item.arrayBuffer) {
          const wb = XLSX.read(new Uint8Array(item.arrayBuffer), { type: 'array', cellDates: true });
          const sheetTexts: string[] = [];
          for (const sName of wb.SheetNames) {
            const ws = wb.Sheets[sName];
            const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
            if (csv && csv.trim()) {
              sheetTexts.push(`[Sayfa: ${sName}]\n${csv.trim()}`);
            }
          }
          extractedText = sheetTexts.join('\n\n');
        } else if (item.localFile && !cloudId) {
          const formData = new FormData();
          formData.append('dosya', item.localFile);
          const res = await axios.post('/api/AiChat/dosya-metin-cikar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (res.data?.basarili && res.data?.metin) {
            extractedText = String(res.data.metin).trim();
          }
        }
      } catch (err) {
        console.warn('AI file text extraction warning:', err);
      }

      importedFiles.push({
        dosyaAdi: item.name,
        uzanti: item.extension,
        boyut: item.size,
        kaynak: item.source,
        bulutDosyaId: cloudId,
        metinIcerigi: extractedText || undefined,
      });
    }

    window.dispatchEvent(
      new CustomEvent('ai-entity-updated', {
        detail: {
          saved: true,
          entityType: waitingMeta?.entityType || 'dosya-ice-aktar-karti',
          entityLabel: waitingMeta?.entityLabel || t('FileImport_title', 'Dosya İçeri Aktar'),
          workflowId: waitingMeta?.workflowId,
          workflowTitle: waitingMeta?.workflowTitle,
          workflowPrompt: waitingMeta?.workflowPrompt,
          nodeId: waitingMeta?.nodeId,
          nodePrompt: waitingMeta?.nodePrompt,
          sonrakiDugumId: waitingMeta?.sonrakiDugumId,
          sonrakiDugum: waitingMeta?.sonrakiDugum,
          kayitSonrasiTeyitEt: waitingMeta?.kayitSonrasiTeyitEt,
          route: location.pathname,
          importedFiles,
          savedData: {
            dosyaSayisi: items.length,
            dosyalar: items.map((f) => f.name).join(', '),
          },
        },
      })
    );
  };

  // İçeri Aktarma (Kaydet / Aktar) İşlemi
  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      toast.error(t('FileImport_noFileSelected', 'Lütfen içeri aktarılacak en az bir dosya seçin.'));
      return;
    }

    // 1) Genel Dosya Seçim Modu (Excel Sütun Eşleştirme yoksa)
    if (!isExcelMappingMode) {
      setIsImporting(true);
      await uploadLocalFilesToCloudIfEnabled();
      await notifyAiAssistantOnFileImport(selectedFiles);
      setIsImporting(false);

      if (onFilesImported) {
        onFilesImported(selectedFiles);
      }
      if (onFileImported && selectedFiles[0]) {
        onFileImported(selectedFiles[0]);
      }
      if (onImport) {
        onImport(selectedFiles);
      }
      handleClose();
      return;
    }

    // 2) Excel Sütun Eşleştirme Modu
    const activeSheets = sheets.filter((s) => s.isActive);
    if (activeSheets.length === 0) {
      toast.error(
        t('ExcelImport_noActiveSheet', 'Lütfen aktarılacak en az bir sayfa (sheet) seçin veya sütun eşleştirmesi yapın.')
      );
      return;
    }

    const mappedData: any[] = [];

    for (const sheet of activeSheets) {
      const missingRequired = (columns || []).filter((col) => {
        if (col.visibleIf && sheet.mapping[col.visibleIf.key] !== col.visibleIf.value) return false;
        return col.required && (sheet.mapping[col.key] === '' || sheet.mapping[col.key] == null);
      });

      if (missingRequired.length > 0) {
        const missingLabels = missingRequired.map((c) => c.label).join(', ');
        toast.error(
          t('ExcelImport_missingRequired', 'Lütfen zorunlu alanları eşleştirin: ') +
          missingLabels +
          ` (${sheet.name})`
        );
        return;
      }

      sheet.data.forEach((row) => {
        const rowArray = row as any[];
        const rowData: any = {};
        let hasMappedColumnData = false;

        (columns || []).forEach((col) => {
          if (col.visibleIf && sheet.mapping[col.visibleIf.key] !== col.visibleIf.value) return;

          const rawValue = sheet.mapping[col.key];

          if (col.type === 'column') {
            const colIndex = rawValue !== '' ? parseInt(rawValue, 10) : -1;
            const cellValue = colIndex >= 0 ? rowArray[colIndex] : null;

            if (cellValue != null && String(cellValue).trim() !== '') {
              hasMappedColumnData = true;
            }

            if (col.expectedType === 'number') {
              let parsedNum: number | null = null;
              if (cellValue != null && String(cellValue).trim() !== '') {
                if (typeof cellValue === 'number') {
                  parsedNum = cellValue;
                } else if (!(cellValue instanceof Date)) {
                  let s = String(cellValue).trim().replace(/[^\d.,-]/g, '');
                  if (s.includes(',') && s.includes('.')) {
                    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
                      s = s.replace(/\./g, '').replace(',', '.');
                    } else {
                      s = s.replace(/,/g, '');
                    }
                  } else if (s.includes(',')) {
                    s = s.replace(',', '.');
                  }
                  const n = Number(s);
                  if (!isNaN(n) && s !== '') {
                    parsedNum = n;
                  }
                }
              }
              rowData[col.key] = parsedNum;
            } else if (col.expectedType === 'date') {
              let parsedDate: string | null = null;
              if (cellValue instanceof Date && !isNaN(cellValue.getTime())) {
                parsedDate = cellValue.toISOString();
              } else if (cellValue != null && String(cellValue).trim() !== '') {
                const d = new Date(String(cellValue));
                if (!isNaN(d.getTime())) {
                  parsedDate = d.toISOString();
                }
              }
              rowData[col.key] = parsedDate;
            } else {
              if (cellValue instanceof Date) {
                rowData[col.key] = null;
              } else {
                const strVal = cellValue != null ? String(cellValue).trim() : '';
                rowData[col.key] = strVal !== '' ? strVal : null;
              }
            }
          } else {
            rowData[col.key] = rawValue;
          }
        });

        const isRowValid = (columns || []).every((col) => {
          if (col.visibleIf && sheet.mapping[col.visibleIf.key] !== col.visibleIf.value) return true;
          if (!col.required) return true;
          const val = rowData[col.key];
          if (val === null || val === undefined || val === '') return false;
          if (col.expectedType === 'number' && (typeof val !== 'number' || isNaN(val) || val <= 0)) return false;
          return true;
        });

        if (hasMappedColumnData && isRowValid) {
          rowData._sheetName = sheet.name;
          mappedData.push(rowData);
        }
      });
    }

    if (mappedData.length === 0) {
      toast.error(
        t('ExcelImport_noValidRowsMatched', 'Seçilen sütun kriterlerine uygun geçerli veri satırı bulunamadı.')
      );
      return;
    }

    setIsImporting(true);
    await uploadLocalFilesToCloudIfEnabled();
    await notifyAiAssistantOnFileImport(selectedFiles);
    setIsImporting(false);

    if (onImport) {
      onImport(mappedData);
    }
    if (onFilesImported) {
      onFilesImported(selectedFiles);
    }
    handleClose();
  };

  const sendToCloudAction = useMemo<ActionMenuItem>(() => {
    const isEffectiveChecked = isBulutActive && sendToCloud && !allCloudFiles;
    return {
      label: t('Buluta_Kaydet', 'Buluta Kaydet'),
      icon: <Cloud size={16} className={isEffectiveChecked ? 'text-primary' : 'text-secondary'} />,
      isDefault: true,
      default: true,
      variant: isEffectiveChecked ? 'primary' : 'default',
      disabled: !isBulutActive || allCloudFiles,
      title: allCloudFiles
        ? t('ExcelImport_alreadyOnCloud', 'Zaten Bulutta')
        : !isBulutActive
          ? t('ExcelImport_moduleDisabled', 'Modül Pasif')
          : t('Buluta_Kaydet', 'Buluta Kaydet'),
      onClick: () => {
        if (!allCloudFiles && isBulutActive) {
          setSendToCloud((prev) => !prev);
        }
      },
      custom: (
        <div title={allCloudFiles ? t('ExcelImport_alreadyOnCloud', 'Zaten Bulutta') : undefined}>
          <BaseSwitch
            id="fileImportSendToCloudSwitch_actionMenu"
            checked={isEffectiveChecked}
            disabled={!isBulutActive || allCloudFiles}
            onChange={(e) => setSendToCloud(e.target.checked)}
            label={
              <span className="flex items-center gap-8">
                <Cloud size={15} className={isEffectiveChecked ? 'text-primary' : 'text-secondary'} />
                <span>{t('Buluta_Kaydet', 'Buluta Kaydet')}</span>
              </span>
            }
            className="action-menu-switch-item"
          />
        </div>
      ),
      dividerAbove: true,
    };
  }, [isBulutActive, sendToCloud, allCloudFiles, t]);

  const activeTabActions = useMemo<ActionMenuItem[]>(() => {
    if (fileSourceTab === 'cloud') {
      return [
        {
          label: cloudShowFolders
            ? t('Klasorleri_Gizle', 'Klasörleri Gizle')
            : t('Klasorleri_Goster', 'Klasörleri Göster'),
          icon: cloudShowFolders ? <FolderClosed size={16} /> : <FolderTree size={16} />,
          isDefault: true,
          default: true,
          variant: cloudShowFolders ? 'primary' : 'default',
          onClick: () => setCloudShowFolders((prev) => !prev),
          title: cloudShowFolders
            ? t('Klasorleri_Gizle', 'Klasörleri Gizle')
            : t('Klasorleri_Goster', 'Klasörleri Göster'),
        },
      ];
    }

    return [
      ...(isBulutActive ? [sendToCloudAction] : []),
      {
        label:
          effectiveSelectionMode === 'multiple'
            ? t('FileImport_chooseFilesBtn', 'Dosyaları Seç')
            : t('ExcelImport_chooseFileBtn', 'Dosya Seç'),
        icon: <Upload size={16} />,
        onClick: () => localFileInputRef.current?.click(),
      },
    ];
  }, [fileSourceTab, cloudShowFolders, isBulutActive, sendToCloudAction, effectiveSelectionMode, t]);

  const cardExtraActions = useMemo<ActionMenuItem[]>(() => {
    if (selectedFiles.length === 0) return [];
    return [
      ...(primaryFile && ['xlsx', 'xls', 'csv', 'ods'].includes(primaryFile.extension)
        ? [
          {
            label: t('ExcelImport_openInNewTab', 'Yeni Sekmede Aç'),
            icon: <ExternalLink size={16} />,
            onClick: () => handlePreviewFileInNewTab(primaryFile),
          },
        ]
        : []),
      ...(effectiveSelectionMode === 'multiple'
        ? [
          {
            label: t('FileImport_addMoreFiles', 'Yeni Dosya Ekle'),
            icon: <Plus size={16} />,
            onClick: () => localFileInputRef.current?.click(),
          },
        ]
        : []),
      {
        label:
          effectiveSelectionMode === 'multiple'
            ? t('FileImport_clearSelection', 'Seçimi Temizle')
            : t('ExcelImport_changeFile', 'Başka Dosya Seç'),
        icon: <RefreshCw size={16} />,
        onClick: clearAllSelectedFiles,
      },
      ...(isBulutActive && hasLocalFiles
        ? [
          {
            ...sendToCloudAction,
            isDefault: false,
            default: false,
          },
        ]
        : []),
    ];
  }, [
    selectedFiles.length,
    primaryFile,
    effectiveSelectionMode,
    handlePreviewFileInNewTab,
    clearAllSelectedFiles,
    isBulutActive,
    hasLocalFiles,
    sendToCloudAction,
    t,
  ]);

  const selectedCloudFileIds = useMemo(
    () =>
      selectedFiles
        .filter((f) => f.source === 'cloud' && f.cloudFile?.id)
        .map((f) => f.cloudFile!.id),
    [selectedFiles]
  );

  if (isModalMode && !isEffectivelyOpen) {
    return null;
  }

  const activeSheetData = sheets.find((s) => s.name === activeTab);

  const pageTitleText =
    title ||
    (isExcelMappingMode
      ? t('ExcelImport_title', "Excel'den Veri Al")
      : effectiveSelectionMode === 'multiple'
        ? t('FileImport_titleMultiple', 'Dosyaları İçeri Aktar')
        : t('FileImport_title', 'Dosya İçeri Aktar'));

  const subtitleText =
    subtitle ||
    (selectedFiles.length > 0
      ? isExcelMappingMode && primaryFile
        ? `${primaryFile.name} • ${sheets.reduce((acc, s) => acc + s.data.length, 0)} ${t('satır', 'satır')}`
        : `${selectedFiles.length} ${t('FileImport_filesSelectedCount', 'dosya seçildi')}`
      : effectiveDocumentNo
        ? `${t('Belge No')}: ${effectiveDocumentNo}`
        : effectiveDocumentType
          ? `${t('Belge')}: ${t(effectiveDocumentType)}`
          : isExcelMappingMode
            ? t('ExcelImport_subtitle', 'Excel dosyasından veri aktarımı ve sütun eşleştirme')
            : t('FileImport_subtitle', 'Bilgisayarınızdan veya bulut depolama hesabınızdan dosya seçin'));

  const filterBadgeLabel =
    effectiveAllowedExtensions.length > 0
      ? effectiveAllowedExtensions.map((e) => `.${e}`).join(', ')
      : t('FileImport_allFormatsAllowed', 'Tüm dosya formatları');

  // Dosya seçimi ekranını mı yoksa Excel eşleştirme ekranını mı göstereceğiz?
  const showExcelMappingView = isExcelMappingMode && selectedFiles.length > 0 && sheets.length > 0;

  const cardContent = (
    <BaseCardPage
      id="fileImportCardPage"
      icon={isExcelMappingMode ? <FileSpreadsheet size={20} /> : <FolderUp size={20} />}
      title={pageTitleText}
      pageTitle={pageTitleText}
      subtitleLeft={subtitleText}
      showBackButton={true}
      onClose={handleClose}
      onBack={handleClose}
      hideSaveButton={selectedFiles.length === 0}
      saveButtonText={t('ExcelImport_importButton', 'İçeri Aktar')}
      onSave={handleImport}
      isSaving={isImporting}
      extraDropdownActions={cardExtraActions}
      asForm={false}
      hasExternalSettings={hasExternalSettings}
      externalSettingsComponent={externalSettingsComponent}
      className="excel-import-card-page"
    >
      <div className="excel-import-content flex flex-col gap-20">
        {/* Gizli yerel dosya input'u (her zaman DOM'da hazır) */}
        <input
          type="file"
          ref={localFileInputRef}
          accept={acceptAttribute}
          multiple={effectiveSelectionMode === 'multiple'}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleLocalFilesSelect(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {!showExcelMappingView ? (
          <div className="excel-upload-section flex flex-col gap-16">
            {/* Üst Bilgi ve Dosya Tipi Filtre Çubuğu */}
            <div className="flex items-center justify-between gap-12 pb-16 border-b border-glass flex-wrap">
              <div className="flex items-center gap-12">
                <div className="icon-box-md rounded-10 bg-primary-light text-primary flex items-center justify-center">
                  <FolderUp size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="m-0 text-16 font-bold text-primary">
                    {effectiveSelectionMode === 'multiple'
                      ? t('FileImport_chooseMultipleFilesTitle', 'İçeri Aktarılacak Dosyaları Belirleyin')
                      : t('FileImport_chooseSingleFileTitle', 'İçeri Aktarılacak Dosyayı Belirleyin')}
                  </h3>
                  <span className="text-12 text-secondary mt-2">
                    {t('FileImport_allowedFormatsLabel', 'İzin verilen formatlar')}: {filterBadgeLabel} •{' '}
                    {effectiveSelectionMode === 'multiple'
                      ? t('FileImport_modeMultipleBadge', 'Çoklu Seçim Aktif')
                      : t('FileImport_modeSingleBadge', 'Tekli Seçim')}
                  </span>
                </div>
              </div>

              {/* Kullanıcıya dosya tipi filtresi seçimi açıksa */}
              {effectiveAllowFilterChange && !isExcelMappingMode && (
                <div className="flex items-center gap-8 min-w-260">
                  <Filter size={15} className="text-secondary shrink-0" />
                  <BaseDropdownSecici
                    id="fileImportToolbarFilterSelect"
                    options={groupedFilterOptions}
                    multiple={true}
                    clearable={true}
                    value={activeFilterSelection}
                    onChange={(nextVal) => {
                      const nextArr = Array.isArray(nextVal) && nextVal.length > 0 ? nextVal.map(String) : ['all'];
                      setActiveFilterSelection(nextArr);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Kaynak Sekmeleri (Yerel / Bulut) */}
            <div className="flex flex-col gap-16">
              {isBulutActive && (
                <TabLayout
                  tabs={[
                    {
                      id: 'local',
                      label: t('ExcelImport_tabLocal', 'Bilgisayarımdan Yükle'),
                      icon: <Upload size={16} />,
                    },
                    {
                      id: 'cloud',
                      label: t('ExcelImport_tabCloud', 'Bulut Dosyalarımdan Seç'),
                      icon: <Cloud size={16} />,
                    },
                  ]}
                  activeTabId={fileSourceTab}
                  onChange={(tabId) => setFileSourceTab(tabId as 'local' | 'cloud')}
                  actions={activeTabActions}
                  actionMenuProps={{ showDefaultActionAsButton: true }}
                />
              )}

              {fileSourceTab === 'local' ? (
                <div className="flex flex-col gap-16">
                  <div
                    className={`ai-file-dropzone cursor-pointer ${isDragging ? 'active' : ''}`}
                    onClick={() => localFileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="ai-file-dropzone-icon">
                      {activeFilterSelection.length === 1 && activeFilterSelection[0] === 'excel' ? (
                        <FileSpreadsheet size={32} />
                      ) : (
                        <Files size={32} />
                      )}
                    </div>
                    <span className="font-semibold text-15 text-primary mb-4">
                      {effectiveSelectionMode === 'multiple'
                        ? t('FileImport_dropzoneMultipleTitle', 'Dosyaları Seçin veya Buraya Sürükleyip Bırakın')
                        : t('FileImport_dropzoneSingleTitle', 'Dosya Seçin veya Buraya Sürükleyip Bırakın')}
                    </span>
                    <span className="text-12 text-secondary mb-16">
                      {t('FileImport_allowedFormatsLabel', 'İzin verilen formatlar')}: {filterBadgeLabel}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex items-center gap-6 pointer-events-none"
                    >
                      <FolderUp size={15} />
                      <span>
                        {effectiveSelectionMode === 'multiple'
                          ? t('FileImport_chooseFilesBtn', 'Dosyaları Seç')
                          : t('ExcelImport_chooseFileBtn', 'Dosya Seç')}
                      </span>
                    </button>
                  </div>

                  {isExcelMappingMode && (
                    <div className="flex flex-row items-center gap-8 p-12 rounded-8 bg-tertiary border border-glass text-13 text-secondary">
                      <AlertCircle size={16} className="shrink-0 text-primary" />
                      <span>
                        {t(
                          'ExcelImport_headerNotice',
                          'Excel tablonuzun ilk satırının sütun başlıklarını içerdiğinden emin olun.'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-420 h-480 flex flex-col border border-glass rounded-12 p-8 overflow-hidden bg-surface">
                  <FilesOnClouds
                    ref={filesOnCloudsRef}
                    isOpen={true}
                    isModal={false}
                    showFolderTree={cloudShowFolders}
                    isAttachedOnly={!cloudShowFolders}
                    onAttachedOnlyChange={(val) => setCloudShowFolders(!val)}
                    isSelectMode={true}
                    selectionMode={effectiveSelectionMode}
                    selectedFileIds={selectedCloudFileIds}
                    allowedExtensions={effectiveAllowedExtensions}
                    hideToolbarActions={true}
                    documentId={effectiveDocumentId}
                    documentGuid={effectiveDocumentGuid}
                    documentType={effectiveDocumentType}
                    documentNo={effectiveDocumentNo}
                    onSelectFile={handleCloudFileSelect}
                    onToggleSelectFile={handleCloudFileSelect}
                  />
                </div>
              )}
            </div>

            {/* Seçilen Dosyalar Özeti Listesi (Genel Dosya Seçim Modunda) */}
            {selectedFiles.length > 0 && (
              <div className="surface-card p-16 rounded-12 border border-glass flex flex-col gap-12">
                <div className="flex items-center justify-between border-b border-glass pb-12">
                  <div className="flex items-center gap-8">
                    <FileCheck size={18} className="text-success" />
                    <h4 className="m-0 text-14 font-bold text-primary">
                      {t('FileImport_selectedFilesHeader', 'Seçilen Dosyalar')} ({selectedFiles.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger flex items-center gap-6 text-12"
                    onClick={clearAllSelectedFiles}
                  >
                    <Trash2 size={14} />
                    <span>{t('FileImport_clearAllBtn', 'Tümünü Temizle')}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-8">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-10 rounded-10 bg-surface-variant border border-glass gap-12"
                    >
                      <div className="flex items-center gap-12 min-w-0">
                        <div className="w-36 h-36 rounded-8 bg-surface text-primary flex items-center justify-center border border-glass flex-shrink-0">
                          {renderFileTypeIcon(item.name, 18)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-13 text-primary truncate" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-11 text-secondary">
                            {formatFileBytes(item.size)} •{' '}
                            {item.source === 'cloud'
                              ? t('ExcelImport_sourceCloud', 'Bulut Dosyası')
                              : t('ExcelImport_sourceLocal', 'Yerel Dosya')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 flex-shrink-0">
                        {['xlsx', 'xls', 'csv', 'ods', 'pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(
                          item.extension
                        ) && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-12 flex items-center gap-4"
                              onClick={() => handlePreviewFileInNewTab(item)}
                              title={t('ExcelImport_openInNewTab', 'Yeni Sekmede Aç')}
                            >
                              <ExternalLink size={14} />
                              <span>{t('Onizle', 'Önizle')}</span>
                            </button>
                          )}
                        <button
                          type="button"
                          className="btn-icon-xs text-danger"
                          onClick={() => removeSelectedFile(item.id)}
                          title={t('Sil', 'Sil')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Excel Sayfa ve Sütun Eşleştirme Kartı */
          <div className="excel-mapping-card">
            <div className="flex items-center justify-between pb-16 border-b border-glass flex-wrap gap-12">
              <div className="flex items-center gap-12">
                <div className="icon-box-md rounded-10 bg-primary-light text-primary flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-8">
                    <h3 className="m-0 text-16 font-bold text-primary">
                      {t('ExcelImport_sheetsAndMappingTitle', 'Sayfa ve Sütun Eşleştirme')}
                    </h3>
                    <span className="badge badge-primary text-11 font-medium">
                      {sheets.length} {t('Sayfa', 'Sayfa')}
                    </span>
                  </div>
                  <span className="text-12 text-secondary mt-2">
                    {t(
                      'ExcelImport_sheetsAndMappingDesc',
                      'İçe aktarmak istediğiniz sayfaları seçin ve sütun eşleştirmelerini tanımlayın.'
                    )}
                  </span>
                </div>
              </div>

              {activeSheetData && (
                <div className="flex items-center gap-12">
                  <button
                    type="button"
                    className="btn btn-primary-outline btn-sm flex items-center gap-6"
                    onClick={handleAiAutoMatch}
                    disabled={isAiMatching}
                    title={t('ExcelImport_aiAutoMatch', 'Yapay Zeka ile Otomatik Eşleştir')}
                  >
                    <Sparkles size={14} className={isAiMatching ? 'animate-spin text-accent' : 'text-accent'} />
                    <span className="font-medium">
                      {isAiMatching
                        ? t('ExcelImport_aiMatching', 'Eşleştiriliyor...')
                        : t('ExcelImport_aiAutoMatch', 'Yapay Zeka ile Otomatik Eşleştir')}
                    </span>
                  </button>
                  <span className="badge badge-neutral text-12 font-medium">
                    {activeSheetData.data.length} {t('satır', 'satır')}
                  </span>
                </div>
              )}
            </div>

            {/* Sheet Tabs */}
            {sheets.length > 1 && (
              <div className="excel-sheet-tabs-wrapper">
                <TabLayout
                  tabs={sheets.map((s) => ({
                    id: s.name,
                    name: s.name,
                    label: s.name,
                    icon: s.isActive ? <CheckCircle2 size={14} className="text-success" /> : null,
                  }))}
                  activeTabId={activeTab}
                  onChange={(tabId: string | number) => setActiveTab(tabId as string)}
                />
              </div>
            )}

            {/* Active Sheet Mapping Body */}
            {activeSheetData && (
              <div className="flex flex-col gap-16">
                <div className="flex items-center justify-between p-16 rounded-12 bg-tertiary border border-glass">
                  <BaseSwitch
                    id={`sheetActiveSwitch_${activeSheetData.name}`}
                    checked={activeSheetData.isActive}
                    onChange={(e) => updateSheet(activeSheetData.name, { isActive: e.target.checked })}
                    label={
                      <div className="flex items-center gap-8">
                        <span className="font-semibold text-14 text-primary">
                          {t('ExcelImport_importThisSheet', 'Bu Sayfayı (Sheet) İçeri Aktar')}
                        </span>
                        <span className="text-13 text-secondary font-medium">({activeSheetData.name})</span>
                      </div>
                    }
                  />
                  <div className="flex items-center gap-8 text-12 text-secondary font-medium">
                    <span className="badge badge-neutral">
                      {activeSheetData.validColumns.length}{' '}
                      {t('ExcelImport_detectedColumns', 'dolu sütun tespit edildi')}
                    </span>
                  </div>
                </div>

                {activeSheetData.isActive ? (
                  <div className="form-grid gap-20">
                    {(columns || []).map((col) => {
                      if (col.visibleIf) {
                        const dependsOnValue = activeSheetData.mapping[col.visibleIf.key];
                        if (dependsOnValue !== col.visibleIf.value) return null;
                      }

                      const isMapped = Boolean(activeSheetData.mapping[col.key]);

                      return (
                        <div className="form-group flex flex-col gap-6" key={col.key}>
                          <label className="form-field-label excel-mapping-label font-semibold text-13 text-primary">
                            <span>
                              {col.label} {col.required && <span className="text-danger">*</span>}
                            </span>
                            {isMapped && (
                              <span className="excel-mapping-badge">
                                <CheckCircle2 size={12} /> {t('ExcelImport_mapped', 'Eşleştirildi')}
                              </span>
                            )}
                          </label>
                          {col.type === 'column' && (
                            <select
                              className="form-input excel-mapping-select"
                              value={activeSheetData.mapping[col.key] || ''}
                              onChange={(e) => updateMapping(activeSheetData.name, col.key, e.target.value)}
                            >
                              <option value="">{t('ExcelImport_selectColPlaceholder', 'Seçiniz...')}</option>
                              {activeSheetData.validColumns.map((i) => {
                                const headerLabel =
                                  activeSheetData.data.length > 0 &&
                                    activeSheetData.data[0][i] !== undefined &&
                                    activeSheetData.data[0][i] !== null &&
                                    String(activeSheetData.data[0][i]).trim() !== ''
                                    ? ` (${String(activeSheetData.data[0][i]).substring(0, 30)})`
                                    : '';
                                return (
                                  <option key={i} value={i}>
                                    {t('ExcelImport_columnPrefix', 'Sütun')} {XLSX.utils.encode_col(i)}
                                    {headerLabel}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {col.type === 'select' && (
                            <select
                              className="form-input excel-mapping-select"
                              value={activeSheetData.mapping[col.key] || ''}
                              onChange={(e) => updateMapping(activeSheetData.name, col.key, e.target.value)}
                            >
                              {col.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {col.type === 'date' && (
                            <DateInput
                              className="form-input excel-mapping-select"
                              value={activeSheetData.mapping[col.key] || ''}
                              onChange={(e: any) =>
                                updateMapping(
                                  activeSheetData.name,
                                  col.key,
                                  typeof e === 'string' ? e : e?.target?.value || ''
                                )
                              }
                              placeholder={t('Tarih Seçiniz', 'Tarih Seçiniz')}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-16 rounded-10 bg-tertiary text-secondary text-13 text-center border border-glass">
                    {t('ExcelImport_sheetDisabledNotice', 'Bu sayfa içeri aktarılmayacak olarak işaretlendi.')}
                  </div>
                )}

                <div className="flex flex-row items-center gap-10 p-14 rounded-10 bg-tertiary border border-glass text-13 text-secondary">
                  <AlertCircle size={18} className="shrink-0 text-primary" />
                  <span>
                    {t(
                      'ExcelImport_invalidRowsNotice',
                      'Kod veya Fiyat bilgisi tutarsız olan satırlar (Örn: Boş, 0, Metin) içeri aktarım sırasında yoksayılacaktır.'
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
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

(FileImportPage as any).hasExternalSettings = true;
(FileImportPage as any).externalSettingsComponent = FileImportPagesettingsForExternal;

export default FileImportPage;
export {
  FileImportPage as ExcelImportPage,
  FileImportPage as ExcelImportModal,
  FileImportPage as FileImportModal,
};
