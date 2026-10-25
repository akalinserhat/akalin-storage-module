/**
 * @akalin/storage_module - Modül Fabrikası (createStorageModule.tsx)
 * @akalin/module_core ModuleRegistry ile tam uyumlu IModuleDefinition üretir.
 */

import React from 'react';
import { Cloud, HardDrive, Settings } from 'lucide-react';
import type { IModuleDefinition } from '@akalin/module_core';
import { registerCloudFilesComponent, registerUploadToCloudComponent } from '@akalin/ui';
import { CreateStorageModuleOptions } from './types';
import {
  createRestStorageAdapter,
  setGlobalStorageModuleConfig,
  StorageModuleProvider,
} from './adapters/StorageServiceContext';

import FilesOnCloudsComponent, { FilesOnCloudsProps } from './components/FilesOnClouds';
import UploadToCloudComponent from './components/UploadToCloud';
import BulutDepolamaAyarlariComponent from './components/BulutDepolamaAyarlari';
import BulutDosyalariPageComponent from './pages/BulutDosyalariPage';
import BulutDepolamaAdminAyarlariComponent from './pages/BulutDepolamaAdminAyarlari';
import BulutDepolamaKartiComponent from './pages/BulutDepolamaKarti';
import { ProviderLogo } from './logos/ProviderLogo';

