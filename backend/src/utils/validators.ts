import { AppError } from './errors';

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function requireFields(obj: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(f => !obj[f]);
  if (missing.length > 0) {
    throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400);
  }
}

export function validateFileSize(sizeBytes: number, maxMB: number = 10): void {
  if (sizeBytes > maxMB * 1024 * 1024) {
    throw new AppError(`File too large. Maximum size is ${maxMB}MB.`, 400);
  }
}

export function sanitizeText(text: string, maxLength: number = 50000): string {
  return text.replace(/\0/g, '').substring(0, maxLength).trim();
}
