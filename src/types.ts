/**
 * @akalin/storage_module - Tip Tanımları (types.ts)
 * Bulut Depolama Modülü Veri Transfer Nesneleri (DTO) ve Servis Arayüzleri
 */

export type StorageProviderType = 'google' | 'onedrive' | 'dropbox' | string;

export interface StorageIntegrationDTO {
  id: number;
  providerType: StorageProviderType;
  name: string;
  email: string;
  isConnected: boolean;
  usedBytes: number;
  totalBytes: number;
}

export interface CloudFolderItem {
  id: number;
  klasorAdi: string;
  altKlasorler?: CloudFolderItem[];
  provider?: string;
  ustKlasorId?: number | null;
}

export interface CloudFileItem {
  id: number;
  dosyaAdi: string;
  boyut: number;
  contentType?: string;
  dosyaUrl?: string;
  yuklemeTarihi?: string;
  provider?: string;
  klasorId?: number | null;
  belgeTuru?: string;
  belgeId?: number;
  belgeGuid?: string;
  belgeNo?: string;
  iconUrl?: string;
}

export interface StorageProviderDefinition {
  id: string;
  label: string;
  active: boolean;
  clientIdKey?: string;
  clientSecretKey?: string;
  docsUrl?: string;
  docsTitle?: string;
  docsDesc?: string;
}

export interface GetFoldersParams {
  provider?: string;
  ustKlasorId?: number | null;
  belgeTuru?: string;
  belgeId?: number;
  belgeGuid?: string;
  belgeNo?: string;
}

export interface CreateFolderParams {
  ad: string;
  provider: string;
  ustKlasorId?: number | null;
}

export interface GetFilesParams {
  klasorId?: number | null;
  provider?: string;
  belgeTuru?: string;
  belgeId?: number;
  belgeGuid?: string;
  belgeNo?: string;
  arama?: string;
  isAttachedOnly?: boolean;
}

export interface UploadFileParams {
  dosya: File;
  provider: string;
  klasorId?: number | null;
  belgeTuru?: string;
  belgeId?: number;
  belgeGuid?: string;
  belgeNo?: string;
}

export interface RenameFileParams {
  id: number;
  yeniAd: string;
}

export interface SettingKeyValueDTO {
  deger?: string;
  aciklama?: string;
}

/**
 * Bağımsız Depolama Servis Adaptörü Sözleşmesi (Adapter Interface)
 */
export interface IStorageServiceAdapter {
  getIntegrations(): Promise<StorageIntegrationDTO[]>;
  disconnectIntegration(id: number): Promise<void>;
  getOAuthLoginUrl(provider: string, name?: string): Promise<{ url: string }>;
  analyzeCloudFiles(): Promise<{ mesaj?: string }>;
  getFolders(params?: GetFoldersParams): Promise<CloudFolderItem[]>;
  createFolder(data: CreateFolderParams): Promise<CloudFolderItem>;
  getFiles(params?: GetFilesParams): Promise<CloudFileItem[]>;
  uploadFile(
    data: UploadFileParams,
    onProgress?: (percent: number, loaded: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{ dosya: CloudFileItem; mesaj?: string }>;
  renameFile(id: number, yeniAd: string): Promise<CloudFileItem>;
  deleteFile(id: number): Promise<void>;
  getSettingByKey?(key: string): Promise<SettingKeyValueDTO | null>;
  saveSettingByKey?(key: string, data: SettingKeyValueDTO): Promise<void>;
}

export type AlertType = 'confirm' | 'warning' | 'info' | 'error';

export type ShowAlertFn = (
  type: AlertType,
  title: string,
  message: string,
  onConfirm?: () => void | Promise<void>,
  confirmText?: string,
  cancelText?: string,
  isDestructive?: boolean
) => void;

export interface CreateStorageModuleOptions {
  id?: string;
  appName?: string;
  baseRoute?: string;
  settingsModuleId?: string;
  order?: number;
  adapter?: IStorageServiceAdapter;
  onNotify?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  showAlert?: ShowAlertFn;
  isAdmin?: boolean;
}
