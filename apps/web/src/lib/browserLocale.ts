import { type AppLocale } from '@jurnal-zitn/shared';

/**
 * Deteksi bahasa UI dari browser untuk penyemian sekali (ZITN-TECH-017 A0).
 *
 * `navigator.language` (mis. `en-US`, `id-ID`) tidak persis sama dengan locale
 * yang didukung (`en` | `id`), jadi kami memetakan lewat prefiks bahasa utama.
 * `undefined` berarti "jangan semai" — sama seperti timezone, kami tidak pernah
 * menulis nilai yang tak dikenal; server sudah punya default `id`.
 */
export function detectBrowserLocale(): AppLocale | undefined {
  const candidates: string[] = [];
  try {
    if (typeof navigator !== 'undefined') {
      if (navigator.language) candidates.push(navigator.language);
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    }
  } catch {
    return undefined;
  }

  for (const tag of candidates) {
    const primary = tag.toLowerCase().split('-')[0];
    if (primary === 'id' || primary === 'en') return primary;
  }
  return undefined;
}
