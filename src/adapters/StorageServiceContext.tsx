/**
 * @akalin/storage_module - Servis Adaptörleri ve React Context (StorageServiceContext.tsx)
 * REST ve LocalStorage adaptörlerini içerir; monolitik bağımlılıkları tamamen soyutlar.
 */

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import {
  CloudFileItem,
  CloudFolderItem,
  CreateFolderParams,
  GetFilesParams,
  GetFoldersParams,
  IStorageServiceAdapter,
  RenameFileParams,
  SettingKeyValueDTO,
  ShowAlertFn,
  StorageIntegrationDTO,
  UploadFileParams,
} from '../types';
import { DEFAULT_SAMPLE_INTEGRATIONS } from '../defaults/defaultProviders';

/**
 * 1) REST Tabanlı Standart Adaptör (Webakus API uyumlu)
 */
export function createRestStorageAdapter(options?: {
  apiPrefix?: string;
  settingsPrefix?: string;
  customHeaders?: Record<string, string> | (() => Record<string, string>);
  customFetch?: typeof fetch;
}): IStorageServiceAdapter {
  const apiPrefix = (options?.apiPrefix || '/api/Storage').replace(/\/$/, '');
  const settingsPrefix = (options?.settingsPrefix || '/api/EntegrasyonAyarlari').replace(/\/$/, '');
  const doFetch = options?.customFetch || fetch;

  const getHeaders = (extra?: Record<string, string>) => {
    let headers: Record<string, string> = {
      Accept: 'application/json',
      ...(extra || {}),
    };
    if (options?.customHeaders) {
      const custom = typeof options.customHeaders === 'function' ? options.customHeaders() : options.customHeaders;
      headers = { ...headers, ...custom };
    }
    return headers;
  };

  const handleJson = async (res: Response) => {
    if (!res.ok) {
      let errText = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errText = errJson.message || errJson.mesaj || JSON.stringify(errJson);
      } catch {
        try {
          errText = await res.text();
        } catch {}
      }
      throw new Error(errText);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  };

  return {
    async getIntegrations(): Promise<StorageIntegrationDTO[]> {
      const res = await doFetch(`${apiPrefix}/Entegrasyonlar`, {
        headers: getHeaders(),
      });
      return await handleJson(res);
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
      return await handleJson(res);
    },

    async createFolder(data: CreateFolderParams): Promise<CloudFolderItem> {
      const res = await doFetch(`${apiPrefix}/Klasorler`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
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

      const qs = search.toString();
      const res = await doFetch(`${apiPrefix}/Dosyalar${qs ? `?${qs}` : ''}`, {
        headers: getHeaders(),
      });
      return await handleJson(res);
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
              } catch {}
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
      } catch {}
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
