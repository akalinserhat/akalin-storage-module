/**
 * @akalin/storage_module - Varsayılan Sağlayıcı Tanımları (defaultProviders.ts)
 */

import { StorageIntegrationDTO, StorageProviderDefinition } from '../types';

export const ALL_STORAGE_PROVIDERS: StorageProviderDefinition[] = [
  {
    id: 'google',
    label: 'Google Drive',
    active: true,
    clientIdKey: 'GOOGLE_DRIVE_CLIENT_ID',
    clientSecretKey: 'GOOGLE_DRIVE_CLIENT_SECRET',
    docsUrl: 'https://console.cloud.google.com/',
    docsTitle: 'Google Cloud Console',
    docsDesc: 'API kimlik bilgileri, OAuth onay ekranı ve izin kapsamlarını yönetmek için konsola gidin.',
  },
  {
    id: 'onedrive',
    label: 'Microsoft OneDrive',
    active: true,
    clientIdKey: 'ONEDRIVE_CLIENT_ID',
    clientSecretKey: 'ONEDRIVE_CLIENT_SECRET',
    docsUrl: 'https://entra.microsoft.com/',
    docsTitle: 'Microsoft Entra ID Yönetim Merkezi',
    docsDesc: 'Uygulama kayıtları (App registrations) ve API izinlerini yönetmek için portala gidin.',
  },
  {
    id: 'dropbox',
    label: 'Dropbox',
    active: false,
    clientIdKey: 'DROPBOX_CLIENT_ID',
    clientSecretKey: 'DROPBOX_CLIENT_SECRET',
    docsUrl: 'https://www.dropbox.com/developers/apps',
    docsTitle: 'Dropbox App Console',
    docsDesc: 'Dropbox App Console üzerinden OAuth kimlik bilgisi oluşturun.',
  },
];

export const DEFAULT_SAMPLE_INTEGRATIONS: StorageIntegrationDTO[] = [
  {
    id: 1,
    providerType: 'google',
    name: 'Google Drive Kurumsal',
    email: 'depo@akalin.local',
    isConnected: true,
    usedBytes: 4294967296, // 4 GB
    totalBytes: 16106127360, // 15 GB
  },
];
