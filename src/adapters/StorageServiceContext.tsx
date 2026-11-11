/**
 * @akalin/file_manager_module - Servis Adaptörleri ve React Context (StorageServiceContext.tsx)
 * REST ve LocalStorage adaptörlerini içerir; monolitik bağımlılıkları tamamen soyutlar.
 */

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import {
  CloudFileItem,
  CloudFolderItem,
  CreateFolderParams,
  GetFilesParams,
  GetFoldersParams,
  IStorageServiceAdapter,
  RagConvertResultDTO,
  RagSyncAllResultDTO,
  SettingKeyValueDTO,
  ShowAlertFn,
  StorageIntegrationDTO,
  UploadFileParams,
} from '../types';
import { DEFAULT_SAMPLE_INTEGRATIONS } from '../defaults/defaultProviders';

export const DEFAULT_STORAGE_TOKEN_KEYS = ['token', 'admin_token'];

const KNOWN_DOCUMENT_FOLDER_TYPES: Array<{ canonical: string; patterns: string[] }> = [
  {
    canonical: 'BshFiyatFarki',
    patterns: [
      'bshfiyatfarki',
      'bsh-fiyat-farki',
      'bsh_fiyat_farki',
      'fiyatfarki',
      'fiyat-farki',
      'fiyat_farki',
      'fiyat farkı',
      'fiyat farki',
    ],
  },
  {
    canonical: 'KampanyaBelgesi',
    patterns: ['kampanyabelgesi', 'kampanya-belgesi', 'kampanya_belgesi', '/kampanyalar', 'kampanya'],
  },
  {
    canonical: 'FiyatListesi',
    patterns: ['fiyatlistesi', 'fiyat-listesi', 'fiyat_listesi', '/fiyat-listeleri', 'fiyat listesi'],
  },
  {
    canonical: 'AlinanSiparisIade',
    patterns: ['alinansiparisiade', 'alinan-siparis-iade', '/siparisler/alinan-iade'],
  },
  {
    canonical: 'VerilenSiparisIade',
    patterns: ['verilensiparisiade', 'verilen-siparis-iade', '/siparisler/verilen-iade'],
  },
  {
    canonical: 'AlinanSiparis',
    patterns: ['alinansiparis', 'alinan-siparis', '/siparisler/alinan', 'sicak-satis', 'soguk-satis'],
  },
  {
    canonical: 'VerilenSiparis',
    patterns: ['verilensiparis', 'verilen-siparis', '/siparisler/verilen', 'satinalma-siparis'],
  },
  {
    canonical: 'IrsaliyeliFatura',
    patterns: ['irsaliyelifatura', 'irsaliyeli-fatura'],
  },
  {
    canonical: 'Fatura',
    patterns: ['/faturalar', 'fatura'],
  },
  {
    canonical: 'Irsaliye',
    patterns: ['/irsaliyeler', 'irsaliye'],
  },
  {
    canonical: 'DepoGiris',
    patterns: ['depogiris', 'depo-giris', '/depo/giris'],
  },
  {
    canonical: 'DepoCikis',
    patterns: ['depocikis', 'depo-cikis', '/depo/cikis'],
  },
  {
    canonical: 'PaketVeSet',
    patterns: ['paketveset', 'paket-ve-set', '/paket-ve-setler'],
  },
  {
    canonical: 'PosKomisyonBelgesi',
    patterns: ['poskomisyonbelgesi', 'pos-komisyon', '/pos-komisyon'],
  },
  {
    canonical: 'Cari',
    patterns: ['/cariler', 'carikart', 'cari-kart'],
  },
  {
    canonical: 'Urun',
    patterns: ['/urun-ve-hizmetler', '/urunler', 'urunkart', 'urun-kart'],
  },
];

const IGNORED_GENERIC_DOC_TYPES = new Set([
  'form',
  'belge',
  'kart',
  'dosya-ice-aktar-karti',
  'dosya-disa-aktar-karti',
  'bulut-dosyalari-karti',
  'excel-import',
  'file-import',
  'dosya-al',
  'bulut-dosyalari',
]);

