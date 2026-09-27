import type { MessageKey } from '@jurnal-zitn/shared';

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/**
 * Peta kode galat API → kunci kamus (A5). Pesan galat server berbahasa Inggris;
 * web menampilkan salinan lokal berdasarkan kode, bukan `error.message` mentah.
 * Kode tak dikenal jatuh ke pesan generik.
 */
const ERROR_KEYS: Record<string, MessageKey> = {
  UNAUTHORIZED: 'err.unauthorized',
  FORBIDDEN: 'err.forbidden',
  VALIDATION_ERROR: 'err.validation',
  NOT_FOUND: 'err.notFound',
  INVALID_OR_EXPIRED_TOKEN: 'err.invalidToken',
  ALREADY_VERIFIED: 'err.alreadyVerified',
  EMAIL_NOT_CONFIGURED: 'err.emailNotConfigured',
  REGISTRATION_DISABLED: 'err.registrationDisabled',
  INVALID_TIMEZONE: 'err.invalidTimezone',
  RATE_LIMITED: 'auth.error.rateLimited',
};

/** Kode dari amplop galat API (`{ error: { code } }`), bila ada. */
export function apiErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const envelope = (err as { error?: { code?: string }; code?: string }).error?.code;
  return envelope ?? (err as { code?: string }).code;
}

/** Salinan galat yang ditampilkan ke pengguna, mengikuti bahasa aktif. */
export function apiErrorMessage(err: unknown, t: Translate): string {
  const code = apiErrorCode(err);
  const key = code ? ERROR_KEYS[code] : undefined;
  return t(key ?? 'auth.error.generic');
}
