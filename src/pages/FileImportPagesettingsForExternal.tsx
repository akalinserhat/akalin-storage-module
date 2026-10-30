/**
 * @akalin/file_manager_module - FileImportPage Harici Düğüm Ayar Sayfası (FileImportPagesettingsForExternal.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Flowchart düğümleri (FORM_AC, AI_ISLEM vb.) veya dış bileşenler tarafından FileImportPage seçildiğinde
 *   McpVarlikSeciciInput üzerindeki "Ayar" (Settings) ikonu aracılığıyla açılan harici yapılandırma ekranını sunmak
 * - BaseCardPage standart şablonundan türetilmek, sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Filter, Files, Cloud } from 'lucide-react';
import {
  BaseCardPage,
  BaseDropdownSecici,
  BaseSwitch,
  type DropdownOption,
} from '@akalin/ui';
import type { FileFilterCategory, FileSelectionMode } from '../types';
import {
  buildGroupedFileFilterOptions,
  resolveFileFilterExtensions,
} from './FileImportPage';

export interface FileImportExternalSettingsValue {
  /** Çoklu seçilen dosya tipi filtre anahtarları (örn: ['pdf', 'word', 'png'] veya ['all']) */
  fileTypeFilters?: string[];
  /** Tekil veya dizi dosya tipi filtresi (geriye dönük uyumluluk) */
  fileTypeFilter?: FileFilterCategory | string[];
  /** Seçilen filtrelerden türetilen izinli uzantılar dizisi */
  allowedExtensions?: string[];
  selectionMode?: FileSelectionMode;
  allowFilterChange?: boolean;
  defaultSendToCloud?: boolean;
}

export interface FileImportPagesettingsForExternalProps {
  isOpen?: boolean;
  inModal?: boolean;
  entity?: any;
  value?: FileImportExternalSettingsValue;
  onChange?: (settings: FileImportExternalSettingsValue) => void;
  onSave?: (settings: FileImportExternalSettingsValue) => void;
  onClose?: () => void;
  onBack?: () => void;
}