function matchCanonicalDocumentType(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (IGNORED_GENERIC_DOC_TYPES.has(lower)) return undefined;

  for (const item of KNOWN_DOCUMENT_FOLDER_TYPES) {
    if (item.canonical.toLowerCase() === lower) {
      return item.canonical;
    }
  }

  for (const item of KNOWN_DOCUMENT_FOLDER_TYPES) {
    if (item.patterns.some((p) => lower.includes(p))) {
      return item.canonical;
    }
  }

  return undefined;
}

/**
 * Çağrıldığı belge, rota, location.state veya aktif AI görev akışı bağlamından
 * ilgili bulut klasörü / belge türünü (örn. "BshFiyatFarki", "FiyatListesi", "KampanyaBelgesi") çözümler.
 */
export function resolveDocumentTypeFromContext(
  explicitDocType?: string,
  pathname?: string,
  stateObj?: any
): string | undefined {
  // 1. Doğrudan verilen prop
  if (explicitDocType && typeof explicitDocType === 'string' && explicitDocType.trim()) {
    const matched = matchCanonicalDocumentType(explicitDocType);
    if (matched) return matched;
    if (!IGNORED_GENERIC_DOC_TYPES.has(explicitDocType.trim().toLowerCase())) {
      return explicitDocType.trim();
    }
  }

  // 2. location.state içerisindeki doğrudan alanlar ve rotalar
  const stateCandidates: Array<string | undefined> = [
    stateObj?.documentType,
    stateObj?.belgeTuru,
    stateObj?.varlikKodu,
    stateObj?.entityCode,
    pathname,
    stateObj?.returnRoute,
    stateObj?.fromRoute,
    stateObj?.parentRoute,
    stateObj?.initialAiData?.documentType,
    stateObj?.initialAiData?.belgeTuru,
    stateObj?.initialAiData?.returnRoute,
    stateObj?.initialAiData?.waitingEntityPayload?.returnRoute,
    stateObj?.initialAiData?.waitingEntityPayload?.sonrakiDugum?.varlikKodu,
    stateObj?.initialAiData?.waitingEntityPayload?.sonrakiDugum?.VarlikKodu,
    stateObj?.initialAiData?.waitingEntityPayload?.varlikKodu,
    stateObj?.initialAiData?.waitingEntityPayload?.entityType,
    stateObj?.initialAiData?.waitingEntityPayload?.workflowTitle,
    stateObj?.initialAiData?.waitingEntityPayload?.workflowPrompt,
    stateObj?.initialAiData?.waitingEntityPayload?.nodePrompt,
    stateObj?.aiNode?.varlikKodu,
    stateObj?.aiWorkflow?.baslik,
    stateObj?.aiWorkflow?.prompt,
  ];

  for (const candidate of stateCandidates) {
    const matched = matchCanonicalDocumentType(candidate);
    if (matched) return matched;
  }

  // 3. sessionStorage üzerindeki aktif AI görev akışı (webakus_ai_waiting_entity)
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      const waitingRaw = sessionStorage.getItem('webakus_ai_waiting_entity');
      if (waitingRaw) {
        const parsed = JSON.parse(waitingRaw);
        const storageCandidates: Array<string | undefined> = [
          parsed?.returnRoute,
          parsed?.sonrakiDugum?.varlikKodu,
          parsed?.sonrakiDugum?.VarlikKodu,
          parsed?.varlikKodu,
          parsed?.entityType,
          parsed?.workflowTitle,
          parsed?.workflowPrompt,
          parsed?.nodePrompt,
        ];
        for (const candidate of storageCandidates) {
          const matched = matchCanonicalDocumentType(candidate);
          if (matched) return matched;
        }
      }
    } catch {
      // sessionStorage parse hatası yoksayılır
    }
  }

  return undefined;
}

function normalizeCloudFolderItem(f: any): CloudFolderItem {
  const rawChildren = f?.altKlasorler ?? f?.AltKlasorler;
  return {
    ...f,
    id: Number(f?.id ?? f?.Id ?? 0),
    klasorAdi: String(f?.klasorAdi ?? f?.KlasorAdi ?? f?.ad ?? ''),
    klasorTuru: f?.klasorTuru ?? f?.KlasorTuru,
    ustKlasorId: f?.ustKlasorId ?? f?.UstKlasorId ?? null,
    altKlasorler: Array.isArray(rawChildren) ? rawChildren.map(normalizeCloudFolderItem) : [],
  };
}

