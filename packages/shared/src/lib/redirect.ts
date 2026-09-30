/**
 * Tujuan redirect lokal yang aman (ZITN-TECH-029).
 *
 * Dipakai di **dua sisi**: setelah login sandi di web (`login.tsx`) dan pada penukaran
 * token SSO di server (`apps/api/.../sso-redirect.ts`), supaya hanya ada SATU aturan.
 *
 * Kontrak: kembalikan `raw` hanya bila ia **path lokal absolut** yang aman; selain itu
 * `fallback`. Yang ditolak: nilai apa pun tanpa awalan `/`, skema/port (`:` di mana pun),
 * protocol-relative (`//`, `/\`), dan kontrol karakter. Decode sekali lagi untuk menangkap
 * trik `%2F%2F`/`%3A` tanpa menerima nilai aneh.
 */
export function safeLocalRedirect(raw: unknown, fallback = '/dashboard'): string {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (value === '') return fallback;

  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes(':')) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  // Satu pass decode defensif: menangkap `%2F%2Fevil`, `%3A`, dsb. yang diselundupkan
  // lewat nilai non-decoded. Decode gagal (mis. `%`) ⇒ tolak.
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) {
        return fallback;
      }
      if (decoded.includes(':')) return fallback;
      if (/[\u0000-\u001F\u007F]/.test(decoded)) return fallback;
    }
  } catch {
    return fallback;
  }

  return value;
}
