/**
 * @akalin/file_manager_module - Yerel & Bulut Dosya Al / Kaydet / Yönet Modülü Ana Giriş Noktası (index.ts)
 * (Local & Cloud File Import, Export & Storage Manager)
 */

export * from './types';
export * from './defaults/defaultProviders';
export * from './validators/storageValidation';
export {
  createRestStorageAdapter,
  createLocalStorageStorageAdapter,
  createRestFileManagerAdapter,
  createLocalStorageFileManagerAdapter,
  StorageModuleContext,
  StorageModuleProvider,
  FileManagerModuleProvider,
  useStorageModule,
  useFileManagerModule,
  setGlobalStorageModuleConfig,
  getGlobalStorageModuleConfig,
  type StorageModuleContextValue,
  type StorageModuleProviderProps,
} from './adapters/StorageServiceContext';
export {
  ProviderLogo,
  GoogleDriveLogo,
  OneDriveLogo,
  DropboxLogo,
  type LogoProps,
  type DynamicProviderLogoProps,
} from './logos/ProviderLogo';
export {
  FilesOnClouds,
  formatFileBytes,
  getFileExtension,
  renderFileTypeIcon,
  findDocumentFolder,
  type FilesOnCloudsProps,
  type FilesOnCloudsHandle,
} from './components/FilesOnClouds';
export {
  UploadToCloud,
  type UploadToCloudProps,
} from './components/UploadToCloud';
export {
  BulutDepolamaAyarlari,
  type BulutDepolamaAyarlariProps,
} from './components/BulutDepolamaAyarlari';
export {
  BulutDosyalariPage,
  type BulutDosyalariPageProps,
} from './pages/BulutDosyalariPage';
export {
  BulutDepolamaAdminAyarlari,
  BulutDepolamaView,
  type BulutDepolamaViewProps,
} from './pages/BulutDepolamaAdminAyarlari';
export {
  BulutDepolamaKarti,
} from './pages/BulutDepolamaKarti';
export {
  FileImportPage,
  ExcelImportPage,
  ExcelImportModal,
  FileImportModal,
  openExcelInNewTab,
  FILE_FILTER_PRESETS,
  resolveFileFilterExtensions,
  buildGroupedFileFilterOptions,
  type FileFilterPresetItem,
  type FileImportPageProps,
  type ExcelImportPageProps,
  type ExcelImportModalProps,
} from './pages/FileImportPage';
export {
  FileImportPagesettingsForExternal,
  type FileImportPagesettingsForExternalProps,
  type FileImportExternalSettingsValue,
} from './pages/FileImportPagesettingsForExternal';
export {
  FileExportPage,
  ExcelExportPage,
  ExcelExportModal,
  FileExportModal,
  type FileExportPageProps,
  type ExcelExportPageProps,
  type FileExportModalProps,
  type FileExportResult,
} from './pages/FileExportPage';
export {
  createStorageModule,
  createFileManagerModule,
  BulutDepolamaModule,
  FileManagerModule,
  DosyaYonetimiModule,
  FileManagerModule as default,
} from './createStorageModule';
