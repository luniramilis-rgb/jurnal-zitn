import { DEFAULT_LOCALE, resolveLocale, type AppLocale } from '@jurnal-zitn/shared';

/**
 * Locale tampilan aktif (ZITN-TECH-017 A0). Nilai diset oleh `LocaleProvider` dari
 * preferensi pengguna (`/api/users/me/locale`), lalu fallback ke localStorage/default.
 *
 * Modul ini sengaja menyimpan state sederhana (bukan React context) agar fungsi
 * formatter murni (`format.ts`, `Numeric.tsx`) dapat membacanya tanpa prop drilling;
 * re-render saat berubah ditangani `LocaleProvider` yang me-render ulang subtree.
 */
let current: AppLocale = DEFAULT_LOCALE;

export function getAppLocale(): AppLocale {
  return current;
}

export function setAppLocale(locale: unknown): void {
  current = resolveLocale(locale);
}

export type { AppLocale };