/**
 * Aktif oturuma ait JWT erişim anahtarını (Bearer token) localStorage / sessionStorage üzerinden çözümler.
 */
export function resolveStorageAuthToken(
  tokenKeys?: string[],
  customGetToken?: () => string | null
): string | null {
  if (customGetToken) {
    return customGetToken();
  }
  if (typeof window === 'undefined') return null;

  const effectiveKeys =
    tokenKeys ||
    (window.location?.port === '3002' ? ['admin_token', 'token'] : DEFAULT_STORAGE_TOKEN_KEYS);

  for (const key of effectiveKeys) {
    try {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val) return val;
    } catch {
      // Depolama erişim hatası yoksayılır
    }
  }
  return null;
}

/**
 * 1) REST Tabanlı Standart Adaptör (Webakus API uyumlu)
 */
export function createRestStorageAdapter(options?: {
  apiPrefix?: string;
  settingsPrefix?: string;
  tokenStorageKeys?: string[];
  getToken?: () => string | null;
  customHeaders?: Record<string, string> | (() => Record<string, string>);
  customFetch?: typeof fetch;
}): IStorageServiceAdapter {
  const apiPrefix = (options?.apiPrefix || '/api/Storage').replace(/\/$/, '');
  const settingsPrefix = (options?.settingsPrefix || '/api/EntegrasyonAyarlari').replace(/\/$/, '');
  const doFetch = options?.customFetch || fetch;

  const getHeaders = (extra?: Record<string, string>) => {
    const token = resolveStorageAuthToken(options?.tokenStorageKeys, options?.getToken);
    let headers: Record<string, string> = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra || {}),
    };
    if (options?.customHeaders) {
      const custom = typeof options.customHeaders === 'function' ? options.customHeaders() : options.customHeaders;
      headers = { ...headers, ...custom };
    }
    return headers;
  };

  const handleJson = async (res: Response) => {
    const rawText = await res.text();
    if (!res.ok) {
      let errText = `HTTP Error ${res.status}`;
      if (rawText) {
        try {
          const errJson = JSON.parse(rawText);
          if (typeof errJson === 'string') {
            errText = errJson;
          } else if (errJson && typeof errJson === 'object') {
            errText = errJson.message || errJson.mesaj || errJson.detail || errJson.title || rawText;
          }
        } catch {
          errText = rawText;
        }
      }
      const err = new Error(errText) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    if (!rawText) return null;
    try {
      return JSON.parse(rawText);
    } catch {
      return null;
    }
  };

  return {
    async getIntegrations(): Promise<StorageIntegrationDTO[]> {
      const res = await doFetch(`${apiPrefix}/Entegrasyonlar`, {
        headers: getHeaders(),
      });
      const raw = await handleJson(res);
      if (!Array.isArray(raw)) return [];
      return raw.map((item: any) => ({
        ...item,
        id: item.id,
        providerType: item.providerType,
        name: item.name || item.ad || item.kisaAd || '',
        email: item.email || item.eposta || '',
        isConnected: item.isConnected !== false,
        usedBytes: Number(item.usedBytes ?? 0),
        totalBytes: Number(item.totalBytes ?? 0),
      }));
    },

    async disconnectIntegration(id: number): Promise<void> {
      const res = await doFetch(`${apiPrefix}/Entegrasyonlar/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      await handleJson(res);
    },

    async getOAuthLoginUrl(provider: string, name?: string): Promise<{ url: string }> {
      const query = name ? `?name=${encodeURIComponent(name)}` : '';
      const res = await doFetch(`${apiPrefix}/oauth/${provider}/login-url${query}`, {
        headers: getHeaders(),
      });
      return await handleJson(res);
    },

    async analyzeCloudFiles(): Promise<{ mesaj?: string }> {
      const res = await doFetch(`${apiPrefix}/AnalizEt`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
      });
      return await handleJson(res);
    },

    async getFolders(params?: GetFoldersParams): Promise<CloudFolderItem[]> {
      const search = new URLSearchParams();
      if (params?.provider) search.append('provider', params.provider);
      if (params?.ustKlasorId !== undefined && params.ustKlasorId !== null) search.append('ustKlasorId', String(params.ustKlasorId));
      if (params?.belgeTuru) search.append('belgeTuru', params.belgeTuru);
      if (params?.belgeId) search.append('belgeId', String(params.belgeId));
      if (params?.belgeGuid) search.append('belgeGuid', params.belgeGuid);
      if (params?.belgeNo) search.append('belgeNo', params.belgeNo);

      const qs = search.toString();
      const res = await doFetch(`${apiPrefix}/Klasorler${qs ? `?${qs}` : ''}`, {
        headers: getHeaders(),
      });
      const raw = await handleJson(res);
      if (!Array.isArray(raw)) return [];
      return raw.map(normalizeCloudFolderItem);
    },

    async createFolder(data: CreateFolderParams): Promise<CloudFolderItem> {
      const res = await doFetch(`${apiPrefix}/Klasorler`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...data, klasorAdi: data.ad }),
      });
      return await handleJson(res);
    },

    async getFiles(params?: GetFilesParams): Promise<CloudFileItem[]> {
      const search = new URLSearchParams();
      if (params?.klasorId !== undefined && params.klasorId !== null) search.append('klasorId', String(params.klasorId));
      if (params?.provider) search.append('provider', params.provider);
      if (params?.belgeTuru) search.append('belgeTuru', params.belgeTuru);
      if (params?.belgeId) search.append('belgeId', String(params.belgeId));
      if (params?.belgeGuid) search.append('belgeGuid', params.belgeGuid);
      if (params?.belgeNo) search.append('belgeNo', params.belgeNo);
      if (params?.arama) search.append('arama', params.arama);
      if (params?.isAttachedOnly) search.append('sadeceBelgelereEkli', 'true');

      const qs = search.toString();
      const res = await doFetch(`${apiPrefix}/Dosyalar${qs ? `?${qs}` : ''}`, {
        headers: getHeaders(),
      });
      const raw = await handleJson(res);
      if (!Array.isArray(raw)) return [];
      return raw.map((f: any) => ({
        ...f,
        id: f.id,
        dosyaAdi: f.dosyaAdi,
        boyut: Number(f.boyut ?? f.dosyaBoyutu ?? 0),
        contentType: f.contentType ?? f.dosyaTipi,
        dosyaUrl: f.dosyaUrl ?? f.bulutDosyaUrl,
        yuklemeTarihi: f.yuklemeTarihi ?? f.olusturulmaTarihi,
        provider: f.provider,
        klasorId: f.klasorId ?? f.bulutKlasorId ?? null,
        ragDestekleniyorMu: f.ragDestekleniyorMu !== undefined ? Boolean(f.ragDestekleniyorMu) : undefined,
        ragAktarildiMi: Boolean(f.ragAktarildiMi),
        ragParcaSayisi: Number(f.ragParcaSayisi ?? 0),
        ragSayfaSayisi: Number(f.ragSayfaSayisi ?? 0),
        ragTokenSayisi: Number(f.ragTokenSayisi ?? 0),
        ragGuncellenmeTarihi: f.ragGuncellenmeTarihi,
        ragDocId: f.ragDocId,
      }));
    },

    async uploadFile(
      data: UploadFileParams,
      onProgress?: (percent: number, loaded: number, total: number) => void,
      signal?: AbortSignal
    ): Promise<{ dosya: CloudFileItem; mesaj?: string }> {
      const formData = new FormData();
      formData.append('dosya', data.dosya);
      formData.append('provider', data.provider);
      if (data.klasorId) formData.append('klasorId', String(data.klasorId));
      if (data.belgeTuru) formData.append('belgeTuru', data.belgeTuru);
      if (data.belgeId) formData.append('belgeId', String(data.belgeId));
      if (data.belgeGuid) formData.append('belgeGuid', data.belgeGuid);
      if (data.belgeNo) formData.append('belgeNo', data.belgeNo);

      // Tarayıcı ortamında XMLHttpRequest kullanarak anlık yükleme ilerlemesini (upload progress) takip edelim
      if (typeof XMLHttpRequest !== 'undefined') {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${apiPrefix}/Upload`, true);

          const headers = getHeaders();
          Object.entries(headers).forEach(([k, v]) => {
            if (k.toLowerCase() !== 'content-type') {
              xhr.setRequestHeader(k, v);
            }
          });

          if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable && e.total > 0) {
                const percent = Math.round((e.loaded * 100) / e.total);
                onProgress(percent, e.loaded, e.total);
              }
            };
          }

          if (signal) {
            signal.addEventListener('abort', () => {
              xhr.abort();
              const cancelErr = new Error('Yükleme işlemi iptal edildi.');
              (cancelErr as any).isCancel = true;
              reject(cancelErr);
            });
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const parsed = JSON.parse(xhr.responseText);
                resolve(parsed);
              } catch {
                resolve({ dosya: {} as any, mesaj: 'Yüklendi' });
              }
            } else {
              let msg = `Yükleme hatası (${xhr.status})`;
              try {
                const errJson = JSON.parse(xhr.responseText);
                msg = errJson.message || errJson.mesaj || msg;
              } catch { }
              reject(new Error(msg));
            }
          };

          xhr.onerror = () => reject(new Error('Ağ hatası oluştu.'));
          xhr.send(formData);
        });
      }

      // Node veya Fetch alternatifi
      const res = await doFetch(`${apiPrefix}/Upload`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
        signal,
      });
      return await handleJson(res);
    },

    async downloadFile(id: number): Promise<ArrayBuffer> {
      const res = await doFetch(`${apiPrefix}/Download/${id}`, {
        method: 'GET',
        headers: getHeaders({ Accept: '*/*' }),
      });
      if (!res.ok) {
        let errText = `HTTP Error ${res.status}`;
        try {
          const errJson = await res.json();
          errText = errJson.message || errJson.mesaj || JSON.stringify(errJson);
        } catch { }
        throw new Error(errText);
      }
      return await res.arrayBuffer();
    },

    async renameFile(id: number, yeniAd: string): Promise<CloudFileItem> {
      const res = await doFetch(`${apiPrefix}/Dosyalar/${id}/Rename`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ yeniAd }),
      });
      return await handleJson(res);
    },

    async deleteFile(id: number): Promise<void> {
      const res = await doFetch(`${apiPrefix}/Dosyalar/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      await handleJson(res);
    },

    async convertFileToRag(id: number): Promise<RagConvertResultDTO> {
      const res = await doFetch(`${apiPrefix}/Dosyalar/${id}/RagAktar`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
      });
      return await handleJson(res);
    },

    async syncAllFilesToRag(): Promise<RagSyncAllResultDTO> {
      const res = await doFetch(`${apiPrefix}/Dosyalar/RagEsitle`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
      });
      return await handleJson(res);
    },

    async getSettingByKey(key: string): Promise<SettingKeyValueDTO | null> {
      try {
        const res = await doFetch(`${settingsPrefix}/by-key/${encodeURIComponent(key)}`, {
          headers: getHeaders(),
        });
        if (!res.ok) return null;
        return await handleJson(res);
      } catch {
        return null;
      }
    },

    async saveSettingByKey(key: string, data: SettingKeyValueDTO): Promise<void> {
      const res = await doFetch(`${settingsPrefix}/by-key/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      await handleJson(res);
    },
  };
}

