/**
 * @akalin/storage_module - Bulut Depolama Ayarları (BulutDepolamaAyarlari.tsx)
 * BaseSystemPage şablonu ile Google Drive, OneDrive ve Dropbox entegrasyonlarını
 * BaseSystemCard kartları üzerinde sunar.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Cloud, CheckCircle2, Trash2, HardDrive, RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BaseSystemPage, BaseSystemCard, StorageQuotaBar } from '@akalin/ui';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { ProviderLogo } from '../logos/ProviderLogo';
import { ALL_STORAGE_PROVIDERS } from '../defaults/defaultProviders';
import { StorageIntegrationDTO } from '../types';

export interface BulutDepolamaAyarlariProps {
  baseRoute?: string;
  backRoute?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerSync?: boolean;
  hideHeader?: boolean;
}

export const BulutDepolamaAyarlari: React.FC<BulutDepolamaAyarlariProps> = ({
  baseRoute = '/ayarlar/bulut-depolama',
  backRoute,
  showBackButton = false,
  onBack,
  headerSync = false,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { adapter, showAlert, onNotify } = useStorageModule();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<StorageIntegrationDTO[]>([]);

  const notify = (type: 'success' | 'error' | 'info' | 'warning', msg: string) => {
    if (onNotify) {
      onNotify(type, msg);
    } else if (type === 'success') {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adapter.getIntegrations();
      setIntegrations(data || []);
    } catch (error) {
      notify('error', t('BulutDepolama_fetchError', 'Entegrasyon bilgileri alınamadı.'));
    } finally {
      setLoading(false);
    }
  }, [adapter, t]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const provider = searchParams.get('provider');
      const providerObj = ALL_STORAGE_PROVIDERS.find((p) => p.id === provider);
      const providerLabel = providerObj?.label || 'Bulut depolama';

      searchParams.delete('success');
      searchParams.delete('provider');
      setSearchParams(searchParams, { replace: true });
      fetchIntegrations();

      showAlert(
        'confirm',
        t('BulutDepolama_entegrasyonBasariliBaslik', 'Entegrasyon Başarılı'),
        t(
          'BulutDepolama_taraSorgulaOnayMesaj',
          '{{provider}} entegrasyonu başarıyla tamamlandı. Bulut sürücünüzdeki mevcut dosya ve klasörlerini şimdi tarayıp sisteme dahil etmek ister misiniz?',
          { provider: providerLabel }
        ),
        async () => {
          const toastId = toast.loading(
            t('BulutDosyalari_analizEdiliyor', 'Bulut sürücüsü taranıyor ve dosyalar analiz ediliyor...')
          );
          try {
            const res = await adapter.analyzeCloudFiles();
            toast.dismiss(toastId);
            notify('success', res?.mesaj || t('BulutDosyalari_analizTamamlandi', 'Bulut dosyaları başarıyla eşitlendi.'));
            fetchIntegrations();
          } catch (err: any) {
            toast.dismiss(toastId);
            notify(
              'error',
              err?.message || t('BulutDosyalari_analizHata', 'Bulut dosyaları analiz edilirken bir hata oluştu.')
            );
          }
        },
        t('BulutDosyalari_simdiTara', 'Şimdi Tara ve Eşitle'),
        t('BulutDosyalari_dahaSonra', 'Daha Sonra'),
        true
      );
    }
  }, [searchParams, setSearchParams, t, fetchIntegrations, showAlert, adapter]);

  const handleConnect = async (providerId: string, providerLabel: string) => {
    try {
      const response = await adapter.getOAuthLoginUrl(providerId, `${providerLabel} Bağlantısı`);
      if (response && response.url) {
        window.location.href = response.url;
      }
    } catch {
      notify('error', t('BulutDepolama_connectError', 'Bağlantı adresi alınamadı.'));
    }
  };

  const confirmDelete = (id: number, providerLabel: string) => {
    showAlert(
      'confirm',
      t('Emin_misiniz', 'Emin misiniz?'),
      `${providerLabel} ${t(
        'BulutDepolama_deleteConfirmText',
        'entegrasyonunu kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz.'
      )}`,
      () => handleDelete(id),
      t('Evet', 'Evet, Sil'),
      t('Iptal', 'İptal'),
      true
    );
  };

  const handleDelete = async (id: number) => {
    try {
      await adapter.disconnectIntegration(id);
      notify('success', t('BulutDepolama_baglantiKesildi', 'Entegrasyon bağlantısı kesildi.'));
      fetchIntegrations();
    } catch {
      notify('error', t('BulutDepolama_disconnectError', 'Bağlantı kesilemedi.'));
    }
  };

  const searchableFields = useMemo(
    () => [
      {
        id: 'Tumu',
        label: t('Tümü', 'Tümü'),
        type: 'text' as const,
        placeholder: t('BulutDepolama_aramaPlaceholder', 'Bulut depolama sağlayıcılarında ara...'),
      },
    ],
    [t]
  );

  return (
    <BaseSystemPage
      title={t('BulutDepolama_baslik', 'Bulut Depolama Ayarları')}
      subtitle={t(
        'BulutDepolama_aciklama',
        'Dosyalarınızı kendi bulut sürücülerinizde (Google Drive, OneDrive vb.) güvenle saklayın ve yönetin.'
      )}
      icon={<Cloud size={24} />}
      baseRoute={baseRoute}
      backRoute={backRoute}
      showBackButton={showBackButton}
      onBack={onBack}
      headerSync={headerSync}
      hideHeader={hideHeader}
      searchPlaceholder={t('BulutDepolama_aramaPlaceholder', 'Bulut depolama sağlayıcılarında ara...')}
      searchableFields={searchableFields}
    >
      {({ filterItems, searchTerm, isSearching }) => {
        const filteredProviders = filterItems(ALL_STORAGE_PROVIDERS, (provider) => {
          const connected = integrations.find((i) => i.providerType === provider.id);
          return [provider.label, connected?.name, connected?.email];
        });

        return (
          <div className="relative fade-in flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="glass-card loading-state flex flex-col items-center justify-center p-40">
                <RefreshCcw size={32} className="spinning loading-icon mb-12 text-secondary" />
                <p className="text-secondary m-0">{t('auto_yukleniyor_4deb', 'Yükleniyor...')}</p>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="surface-card p-40 text-center flex flex-col items-center justify-center rounded-16 my-16">
                <div className="icon-box-large mb-16 bg-surface-variant">
                  <Cloud size={36} className="text-secondary" />
                </div>
                <h3 className="m-0 text-16 font-semibold text-primary mb-6">
                  {t('BulutDepolama_eslesenBulunamadi', 'Eşleşen Bulut Sağlayıcı Bulunamadı')}
                </h3>
                <p className="text-13 text-secondary max-w-400 mb-16">
                  {isSearching
                    ? t('auto_arama_kriterine_uygun_sonuc_yok', '"{{term}}" arama kriterine uygun sağlayıcı bulunamadı.', {
                        term: searchTerm,
                      })
                    : t('BulutDepolama_kayitYok', 'Bağlı bulut depolama hesabı bulunamadı.')}
                </p>
              </div>
            ) : (
              <div className="grid-auto-320 gap-20 p-24 overflow-y-auto">
                {filteredProviders.map((provider) => {
                  const connectedIntegration = integrations.find((i) => i.providerType === provider.id);

                  return (
                    <BaseSystemCard
                      key={provider.id}
                      icon={<ProviderLogo provider={provider.id} size={28} />}
                      iconBoxVariant="secondary"
                      iconBoxClassName="p-8 bg-surface-variant border border-glass shadow-xs"
                      title={provider.label}
                      subtitle={
                        connectedIntegration
                          ? connectedIntegration.email
                          : provider.active
                          ? t('BulutDepolama_baglantiyaHazir', 'Bağlantıya Hazır')
                          : t('BulutDepolama_yakinda', 'Yakında')
                      }
                      badge={
                        connectedIntegration ? (
                          <span className="badge badge-success flex items-center gap-4">
                            <CheckCircle2 size={12} />
                            {t('BulutDepolama_baglandi', 'Bağlandı')}
                          </span>
                        ) : provider.active ? (
                          <span className="badge badge-secondary">
                            {t('BulutDepolama_bagliDegil', 'Bağlı Değil')}
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            {t('BulutDepolama_yakinda', 'Yakında')}
                          </span>
                        )
                      }
                      borderHighlight={connectedIntegration ? 'border-l-success' : 'none'}
                      status={{
                        active: Boolean(connectedIntegration),
                        label: t('BulutDepolama_durum', 'Bağlantı Durumu'),
                        activeText: t('BulutDepolama_baglandi', 'Bağlandı'),
                        passiveText: provider.active
                          ? t('BulutDepolama_bagliDegil', 'Bağlı Değil')
                          : t('BulutDepolama_yakinda', 'Yakında'),
                      }}
                      details={
                        connectedIntegration
                          ? [
                              {
                                label: t('BulutDepolama_hesap', 'Hesap'),
                                value: connectedIntegration.email || connectedIntegration.name,
                              },
                            ]
                          : undefined
                      }
                      middleContent={
                        connectedIntegration && connectedIntegration.totalBytes > 0 ? (
                          <div className="bg-hover p-12 rounded-12 flex flex-col gap-8 my-8">
                            <div className="flex items-center gap-8 text-secondary font-medium text-12">
                              <HardDrive size={14} />
                              <span>{t('BulutDepolama_quota', 'Depolama Alanı (Kota)')}</span>
                            </div>
                            <StorageQuotaBar
                              usedBytes={connectedIntegration.usedBytes}
                              totalBytes={connectedIntegration.totalBytes}
                            />
                          </div>
                        ) : null
                      }
                      actions={
                        connectedIntegration
                          ? [
                              {
                                label: t('BulutDepolama_baglantiyiKes', 'Bağlantıyı Kes'),
                                icon: <Trash2 size={15} />,
                                danger: true,
                                onClick: () => confirmDelete(connectedIntegration.id, provider.label),
                              },
                            ]
                          : undefined
                      }
                      footer={
                        connectedIntegration ? (
                          <button
                            type="button"
                            className="btn btn-outline-danger w-full flex items-center justify-center gap-8"
                            onClick={() => confirmDelete(connectedIntegration.id, provider.label)}
                          >
                            <Trash2 size={16} />
                            {t('BulutDepolama_baglantiyiKes', 'Bağlantıyı Kes')}
                          </button>
                        ) : provider.active ? (
                          <button
                            type="button"
                            className="btn btn-primary w-full flex items-center justify-center gap-8"
                            onClick={() => handleConnect(provider.id, provider.label)}
                          >
                            {t('BulutDepolama_baglan', 'Bağlan')}
                          </button>
                        ) : (
                          <button type="button" className="btn btn-secondary w-full opacity-50 cursor-not-allowed" disabled>
                            {t('BulutDepolama_yakinda', 'Yakında')}
                          </button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      }}
    </BaseSystemPage>
  );
};

export default BulutDepolamaAyarlari;
