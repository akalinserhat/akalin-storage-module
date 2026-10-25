/**
 * @akalin/storage_module - Doğrulama Kuralları (storageValidation.ts)
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateFolderName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, message: 'Klasör adı boş olamaz.' };
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    return { isValid: false, message: 'Klasör adı en fazla 100 karakter olabilir.' };
  }
  const illegalChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (illegalChars.test(trimmed)) {
    return { isValid: false, message: 'Klasör adı geçersiz karakterler barındıramaz (< > : " / \\ | ? *).' };
  }
  return { isValid: true };
}

export function validateFileName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, message: 'Dosya adı boş olamaz.' };
  }
  const trimmed = name.trim();
  if (trimmed.length > 255) {
    return { isValid: false, message: 'Dosya adı en fazla 255 karakter olabilir.' };
  }
  const illegalChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (illegalChars.test(trimmed)) {
    return { isValid: false, message: 'Dosya adı geçersiz karakterler barındıramaz.' };
  }
  return { isValid: true };
}

export function validateCredentials(clientId: string, clientSecret: string): ValidationResult {
  if (!clientId || !clientId.trim()) {
    return { isValid: false, message: 'Client ID alanı zorunludur.' };
  }
  if (!clientSecret || !clientSecret.trim()) {
    return { isValid: false, message: 'Client Secret alanı zorunludur.' };
  }
  return { isValid: true };
}
