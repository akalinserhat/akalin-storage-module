/**
 * @akalin/file_manager_module - FileImportPage Harici Düğüm Ayar Sayfası (FileImportPageSettingsForExternal.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Flowchart düğümleri (FORM_AC, AI_ISLEM vb.) veya dış bileşenler tarafından FileImportPage seçildiğinde
 *   McpVarlikSeciciInput üzerindeki "Ayar" (Settings) ikonu aracılığıyla açılan harici yapılandırma ekranını sunmak
 * - BaseCardPage standart şablonundan türetilmek, sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Files, Cloud } from 'lucide-react';
import {
  BaseCardPage,
  BaseDropdownSecici,
  BaseSwitch,
  DosyaTipiFiltresiSecici,
  resolveFileFilterExtensions,
  type DropdownOption,
} from '@akalin/ui';
import type { FileFilterCategory, FileSelectionMode } from '../types';

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

export interface FileImportPageSettingsForExternalProps {
  isOpen?: boolean;
  inModal?: boolean;
  entity?: any;
  value?: FileImportExternalSettingsValue;
  onChange?: (settings: FileImportExternalSettingsValue) => void;
  onSave?: (settings: FileImportExternalSettingsValue) => void;
  onClose?: () => void;
  onBack?: () => void;
}

export type FileImportPagesettingsForExternalProps = FileImportPageSettingsForExternalProps;

const buildExternalSettingsState = (
  val?: FileImportExternalSettingsValue
): FileImportExternalSettingsValue => {
  const initialFilters: string[] =
    Array.isArray(val?.fileTypeFilters) && val!.fileTypeFilters!.length > 0
      ? val!.fileTypeFilters!.map(String)
      : Array.isArray(val?.fileTypeFilter) && val!.fileTypeFilter!.length > 0
        ? val!.fileTypeFilter!.map(String)
        : typeof val?.fileTypeFilter === 'string' && val.fileTypeFilter
          ? [val.fileTypeFilter]
          : ['all'];

  return {
    fileTypeFilters: initialFilters,
    fileTypeFilter:
      initialFilters.length === 1 ? (initialFilters[0] as FileFilterCategory) : initialFilters,
    allowedExtensions: resolveFileFilterExtensions(initialFilters),
    selectionMode: val?.selectionMode || 'single',
    allowFilterChange: val?.allowFilterChange !== false,
    defaultSendToCloud: Boolean(val?.defaultSendToCloud),
  };
};

export const FileImportPageSettingsForExternal: React.FC<FileImportPageSettingsForExternalProps> = ({
  isOpen = true,
  inModal = true,
  value,
  onChange,
  onSave,
  onClose,
  onBack,
}) => {
  const { t } = useTranslation();

  const [formState, setFormState] = useState<FileImportExternalSettingsValue>(() =>
    buildExternalSettingsState(value)
  );
  const formStateRef = React.useRef<FileImportExternalSettingsValue>(formState);
  formStateRef.current = formState;

  React.useEffect(() => {
    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
      const synced = buildExternalSettingsState(value);
      setFormState(synced);
      formStateRef.current = synced;
    }
  }, [value]);

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
    const next = { ...formStateRef.current, ...patch };
    formStateRef.current = next;
    setFormState(next);
  };

  const handleSaveSettings = () => {
    const current = formStateRef.current;
    if (onChange) {
      onChange(current);
    }
    if (onSave) {
      onSave(current);
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
            <DosyaTipiFiltresiSecici
              id="fileImportExtFilterSelect"
              label={t('FileImport_defaultFilterLabel', 'Varsayılan Dosya Tipi Filtresi')}
              value={selectedFilterValues}
              multiple={true}
              clearable={true}
              showAllowedExtensionsHint={true}
              onChange={(nextFilters, payload) => {
                handleFieldUpdate({
                  fileTypeFilters: nextFilters,
                  fileTypeFilter: payload.primaryFilter,
                  allowedExtensions: payload.allowedExtensions,
                });
              }}
            />
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

export const FileImportPagesettingsForExternal = FileImportPageSettingsForExternal;
export default FileImportPageSettingsForExternal;
