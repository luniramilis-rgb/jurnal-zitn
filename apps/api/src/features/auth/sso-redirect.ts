/**
 * Tujuan redirect setelah penukaran token SSO (ZITN-TECH-017/019).
 *
 * Dipisah sebagai fungsi murni supaya bisa diuji tanpa Postgres/HTTP: `GET /api/auth/sso`
 * memakainya untuk membawa **konteks tanggal** dari tautan lembar (ZITN) ke halaman konteks
 * jurnal (`/lembar?tanggal=YYYY-MM-DD`) tanpa menyentuh logika token.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `/lembar?tanggal=…` bila tanggal sah, selain itu `/` (input tak sah diabaikan, bukan error). */
export function ssoRedirectTarget(tanggal: string | undefined | null): string {
  const value = typeof tanggal === 'string' ? tanggal.trim() : '';
  return DATE_RE.test(value) ? `/lembar?tanggal=${value}` : '/';
}