/**
 * 2) LocalStorage / Bellek Tabanlı Bağımsız Test Adaptörü
 */
export function createLocalStorageStorageAdapter(options?: {
  storagePrefix?: string;
  defaultIntegrations?: StorageIntegrationDTO[];
}): IStorageServiceAdapter {
  const prefix = options?.storagePrefix || 'akalin_storage_';
  let integrations: StorageIntegrationDTO[] = options?.defaultIntegrations || [...DEFAULT_SAMPLE_INTEGRATIONS];
  let folders: CloudFolderItem[] = [
    {
      id: 1,
      klasorAdi: 'Webakus Evrakları',
      provider: 'google',
      altKlasorler: [
        { id: 2, klasorAdi: 'Faturalar', provider: 'google', ustKlasorId: 1 },
        { id: 3, klasorAdi: 'Sözleşmeler', provider: 'google', ustKlasorId: 1 },
      ],
    },
  ];
  let files: CloudFileItem[] = [];

  return {
    async getIntegrations() {
      return [...integrations];
    },
    async disconnectIntegration(id: number) {
      integrations = integrations.filter((i) => i.id !== id);
    },
    async getOAuthLoginUrl(provider: string) {
      return { url: `#mock-login-${provider}` };
    },
    async analyzeCloudFiles() {
      return { mesaj: 'Bulut sürücüsü başarıyla tarandı ve eşitlendi (Simülasyon).' };
    },
    async getFolders() {
      return JSON.parse(JSON.stringify(folders));
    },
    async createFolder(data: CreateFolderParams) {
      const newFolder: CloudFolderItem = {
        id: Date.now(),
        klasorAdi: data.ad,
        provider: data.provider,
        ustKlasorId: data.ustKlasorId || null,
        altKlasorler: [],
      };
      if (data.ustKlasorId) {
        const findAndAdd = (list: CloudFolderItem[]): boolean => {
          for (const item of list) {
            if (item.id === data.ustKlasorId) {
              item.altKlasorler = item.altKlasorler || [];
              item.altKlasorler.push(newFolder);
              return true;
            }
            if (item.altKlasorler && findAndAdd(item.altKlasorler)) return true;
          }
          return false;
        };
        findAndAdd(folders);
      } else {
        folders.push(newFolder);
      }
      return newFolder;
    },
    async getFiles(params?: GetFilesParams) {
      return files.filter((f) => {
        if (params?.klasorId && f.klasorId !== params.klasorId) return false;
        if (params?.arama && !f.dosyaAdi.toLowerCase().includes(params.arama.toLowerCase())) return false;
        if (params?.isAttachedOnly && params?.belgeGuid && f.belgeGuid !== params.belgeGuid) return false;
        return true;
      });
    },
    async uploadFile(data: UploadFileParams, onProgress?: (p: number, l: number, t: number) => void) {
      if (onProgress) {
        onProgress(50, data.dosya.size / 2, data.dosya.size);
        setTimeout(() => onProgress(100, data.dosya.size, data.dosya.size), 100);
      }
      const newFile: CloudFileItem = {
        id: Date.now(),
        dosyaAdi: data.dosya.name,
        boyut: data.dosya.size,
        contentType: data.dosya.type,
        provider: data.provider,
        klasorId: data.klasorId || null,
        belgeTuru: data.belgeTuru,
        belgeId: data.belgeId,
        belgeGuid: data.belgeGuid,
        belgeNo: data.belgeNo,
        yuklemeTarihi: new Date().toISOString(),
      };
      files.push(newFile);
      return { dosya: newFile, mesaj: 'Dosya başarıyla yüklendi.' };
    },
    async renameFile(id: number, yeniAd: string) {
      const file = files.find((f) => f.id === id);
      if (!file) throw new Error('Dosya bulunamadı');
      file.dosyaAdi = yeniAd;
      return { ...file };
    },
    async deleteFile(id: number) {
      files = files.filter((f) => f.id !== id);
    },
    async convertFileToRag(id: number): Promise<RagConvertResultDTO> {
      const file = files.find((f) => f.id === id);
      if (file) {
        file.ragAktarildiMi = true;
        file.ragParcaSayisi = 12;
        file.ragSayfaSayisi = 1;
        file.ragTokenSayisi = 1850;
      }
      return {
        success: true,
        mesaj: 'Dosya başarıyla RAG veritabanına aktarıldı.',
        ragAktarildiMi: true,
        ragSayfaSayisi: 1,
        ragParcaSayisi: 12,
        ragTokenSayisi: 1850,
      };
    },
    async syncAllFilesToRag(): Promise<RagSyncAllResultDTO> {
      let count = 0;
      files.forEach((f) => {
        if (!f.ragAktarildiMi) {
          f.ragAktarildiMi = true;
          f.ragParcaSayisi = 8;
          count++;
        }
      });
      return {
        success: true,
        indexedCount: count,
        removedCount: 0,
        mesaj: `${count} dosya RAG veritabanına aktarıldı.`,
      };
    },
    async getSettingByKey(key: string) {
      try {
        const val = localStorage.getItem(`${prefix}${key}`);
        return val ? { deger: val } : null;
      } catch {
        return null;
      }
    },
    async saveSettingByKey(key: string, data: SettingKeyValueDTO) {
      try {
        if (data.deger) {
          localStorage.setItem(`${prefix}${key}`, data.deger);
        } else {
          localStorage.removeItem(`${prefix}${key}`);
        }
      } catch { }
    },
  };
}

