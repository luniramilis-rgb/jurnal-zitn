/**
 * Tujuan redirect setelah penukaran token SSO (ZITN-TECH-017/019, ZITN-TECH-029).
 *
 * Dipisah sebagai fungsi murni supaya bisa diuji tanpa Postgres/HTTP: `GET /api/auth/sso`
 * memakainya untuk membawa **konteks tanggal** dari tautan lembar (ZITN) ke halaman konteks
 * jurnal (`/lembar?tanggal=YYYY-MM-DD`) TANPA menyentuh logika token, dan untuk menghormati
 * **`redirect`** lokal pasca-login (mis. pintu "Lanjutkan dengan ZITN").
 *
 * Prioritas: `redirect` lokal yang aman menang (niat eksplisit); bila tak ada/tak aman,
 * jatuh ke perilaku `tanggal`; bila keduanya kosong → `/`.
 */

import { safeLocalRedirect } from '@jurnal-zitn/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Target redirect: `redirect` lokal yang aman, atau `/lembar?tanggal=…`, atau `/`. */
export function ssoRedirectTarget(
  tanggal: string | undefined | null,
  redirect?: string | null,
): string {
  if (typeof redirect === 'string' && redirect.trim() !== '') {
    const safe = safeLocalRedirect(redirect, '');
    if (safe !== '') return safe;
  }
  const value = typeof tanggal === 'string' ? tanggal.trim() : '';
  return DATE_RE.test(value) ? `/lembar?tanggal=${value}` : '/';
}
