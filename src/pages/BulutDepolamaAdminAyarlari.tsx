/**
 * @akalin/storage_module - Admin Bulut Depolama Ayarları (BulutDepolamaAdminAyarlari.tsx)
 * Google Drive ve OneDrive OAuth API anahtarlarını BulutDepolamaCard ile listeleyen
 * BaseSystemPage şablonlu admin sayfasıdır.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BaseSystemPage, BulutDepolamaCard } from '@akalin/ui';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { ProviderLogo } from '../logos/ProviderLogo';

export interface BulutDepolamaViewProps {
  editBasePath?: string;
}

export const BulutDepolamaView: React.FC<BulutDepolamaViewProps> = ({ editBasePath = '/bulut-depolama' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { adapter } = useStorageModule();

  const [loading, setLoading] = useState(false);
  const [providersData, setProvidersData] = useState({
    googleClientId: '',
    googleClientSecret: '',
    oneDriveClientId: '',
    oneDriveClientSecret: '',
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    if (!adapter.getSettingByKey) return;
    try {
      setLoading(true);
      const [clientIdRes, secretRes, oneDriveIdRes, oneDriveSecretRes] = await Promise.all([
        adapter.getSettingByKey('GOOGLE_DRIVE_CLIENT_ID').catch(() => null),
        adapter.getSettingByKey('GOOGLE_DRIVE_CLIENT_SECRET').catch(() => null),
        adapter.getSettingByKey('ONEDRIVE_CLIENT_ID').catch(() => null),
        adapter.getSettingByKey('ONEDRIVE_CLIENT_SECRET').catch(() => null),
      ]);

      setProvidersData({
        googleClientId: clientIdRes?.deger || '',
        googleClientSecret: secretRes?.deger || '',
        oneDriveClientId: oneDriveIdRes?.deger || '',
        oneDriveClientSecret: oneDriveSecretRes?.deger || '',
      });
    } catch (error) {
      console.error('Bulut sağlayıcı ayarları çekilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const maskClientId = (val: string) => {
    if (!val) return '';
    const trimmed = val.trim();
    if (trimmed.length <= 16) return trimmed;
    return `${trimmed.substring(0, 10)}...${trimmed.substring(trimmed.length - 8)}`;
  };

  const providers = useMemo(
    () => [
      {
        id: 'google_drive',
        provider: 'google_drive',
        title: t('google_drive_api_ayarlari', 'Google Drive API Ayarları'),
        description: t(
          'google_drive_kisa_aciklama',
          'Google Workspace ve kişisel Drive hesaplarına dosya yükleme, yedekleme ve senkronizasyon entegrasyonu.'
        ),
        isConfigured: Boolean(providersData.googleClientId && providersData.googleClientSecret),
        clientIdMasked: maskClientId(providersData.googleClientId),
        icon: <ProviderLogo provider="google" size={24} />,
      },
      {
        id: 'onedrive',
        provider: 'onedrive',
        title: t('microsoft_onedrive_api_ayarlari', 'Microsoft OneDrive API Ayarları'),
        description: t(
          'onedrive_kisa_aciklama',
          'Microsoft 365 Entra ID tabanlı OneDrive ve SharePoint kurumsal bulut depolama entegrasyonu.'
        ),
        isConfigured: Boolean(providersData.oneDriveClientId && providersData.oneDriveClientSecret),
        clientIdMasked: maskClientId(providersData.oneDriveClientId),
        icon: <ProviderLogo provider="onedrive" size={24} />,
      },
    ],
    [providersData, t]
  );

  const handleEditProvider = (provider: { id: string }) => {
    navigate(`${editBasePath}/${provider.id}`);
  };

  if (loading) {
    return (
      <div className="glass-card loading-state flex flex-col items-center justify-center p-48">
        <RefreshCcw size={36} className="spinning loading-icon mb-12 text-secondary" />
        <p className="text-secondary">{t('yukleniyor', 'Yükleniyor...')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16 w-full fade-in">
      <div className="bulut-card-grid">
        {providers.map((provider) => (
          <BulutDepolamaCard
            key={provider.id}
            item={provider}
            provider={provider.provider}
            title={provider.title}
            description={provider.description}
            icon={provider.icon}
            isConfigured={provider.isConfigured}
            clientIdMasked={provider.clientIdMasked}
            onEdit={() => handleEditProvider(provider)}
            onClick={() => handleEditProvider(provider)}
          />
        ))}
      </div>
    </div>
  );
};

export const BulutDepolamaAdminAyarlari: React.FC = () => {
  const { t } = useTranslation();

  return (
    <BaseSystemPage
      title={t('bulut_depolama_entegrasyonlari', 'Bulut Depolama Entegrasyonları')}
      subtitle={t(
        'bulut_depolama_entegrasyonlari_aciklama',
        'Sistem geneli bulut depolama sağlayıcılarına (Google Drive, OneDrive vb.) erişim için gerekli API yapılandırmalarını yönetin.'
      )}
      icon={<Cloud size={26} />}
      baseRoute="/bulut-depolama"
      headerSync={false}
    >
      <BulutDepolamaView editBasePath="/bulut-depolama" />
    </BaseSystemPage>
  );
};

export default BulutDepolamaAdminAyarlari;