export const FileImportPagesettingsForExternal: React.FC<FileImportPagesettingsForExternalProps> = ({
  isOpen = true,
  inModal = true,
  value,
  onChange,
  onSave,
  onClose,
  onBack,
}) => {
  const { t } = useTranslation();

  const [formState, setFormState] = useState<FileImportExternalSettingsValue>(() => {
    const initialFilters: string[] =
      Array.isArray(value?.fileTypeFilters) && value!.fileTypeFilters!.length > 0
        ? value!.fileTypeFilters!.map(String)
        : Array.isArray(value?.fileTypeFilter) && value!.fileTypeFilter!.length > 0
          ? value!.fileTypeFilter!.map(String)
          : typeof value?.fileTypeFilter === 'string' && value.fileTypeFilter
            ? [value.fileTypeFilter]
            : ['all'];

    return {
      fileTypeFilters: initialFilters,
      fileTypeFilter: initialFilters.length === 1 ? (initialFilters[0] as FileFilterCategory) : initialFilters,
      allowedExtensions: resolveFileFilterExtensions(initialFilters),
      selectionMode: value?.selectionMode || 'single',
      allowFilterChange: value?.allowFilterChange !== false,
      defaultSendToCloud: Boolean(value?.defaultSendToCloud),
    };
  });

  const filterOptions = useMemo<DropdownOption[]>(
    () => buildGroupedFileFilterOptions(t),
    [t]
  );

  const selectedFilterValues = useMemo<string[]>(() => {
    if (Array.isArray(formState.fileTypeFilters) && formState.fileTypeFilters.length > 0) {
      return formState.fileTypeFilters;
    }
    if (Array.isArray(formState.fileTypeFilter) && formState.fileTypeFilter.length > 0) {
      return formState.fileTypeFilter.map(String);
    }
    if (typeof formState.fileTypeFilter === 'string' && formState.fileTypeFilter) {
      return [formState.fileTypeFilter];
    }
    return ['all'];
  }, [formState.fileTypeFilters, formState.fileTypeFilter]);

  const resolvedExtensionsPreview = useMemo<string>(() => {
    const exts = resolveFileFilterExtensions(selectedFilterValues);
    if (exts.length === 0) {
      return t('FileImport_allFormatsAllowed', 'Tüm dosya formatları');
    }
    return exts.map((ext) => `.${ext}`).join(', ');
  }, [selectedFilterValues, t]);

  const selectionModeOptions = useMemo<DropdownOption[]>(
    () => [
      {
        id: 'single',
        value: 'single',
        label: t('FileImport_modeSingleBadge', 'Tekli Seçim'),
      },
      {
        id: 'multiple',
        value: 'multiple',
        label: t('FileImport_modeMultipleBadge', 'Çoklu Seçim Aktif'),
      },
    ],
    [t]
  );

  if (!isOpen) return null;

  const handleFieldUpdate = (patch: Partial<FileImportExternalSettingsValue>) => {
    setFormState((prev) => {
      const next = { ...prev, ...patch };
      if (onChange) {
        onChange(next);
      }
      return next;
    });
  };

  const handleSaveSettings = () => {
    if (onSave) {
      onSave(formState);
    } else if (onClose) {
      onClose();
    }
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <BaseCardPage
      id="fileImportExternalSettingsPage"
      inModal={inModal}
      icon={<Sliders size={20} />}
      title={t('FileImport_externalSettingsTitle', 'Dosya İçeri Aktar — Harici Düğüm Ayarları')}
      pageTitle={t('FileImport_externalSettingsTitle', 'Dosya İçeri Aktar — Harici Düğüm Ayarları')}
      subtitleLeft={t(
        'FileImport_externalSettingsSubtitle',
        'Görev akışı düğümü tarafından Dosya İçeri Aktar ekranı açıldığında uygulanacak varsayılan parametreler'
      )}
      showBackButton={true}
      onClose={handleDismiss}
      onBack={handleDismiss}
      onSave={handleSaveSettings}
      enableAiAssistant={false}
    >
      <div className="flex flex-col gap-20">
        <div className="form-grid gap-16">
          <div className="form-group flex flex-col gap-6">
            <label className="form-field-label flex items-center gap-6 font-semibold text-13 text-primary">
              <Filter size={14} />
              <span>{t('FileImport_defaultFilterLabel', 'Varsayılan Dosya Tipi Filtresi')}</span>
            </label>
            <BaseDropdownSecici
              id="fileImportExtFilterSelect"
              options={filterOptions}
              multiple={true}
              clearable={true}
              value={selectedFilterValues}
              placeholder={t('FileImport_selectFileTypesPlaceholder', 'Dosya türlerini seçin...')}
              onChange={(val) => {
                const nextFilters =
                  Array.isArray(val) && val.length > 0 ? val.map(String) : ['all'];
                const nextExtensions = resolveFileFilterExtensions(nextFilters);
                handleFieldUpdate({
                  fileTypeFilters: nextFilters,
                  fileTypeFilter:
                    nextFilters.length === 1
                      ? (nextFilters[0] as FileFilterCategory)
                      : nextFilters,
                  allowedExtensions: nextExtensions,
                });
              }}
            />
            <span className="text-11 text-secondary">
              {t('FileImport_allowedFormatsLabel', 'İzin verilen formatlar')}:{' '}
              <strong className="text-primary">{resolvedExtensionsPreview}</strong>
            </span>
          </div>

          <div className="form-group flex flex-col gap-6">
            <label className="form-field-label flex items-center gap-6 font-semibold text-13 text-primary">
              <Files size={14} />
              <span>{t('FileImport_selectionModeLabel', 'Dosya Seçim Modu')}</span>
            </label>
            <BaseDropdownSecici
              id="fileImportExtSelectionModeSelect"
              options={selectionModeOptions}
              value={formState.selectionMode || 'single'}
              clearable={false}
              onChange={(val) =>
                handleFieldUpdate({ selectionMode: (val as FileSelectionMode) || 'single' })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-12">
          <div className="flex items-center justify-between p-14 rounded-10 bg-surface-variant border border-glass">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-13 text-primary">
                {t(
                  'FileImport_allowFilterChangeLabel',
                  'Kullanıcının Dosya Tipi Filtresini Değiştirmesine İzin Ver'
                )}
              </span>
              <span className="text-12 text-secondary">
                {t(
                  'FileImport_allowFilterChangeDesc',
                  'Açılan ekranda kullanıcının sağ üstteki filtre menüsünden dosya formatını değiştirebilmesini sağlar.'
                )}
              </span>
            </div>
            <BaseSwitch
              id="fileImportExtAllowFilterSwitch"
              checked={formState.allowFilterChange !== false}
              onChange={(e: any) => {
                const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                handleFieldUpdate({ allowFilterChange: Boolean(checked) });
              }}
            />
          </div>

          <div className="flex items-center justify-between p-14 rounded-10 bg-surface-variant border border-glass">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-13 text-primary flex items-center gap-6">
                <Cloud size={14} />
                <span>
                  {t(
                    'FileImport_defaultSendToCloudLabel',
                    'İçeri Aktarılan Yerel Dosyaları Varsayılan Olarak Buluta Kaydet'
                  )}
                </span>
              </span>
              <span className="text-12 text-secondary">
                {t(
                  'FileImport_defaultSendToCloudDesc',
                  'Bilgisayardan seçilen dosyaların içeri aktarım sırasında bulut depolamaya da yüklenmesi seçeneğini açık başlatır.'
                )}
              </span>
            </div>
            <BaseSwitch
              id="fileImportExtSendToCloudSwitch"
              checked={Boolean(formState.defaultSendToCloud)}
              onChange={(e: any) => {
                const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                handleFieldUpdate({ defaultSendToCloud: Boolean(checked) });
              }}
            />
          </div>
        </div>
      </div>
    </BaseCardPage>
  );
};

export default FileImportPagesettingsForExternal;
