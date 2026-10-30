/**
 * @akalin/file_manager_module - Modül Fabrikası (createStorageModule.tsx)
 * Yerel & Bulut Dosya Al / Kaydet / Yönet (Local & Cloud File Import, Export & Storage Manager).
 * @akalin/module_core ModuleRegistry ile tam uyumlu IModuleDefinition üretir.
 */

import React from 'react';
import { Cloud, HardDrive, Settings, FolderUp, Download } from 'lucide-react';
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
import FileImportPageComponent from './pages/FileImportPage';
import FileExportPageComponent from './pages/FileExportPage';
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

  const ConnectedFileImportPage: React.FC<any> = (props) => (
    <StorageModuleProvider adapter={adapter} appName={appName} baseRoute={baseRoute} showAlert={options?.showAlert}>
      <FileImportPageComponent asPage={true} isModal={false} allowFilterChange={true} {...props} />
    </StorageModuleProvider>
  );

  const ConnectedFileExportPage: React.FC<any> = (props) => (
    <StorageModuleProvider adapter={adapter} appName={appName} baseRoute={baseRoute} showAlert={options?.showAlert}>
      <FileExportPageComponent asPage={true} isModal={false} {...props} />
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
    title: 'Yerel & Bulut Dosya Yönetimi',
    name: 'Yerel & Bulut Dosya Al / Kaydet / Yönet',
    description:
      'Yerel cihaz ve Google Drive, Microsoft OneDrive, Dropbox entegrasyonu ile dosya içe aktarma (Import), dışa aktarma (Export) ve bulut evrak yönetimi.',
    version: '1.1.0',
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
        path: '/araclar/dosya-al',
        element: React.createElement(ConnectedFileImportPage),
        title: 'Dosya İçeri Aktar (Import)',
      },
      {
        path: '/araclar/dosya-kaydet',
        element: React.createElement(ConnectedFileExportPage),
        title: 'Dosya Kaydet / Dışa Aktar (Export)',
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
        label: 'Dosya & Bulut Yönetimi',
        icon: React.createElement(Cloud, { size: 18 }),
        children: [
          {
            id: 'bulut-dosyalari-menu',
            label: 'Bulut Dosyaları',
            path: '/araclar/bulut-dosyalari',
            icon: React.createElement(HardDrive, { size: 16 }),
          },
          {
            id: 'dosya-al-menu',
            label: 'Dosya Al (Import)',
            path: '/araclar/dosya-al',
            icon: React.createElement(FolderUp, { size: 16 }),
          },
          {
            id: 'dosya-kaydet-menu',
            label: 'Dosya Kaydet (Export)',
            path: '/araclar/dosya-kaydet',
            icon: React.createElement(Download, { size: 16 }),
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
    lists: [
      {
        id: 'bulut-dosyalari-liste',
        category: 'liste',
        titleKey: 'bulut_dosyalari_listesi',
        title: 'Bulut Dosyaları Listesi',
        description:
          'Yerel cihaz ve Google Drive, Microsoft OneDrive, Dropbox bulut sürücülerindeki dosya ve evrakların listesi.',
        route: '/araclar/bulut-dosyalari',
        listRoute: '/araclar/bulut-dosyalari',
        children: [
          {
            id: 'dosya-ice-aktar-karti',
            category: 'kart',
            titleKey: 'dosya_ice_aktar_karti',
            title: 'Dosya İçeri Aktar (FileImportPage)',
            description:
              'Yerel cihazdan veya bulut depolamadan filtreli dosya ve Excel verisi içeri aktarma ekranı (FileImportPage).',
            route: '/araclar/dosya-al',
            formRoute: '/araclar/dosya-al',
          },
          {
            id: 'dosya-disa-aktar-karti',
            category: 'kart',
            titleKey: 'dosya_disa_aktar_karti',
            title: 'Dosya Kaydet / Dışa Aktar (FileExportPage)',
            description:
              'Tablo, rapor ve belgeleri yerel diske veya bulut klasörüne kaydetme ekranı (FileExportPage).',
            route: '/araclar/dosya-kaydet',
            formRoute: '/araclar/dosya-kaydet',
          },
          {
            id: 'bulut-dosyalari-karti',
            category: 'kart',
            titleKey: 'bulut_dosyalari_karti',
            title: 'Bulut Dosyaları Yönetimi (BulutDosyalariPage)',
            description:
              'Bulut klasör gezgini, dosya yükleme ve belge evrak ilişkilendirme ekranı (BulutDosyalariPage).',
            route: '/araclar/bulut-dosyalari',
            formRoute: '/araclar/bulut-dosyalari',
          },
        ],
      },
      {
        id: 'bulut-depolama-entegrasyon-liste',
        category: 'liste',
        titleKey: 'bulut_depolama_entegrasyon_listesi',
        title: 'Bulut Depolama Entegrasyonları Listesi',
        description:
          'Google Drive, Microsoft OneDrive ve Dropbox OAuth API bağlantı tanımları listesi.',
        route: '/bulut-depolama',
        listRoute: '/bulut-depolama',
        children: [
          {
            id: 'bulut-depolama-karti',
            category: 'kart',
            titleKey: 'Bulut Depolama Kartı',
            title: 'Bulut Depolama Kartı',
            description:
              'Bulut sağlayıcı OAuth kimlik bilgileri ve entegrasyon yapılandırma kartı.',
            route: '/bulut-depolama',
            formRoute: '/bulut-depolama',
          },
        ],
      },
    ],
    cards: [
      {
        id: 'dosya-ice-aktar-karti',
        parentId: 'bulut-dosyalari-liste',
        category: 'kart',
        titleKey: 'dosya_ice_aktar_karti',
        title: 'Dosya İçeri Aktar (FileImportPage)',
        description:
          'Yerel cihazdan veya bulut depolamadan filtreli dosya ve Excel verisi içeri aktarma ekranı (FileImportPage).',
        route: '/araclar/dosya-al',
        formRoute: '/araclar/dosya-al',
      },
      {
        id: 'dosya-disa-aktar-karti',
        parentId: 'bulut-dosyalari-liste',
        category: 'kart',
        titleKey: 'dosya_disa_aktar_karti',
        title: 'Dosya Kaydet / Dışa Aktar (FileExportPage)',
        description:
          'Tablo, rapor ve belgeleri yerel diske veya bulut klasörüne kaydetme ekranı (FileExportPage).',
        route: '/araclar/dosya-kaydet',
        formRoute: '/araclar/dosya-kaydet',
      },
      {
        id: 'bulut-dosyalari-karti',
        parentId: 'bulut-dosyalari-liste',
        category: 'kart',
        titleKey: 'bulut_dosyalari_karti',
        title: 'Bulut Dosyaları Yönetimi (BulutDosyalariPage)',
        description:
          'Bulut klasör gezgini, dosya yükleme ve belge evrak ilişkilendirme ekranı (BulutDosyalariPage).',
        route: '/araclar/bulut-dosyalari',
        formRoute: '/araclar/bulut-dosyalari',
      },
      {
        id: 'bulut-depolama-karti',
        parentId: 'bulut-depolama-entegrasyon-liste',
        category: 'kart',
        titleKey: 'Bulut Depolama Kartı',
        title: 'Bulut Depolama Kartı',
        description:
          'Bulut sağlayıcı OAuth kimlik bilgileri ve entegrasyon yapılandırma kartı.',
        route: '/bulut-depolama',
        formRoute: '/bulut-depolama',
      },
    ],
    operations: [
      {
        id: 'bulut-depolama-islem',
        category: 'islem',
        titleKey: 'Dosya ve Bulut Depolama İşlemleri',
        useStandardCrud: false,
        customActions: [
          {
            action: 'import',
            labelKey: 'Dosya İçeri Aktarma (Import)',
            description: 'Yerel cihazdan veya buluttan dosya içeri aktarma yetkisi.',
          },
          {
            action: 'export',
            labelKey: 'Dosya Dışa Aktarma (Export)',
            description: 'Verileri ve belgeleri yerel cihaza veya buluta kaydetme yetkisi.',
          },
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
        group: 'Dosya & Bulut Yönetimi',
      },
      {
        key: 'storage.import',
        name: 'Dosya İçeri Aktarma (Import)',
        description: 'Yerel veya bulut kaynaklarından dosya ve Excel verisi içeri aktarma yetkisi.',
        group: 'Dosya & Bulut Yönetimi',
      },
      {
        key: 'storage.export',
        name: 'Dosya Dışa Aktarma (Export)',
        description: 'Tablo ve belgeleri yerel diske veya buluta dışa aktarma yetkisi.',
        group: 'Dosya & Bulut Yönetimi',
      },
      {
        key: 'storage.upload',
        name: 'Buluta Dosya Yükleme',
        description: 'Bulut depolamaya dosya yükleme yetkisi.',
        group: 'Dosya & Bulut Yönetimi',
      },
      {
        key: 'storage.delete',
        name: 'Bulut Dosyası Silme',
        description: 'Bulut depolamadan dosya silme yetkisi.',
        group: 'Dosya & Bulut Yönetimi',
        danger: true,
      },
      {
        key: 'storage.rename',
        name: 'Bulut Dosyası Yeniden Adlandırma',
        description: 'Bulut depolamadaki dosyaların adını güncelleme yetkisi.',
        group: 'Dosya & Bulut Yönetimi',
      },
      {
        key: 'storage.settings',
        name: 'Bulut Depolama Ayarları',
        description: 'Bulut sağlayıcı bağlantı ve OAuth API ayarlarını yönetme yetkisi.',
        group: 'Dosya & Bulut Yönetimi',
      },
    ],
    components: {
      FilesOnClouds: FilesOnCloudsComponent,
      UploadToCloud: UploadToCloudComponent,
      FileImportPage: FileImportPageComponent,
      ExcelImportPage: FileImportPageComponent,
      FileExportPage: FileExportPageComponent,
      ExcelExportPage: FileExportPageComponent,
      BulutDepolamaAyarlari: BulutDepolamaAyarlariComponent,
      BulutDosyalariPage: BulutDosyalariPageComponent,
      BulutDepolamaAdminAyarlari: BulutDepolamaAdminAyarlariComponent,
      BulutDepolamaKarti: BulutDepolamaKartiComponent,
      ProviderLogo,
    },
    promotion: {
      title: 'Yerel & Bulut Dosya Al / Kaydet / Yönet Modülü',
      subtitle: 'Google Drive, OneDrive ve Dropbox entegrasyonu ile tüm dosya aktarım ve arşiv süreçleriniz tek merkezde.',
      description:
        'Excel ve belge dosyalarınızı filtreleyerek tekli veya çoklu içeri aktarın, raporlarınızı yerel diske veya bulut klasörlerinize kaydedin.',
      badge: 'En Çok Tercih Edilen',
      buttonText: 'Paketi İncele & Satın Al',
      purchaseUrl: '/abonelik/moduller/MOD_BULUT_DEPOLAMA',
      icon: 'Cloud',
      benefits: [
        'Filtreli ve Tekli/Çoklu Dosya İçeri Aktarma (FileImportPage)',
        'Yerel Cihaza ve Bulut Klasörüne Dosya Kaydetme (FileExportPage)',
        'Google Drive, Microsoft OneDrive ve Dropbox doğrudan entegrasyonu',
        'Fatura, sipariş ve cari kartlara tek tıkla evrak bağlama',
      ],
    },
  };
}

export const createFileManagerModule = createStorageModule;
export const BulutDepolamaModule = createStorageModule();
export const FileManagerModule = BulutDepolamaModule;
export const DosyaYonetimiModule = BulutDepolamaModule;
export default FileManagerModule;