export function createStorageModule(options?: CreateStorageModuleOptions): IModuleDefinition {
  const id = options?.id || 'bulut-depolama';
  const appName = options?.appName || 'Webakus ERP';
  const baseRoute = (options?.baseRoute || '/araclar/bulut-dosyalari').replace(/\/$/, '');
  const settingsModuleId = options?.settingsModuleId || 'bulut-depolama';

  const adapter = options?.adapter || createRestStorageAdapter();

  setGlobalStorageModuleConfig({
    adapter,
    appName,
    baseRoute,
    onNotify: options?.onNotify,
    showAlert:
      options?.showAlert ||
      ((type, title, message, onConfirm) => {
        if (type === 'confirm') {
          if (window.confirm(`${title}\n\n${message}`) && onConfirm) onConfirm();
        } else {
          window.alert(`${title}\n\n${message}`);
          if (onConfirm) onConfirm();
        }
      }),
  });

  // Global @akalin/ui köprüsüne modül bileşenlerini bağla
  const CloudFilesBridge: React.FC<FilesOnCloudsProps> = (props) => {
    if (props.asPage) {
      return (
        <StorageModuleProvider adapter={adapter} appName={appName} baseRoute={baseRoute} showAlert={options?.showAlert}>
          <BulutDosyalariPageComponent {...props} isModal={false} />
        </StorageModuleProvider>
      );
    }
    if (props.isModal === false) {
      return (
        <StorageModuleProvider adapter={adapter} appName={appName} baseRoute={baseRoute} showAlert={options?.showAlert}>
          <FilesOnCloudsComponent {...props} />
        </StorageModuleProvider>
      );
    }
    return (
      <StorageModuleProvider adapter={adapter} appName={appName} baseRoute={baseRoute} showAlert={options?.showAlert}>
        <BulutDosyalariPageComponent {...props} isModal={true} />
      </StorageModuleProvider>
    );
  };

  registerCloudFilesComponent(CloudFilesBridge as any);
  registerUploadToCloudComponent(UploadToCloudComponent as any);

  // Lazy / Connected Sayfa Sarıcıları
  const ConnectedBulutDosyalariPage: React.FC<any> = (props) => (
    <StorageModuleProvider adapter={adapter} appName={appName} baseRoute={baseRoute} showAlert={options?.showAlert}>
      <BulutDosyalariPageComponent {...props} />
    </StorageModuleProvider>
  );

  const ConnectedBulutDepolamaAyarlariPage: React.FC<any> = (props) => (
    <StorageModuleProvider
      adapter={adapter}
      appName={appName}
      baseRoute="/ayarlar/bulut-depolama"
      showAlert={options?.showAlert}
    >
      <BulutDepolamaAyarlariComponent {...props} />
    </StorageModuleProvider>
  );

  const ConnectedAdminAyarlariPage: React.FC<any> = (props) => (
    <StorageModuleProvider
      adapter={adapter}
      appName={appName}
      baseRoute="/bulut-depolama"
      showAlert={options?.showAlert}
    >
      <BulutDepolamaAdminAyarlariComponent {...props} />
    </StorageModuleProvider>
  );

  const ConnectedAdminKartiPage: React.FC<any> = (props) => (
    <StorageModuleProvider
      adapter={adapter}
      appName={appName}
      baseRoute="/bulut-depolama"
      showAlert={options?.showAlert}
    >
      <BulutDepolamaKartiComponent {...props} />
    </StorageModuleProvider>
  );

  return {
    id,
    title: 'Bulut Depolama',
    name: 'Bulut Depolama',
    description:
      'Google Drive, Microsoft OneDrive ve Dropbox entegrasyonu ile tüm fatura, dekont ve sözleşmelerinizi güvenle depolayın ve yönetin.',
    version: '1.0.0',
    permissionPrefix: 'storage',
    icon: React.createElement(Cloud, { size: 20 }),
    iconName: 'Cloud',
    order: options?.order ?? 75,
    isCore: true,
    defaultActive: true,
    routes: [
      {
        path: '/araclar/bulut-dosyalari',
        element: React.createElement(ConnectedBulutDosyalariPage),
        title: 'Bulut Dosyaları',
      },
      {
        path: '/ayarlar/bulut-depolama',
        element: React.createElement(ConnectedBulutDepolamaAyarlariPage),
        title: 'Bulut Depolama Ayarları',
      },
      {
        path: '/bulut-depolama',
        element: React.createElement(ConnectedAdminAyarlariPage),
        title: 'Bulut Depolama API Ayarları',
      },
      {
        path: '/bulut-depolama/:providerId',
        element: React.createElement(ConnectedAdminKartiPage),
        title: 'Bulut Depolama Kartı',
      },
      {
        path: '/bulut-depolama/duzenle/:providerId',
        element: React.createElement(ConnectedAdminKartiPage),
        title: 'Bulut Depolama Kartı',
      },
      {
        path: '/ayarlar/bulut-depolama/:providerId',
        element: React.createElement(ConnectedAdminKartiPage),
        title: 'Bulut Depolama Kartı',
      },
    ],
    menuItems: [
      {
        id: 'bulut-depolama-group',
        label: 'Bulut Depolama',
        icon: React.createElement(Cloud, { size: 18 }),
        children: [
          {
            id: 'bulut-dosyalari-menu',
            label: 'Bulut Dosyaları',
            path: '/araclar/bulut-dosyalari',
            icon: React.createElement(HardDrive, { size: 16 }),
          },
          {
            id: 'bulut-ayarlari-menu',
            label: 'Entegrasyon Ayarları',
            path: '/ayarlar/bulut-depolama',
            icon: React.createElement(Settings, { size: 16 }),
          },
        ],
      },
    ],
    settingsModules: [
      {
        id: settingsModuleId,
        name: 'Bulut Depolama & API Ayarları',
        desc: 'Google Drive ve Microsoft OneDrive API anahtarları ile bulut depolama yapılandırması.',
        icon: React.createElement(Cloud, { size: 20 }),
        order: 49,
        hasOwnLayout: true,
        component: ConnectedAdminAyarlariPage,
      },
    ],
    cards: [
      {
        id: 'bulut-depolama-karti',
        category: 'kart',
        titleKey: 'Bulut Depolama Kartı',
        route: '/bulut-depolama',
      },
    ],
    operations: [
      {
        id: 'bulut-depolama-islem',
        category: 'islem',
        titleKey: 'Bulut Depolama İşlemleri',
        useStandardCrud: false,
        customActions: [
          {
            action: 'upload',
            labelKey: 'Buluta Dosya Yükleme',
            description: 'Bulut sağlayıcılarına yeni dosya yükleme yetkisi.',
          },
          {
            action: 'delete',
            labelKey: 'Bulut Dosyası Silme',
            description: 'Bulut sağlayıcılarındaki dosyaları silme yetkisi.',
            danger: true,
          },
          {
            action: 'rename',
            labelKey: 'Bulut Dosyası Yeniden Adlandırma',
            description: 'Bulut sağlayıcılarındaki dosya adını güncelleme yetkisi.',
          },
          {
            action: 'sync',
            labelKey: 'Bulut Dosyalarını Analiz Etme ve Eşitleme',
            description: 'Bulut sürücüsündeki dosyaları tarayıp eşitleme yetkisi.',
          },
        ],
      },
    ],
    permissions: [
      {
        key: 'storage.view',
        name: 'Bulut Dosyalarını Görüntüleme',
        description: 'Bulut sağlayıcılarındaki dosya ve klasörleri listeleme yetkisi.',
        group: 'Bulut Depolama',
      },
      {
        key: 'storage.upload',
        name: 'Buluta Dosya Yükleme',
        description: 'Bulut depolamaya dosya yükleme yetkisi.',
        group: 'Bulut Depolama',
      },
      {
        key: 'storage.delete',
        name: 'Bulut Dosyası Silme',
        description: 'Bulut depolamadan dosya silme yetkisi.',
        group: 'Bulut Depolama',
        danger: true,
      },
      {
        key: 'storage.rename',
        name: 'Bulut Dosyası Yeniden Adlandırma',
        description: 'Bulut depolamadaki dosyaların adını güncelleme yetkisi.',
        group: 'Bulut Depolama',
      },
      {
        key: 'storage.settings',
        name: 'Bulut Depolama Ayarları',
        description: 'Bulut sağlayıcı bağlantı ve OAuth API ayarlarını yönetme yetkisi.',
        group: 'Bulut Depolama',
      },
    ],
    components: {
      FilesOnClouds: FilesOnCloudsComponent,
      UploadToCloud: UploadToCloudComponent,
      BulutDepolamaAyarlari: BulutDepolamaAyarlariComponent,
      BulutDosyalariPage: BulutDosyalariPageComponent,
      BulutDepolamaAdminAyarlari: BulutDepolamaAdminAyarlariComponent,
      BulutDepolamaKarti: BulutDepolamaKartiComponent,
      ProviderLogo,
    },
    promotion: {
      title: 'Bulut Depolama & Evrak Yönetimi Modülü',
      subtitle: 'Google Drive, OneDrive ve Dropbox entegrasyonu ile tüm fatura, dekont ve sözleşmeleriniz güvende.',
      description:
        'Belgelerinizi, fatura PDF\'lerinizi ve cari sözleşmelerinizi tek tıkla buluta yükleyin, belgelere bağlayın ve sınırsız arşivleyin.',
      badge: 'En Çok Tercih Edilen',
      buttonText: 'Paketi İncele & Satın Al',
      purchaseUrl: '/abonelik/moduller/MOD_BULUT_DEPOLAMA',
      icon: 'Cloud',
      benefits: [
        'Google Drive, Microsoft OneDrive ve Dropbox doğrudan entegrasyonu',
        'Fatura, sipariş ve cari kartlara tek tıkla evrak bağlama',
        'Otomatik klasörleme ve belge türüne göre arşivleme',
        'Şirket içi yetkilendirilmiş güvenli dosya paylaşımı',
      ],
    },
  };
}

export const BulutDepolamaModule = createStorageModule();
export default BulutDepolamaModule;
