/**
 * @akalin/storage_module - Bulut Depolama Kartı (BulutDepolamaKarti.tsx)
 * Google Drive ve OneDrive bulut depolama API anahtarlarını, OAuth kimlik bilgilerini
 * BaseCardPage standart mimarisinde düzenleyen sayfadır.
 * Sıfır alt düğme (Zero Bottom Buttons) kuralına tam uyumludur.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cloud, Key, ExternalLink, RefreshCcw, Eye, EyeOff, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BaseCardPage, BaseCard, BasitInput } from '@akalin/ui';
import { useStorageModule } from '../adapters/StorageServiceContext';
import { validateCredentials } from '../validators/storageValidation';

export const BulutDepolamaKarti: React.FC = () => {
  const { t } = useTranslation();
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { adapter, onNotify } = useStorageModule();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTabId, setActiveTabId] = useState('credentials');

  const providerKey = (providerId || 'google_drive').toLowerCase();

  const notify = (type: 'success' | 'error' | 'info' | 'warning', msg: string) => {
    if (onNotify) {
      onNotify(type, msg);
    } else if (type === 'success') {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const providerConfig = useMemo(() => {
    if (providerKey === 'onedrive' || providerKey === 'microsoft') {
      return {
        id: 'onedrive',
        name: 'Microsoft OneDrive',
        title: t('microsoft_onedrive_api_ayarlari', 'Microsoft OneDrive API Ayarları'),
        pageTitle: t('onedrive_yapilandirma', 'Microsoft OneDrive Yapılandırması'),
        subtitleLeft: t('onedrive_aciklama', 'Microsoft Entra ID (Azure AD) OAuth 2.0 API Entegrasyonu'),
        clientIdKey: 'ONEDRIVE_CLIENT_ID',
        clientSecretKey: 'ONEDRIVE_CLIENT_SECRET',
        clientIdPlaceholder: 'Örn: 12345678-abcd-1234-abcd-123456789abc',
        clientSecretPlaceholder: 'Örn: XyZ123~abc...',
        docsUrl: 'https://entra.microsoft.com/',
        docsTitle: t('microsoft_entra_id', 'Microsoft Entra ID Yönetim Merkezi'),
        docsDesc: t(
          'microsoft_entra_desc',
          'Uygulama kayıtları (App registrations) ve API izinlerini yönetmek için portala gidin.'
        ),
      };
    }

    return {
      id: 'google_drive',
      name: 'Google Drive',
      title: t('google_drive_api_ayarlari', 'Google Drive API Ayarları'),
      pageTitle: t('google_drive_yapilandirma', 'Google Drive Yapılandırması'),
      subtitleLeft: t('google_drive_aciklama', 'Google Drive OAuth 2.0 API Entegrasyonu'),
      clientIdKey: 'GOOGLE_DRIVE_CLIENT_ID',
      clientSecretKey: 'GOOGLE_DRIVE_CLIENT_SECRET',
      clientIdPlaceholder: 'Örn: 123456789-abc...apps.googleusercontent.com',
      clientSecretPlaceholder: 'Örn: GOCSPX-...',
      docsUrl: 'https://console.cloud.google.com/',
      docsTitle: t('google_cloud_console', 'Google Cloud Console'),
      docsDesc: t(
        'google_cloud_console_desc',
        'API kimlik bilgileri, OAuth onay ekranı ve izin kapsamlarını yönetmek için konsola gidin.'
      ),
    };
  }, [providerKey, t]);

  useEffect(() => {
    fetchKeys();
  }, [providerConfig]);

  const fetchKeys = async () => {
    if (!adapter.getSettingByKey) return;
    try {
      setLoading(true);
      const [clientIdRes, secretRes] = await Promise.all([
        adapter.getSettingByKey(providerConfig.clientIdKey).catch(() => null),
        adapter.getSettingByKey(providerConfig.clientSecretKey).catch(() => null),
      ]);

      setClientId(clientIdRes?.deger || '');
      setClientSecret(secretRes?.deger || '');
    } catch (error) {
      console.error('Bulut ayarları çekilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/bulut-depolama');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!adapter.saveSettingByKey) return;

    const valResult = validateCredentials(clientId, clientSecret);
    if (!valResult.isValid) {
      notify('error', valResult.message || 'Lütfen zorunlu alanları doldurun.');
      return;
    }

    try {
      setSaving(true);
      await Promise.all([
        adapter.saveSettingByKey(providerConfig.clientIdKey, {
          deger: clientId.trim(),
          aciklama: `${providerConfig.name} Client ID`,
        }),
        adapter.saveSettingByKey(providerConfig.clientSecretKey, {
          deger: clientSecret.trim(),
          aciklama: `${providerConfig.name} Client Secret`,
        }),
      ]);

      notify(
        'success',
        t('bulut_ayarlari_kaydedildi', '{{name}} ayarları başarıyla kaydedildi', { name: providerConfig.name })
      );
      handleClose();
    } catch (error: any) {
      notify('error', error?.message || t('ayarlar_kaydedilirken_hata', 'Ayarlar kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = Boolean(clientId.trim() && clientSecret.trim());

  const statusBadge = (
    <div className="flex items-center">
      {isConfigured ? (
        <span className="bulut-badge bulut-badge-active">
          <CheckCircle2 size={12} />
          <span>{t('yapilandirildi', 'Yapılandırıldı')}</span>
        </span>
      ) : (
        <span className="bulut-badge bulut-badge-pending">
          <AlertCircle size={12} />
          <span>{t('yapilandirma_bekleniyor', 'Yapılandırma Bekleniyor')}</span>
        </span>
      )}
    </div>
  );

  const tabs = useMemo(
    () => [
      {
        id: 'credentials',
        label: t('api_kimlik_bilgileri', 'API & Kimlik Doğrulama'),
        icon: <Key size={16} />,
        content: (
          <div className="bulut-edit-wrapper">
            <div className="bulut-edit-info-box">
              <Key size={18} className="bulut-edit-info-icon" />
              <div>
                {t(
                  'bulut_guvenlik_bilgi_notu',
                  'Client ID ve Client Secret bilgileri sistem genelinde şifrelenmiş olarak saklanır. Kullanıcılar şirket içi belgelerini depolarken bu entegrasyonu kullanacaktır.'
                )}
              </div>
            </div>

            <BaseCard variant="elevated" className="bulut-edit-fields-card">
              <div className="bulut-field-group">
                <label className="bulut-field-label">
                  <Key size={15} />
                  <span>{t('client_id', 'Client ID')}</span>
                </label>
                <BasitInput
                  type="text"
                  textTransform="none"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder={providerConfig.clientIdPlaceholder}
                  className="font-mono"
                />
              </div>

              <div className="bulut-field-group">
                <label className="bulut-field-label">
                  <Key size={15} />
                  <span>{t('client_secret', 'Client Secret')}</span>
                </label>
                <div className="bulut-secret-input-wrapper">
                  <BasitInput
                    type={showSecret ? 'text' : 'password'}
                    textTransform="none"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={providerConfig.clientSecretPlaceholder}
                    className="font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="bulut-toggle-eye-btn"
                    title={showSecret ? t('gizle', 'Gizle') : t('goster', 'Göster')}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </BaseCard>
          </div>
        ),
      },
      {
        id: 'guide',
        label: t('entegrasyon_rehberi', 'Entegrasyon Rehberi'),
        icon: <BookOpen size={16} />,
        content: (
          <div className="bulut-edit-wrapper">
            <div className="bulut-docs-card">
              <div className="bulut-docs-info">
                <h4 className="bulut-docs-title">{providerConfig.docsTitle}</h4>
                <p className="bulut-docs-desc">{providerConfig.docsDesc}</p>
              </div>
              <a href={providerConfig.docsUrl} target="_blank" rel="noreferrer" className="bulut-console-link">
                <ExternalLink size={16} />
                <span>{t('konsolu_ac', 'Konsolu Aç')}</span>
              </a>
            </div>

            <BaseCard variant="elevated" className="bulut-edit-fields-card">
              <h4 className="font-semibold text-14 text-primary mb-12">
                {t('yapilandirma_adimlari', 'Adım Adım Yapılandırma:')}
              </h4>
              <ol className="bulut-step-list">
                <li>
                  <strong>{t('adim_1', '1. Adım:')}</strong> {providerConfig.docsTitle}{' '}
                  {t('konsoluna_giris_yapin', 'adresine gidip yetkili hesabınızla oturum açın.')}
                </li>
                <li>
                  <strong>{t('adim_2', '2. Adım:')}</strong>{' '}
                  {t('yeni_uygulama_olusturun', 'Yeni bir uygulama/proje kaydı oluşturun veya mevcut projenizi seçin.')}
                </li>
                <li>
                  <strong>{t('adim_3', '3. Adım:')}</strong>{' '}
                  {t('oauth_credentials_alin', 'OAuth 2.0 kimlik bilgileri (Client ID ve Client Secret) üretin.')}
                </li>
                <li>
                  <strong>{t('adim_4', '4. Adım:')}</strong>{' '}
                  {t('anahtarlari_girip_kaydedin', 'Üretilen anahtarları bu sayfadaki API alanlarına yapıştırıp kaydedin.')}
                </li>
              </ol>
            </BaseCard>
          </div>
        ),
      },
    ],
    [clientId, clientSecret, showSecret, providerConfig, t]
  );

  if (loading) {
    return (
      <div className="glass-card loading-state flex flex-col items-center justify-center p-48">
        <RefreshCcw size={36} className="spinning loading-icon mb-12 text-secondary" />
        <p className="text-secondary">{t('yukleniyor', 'Yükleniyor...')}</p>
      </div>
    );
  }

  return (
    <BaseCardPage
      id="bulutDepolamaKarti"
      title={providerConfig.title}
      pageTitle={providerConfig.pageTitle}
      icon={<Cloud size={20} />}
      subtitleLeft={providerConfig.subtitleLeft}
      subtitleRight={statusBadge}
      showBackButton={true}
      onClose={handleClose}
      onSave={handleSave}
      isSaving={saving}
      saveButtonText={t('ayarlari_kaydet', 'Ayarları Kaydet')}
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={(id) => setActiveTabId(String(id))}
      asForm={false}
      className="fade-in"
    />
  );
};

export default BulutDepolamaKarti;
