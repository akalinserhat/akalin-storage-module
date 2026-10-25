/**
 * @akalin/storage_module - Bağımsız Bulut Depolama Modülü Ana Giriş Noktası (index.ts)
 */

export * from './types';
export * from './defaults/defaultProviders';
export * from './validators/storageValidation';
export {
  createRestStorageAdapter,
  createLocalStorageStorageAdapter,
  StorageModuleContext,
  StorageModuleProvider,
  useStorageModule,
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
  createStorageModule,
  BulutDepolamaModule,
  BulutDepolamaModule as default,
} from './createStorageModule';