/**
 * 3) Storage Context & Provider
 */
export interface StorageModuleContextValue {
  adapter: IStorageServiceAdapter;
  appName: string;
  baseRoute: string;
  onNotify?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  showAlert: ShowAlertFn;
}

export const StorageModuleContext = createContext<StorageModuleContextValue | null>(null);

let globalStorageModuleConfig: StorageModuleContextValue | null = null;

export function setGlobalStorageModuleConfig(config: StorageModuleContextValue) {
  globalStorageModuleConfig = config;
}

export function getGlobalStorageModuleConfig(): StorageModuleContextValue | null {
  return globalStorageModuleConfig;
}

export interface StorageModuleProviderProps {
  adapter?: IStorageServiceAdapter;
  appName?: string;
  baseRoute?: string;
  onNotify?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  showAlert?: ShowAlertFn;
  children: ReactNode;
}

export const StorageModuleProvider: React.FC<StorageModuleProviderProps> = ({
  adapter,
  appName = 'Webakus ERP',
  baseRoute = '/araclar/bulut-dosyalari',
  onNotify,
  showAlert: customShowAlert,
  children,
}) => {
  const activeAdapter = adapter || globalStorageModuleConfig?.adapter || createRestStorageAdapter();

  const defaultShowAlert: ShowAlertFn = useCallback(
    (type, title, message, onConfirm, confirmText = 'Tamam', cancelText = 'İptal') => {
      if (customShowAlert) {
        customShowAlert(type, title, message, onConfirm, confirmText, cancelText);
        return;
      }
      if (globalStorageModuleConfig?.showAlert) {
        globalStorageModuleConfig.showAlert(type, title, message, onConfirm, confirmText, cancelText);
        return;
      }

      if (type === 'confirm') {
        const ok = window.confirm(`${title}\n\n${message}`);
        if (ok && onConfirm) onConfirm();
      } else {
        window.alert(`${title}\n\n${message}`);
        if (onConfirm) onConfirm();
      }
    },
    [customShowAlert]
  );

  const value: StorageModuleContextValue = {
    adapter: activeAdapter,
    appName,
    baseRoute,
    onNotify: onNotify || globalStorageModuleConfig?.onNotify,
    showAlert: defaultShowAlert,
  };

  return <StorageModuleContext.Provider value={value}>{children}</StorageModuleContext.Provider>;
};

export function useStorageModule(): StorageModuleContextValue {
  const ctx = useContext(StorageModuleContext);
  if (ctx) return ctx;
  if (globalStorageModuleConfig) return globalStorageModuleConfig;

  // Güvenli varsayılan değer
  return {
    adapter: createRestStorageAdapter(),
    appName: 'Webakus ERP',
    baseRoute: '/araclar/bulut-dosyalari',
    showAlert: (type, title, message, onConfirm) => {
      if (type === 'confirm') {
        if (window.confirm(`${title}\n\n${message}`) && onConfirm) onConfirm();
      } else {
        window.alert(`${title}\n\n${message}`);
        if (onConfirm) onConfirm();
      }
    },
  };
}

export const useFileManagerModule = useStorageModule;
export const FileManagerModuleProvider = StorageModuleProvider;
export const createRestFileManagerAdapter = createRestStorageAdapter;
export const createLocalStorageFileManagerAdapter = createLocalStorageStorageAdapter;
