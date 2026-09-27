import { translate, type MessageKey } from '@jurnal-zitn/shared';

import { getAppLocale } from './locale';

export type { MessageKey };

/**
 * Adapter web untuk kamus bersama (ZITN-TECH-017 A0). Membaca locale aktif dari
 * `locale.ts` (diset `LocaleProvider`), sehingga komponen dapat memakai `t('key')`
 * tanpa meneruskan locale. Untuk komponen yang perlu ikut re-render saat bahasa
 * berubah, gunakan `useT()` dari `hooks/useLocale`.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(getAppLocale(), key, vars);
}
