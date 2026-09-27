import { describe, expect, it } from 'vitest';

import {
  catalogsComplete,
  DEFAULT_LOCALE,
  MESSAGES,
  resolveLocale,
  SUPPORTED_LOCALES,
  translate,
} from './i18n';

describe('i18n — locale dasar', () => {
  it('mendukung id & en dengan default id', () => {
    expect(SUPPORTED_LOCALES).toEqual(['id', 'en']);
    expect(DEFAULT_LOCALE).toBe('id');
  });

  it('resolveLocale menormalkan nilai tak dikenal ke default', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('id')).toBe('id');
    expect(resolveLocale('fr')).toBe('id');
    expect(resolveLocale(null)).toBe('id');
    expect(resolveLocale(undefined)).toBe('id');
  });
});

describe('i18n — translate', () => {
  it('menerjemahkan per locale', () => {
    expect(translate('id', 'time.justNow')).toBe('baru saja');
    expect(translate('en', 'time.justNow')).toBe('just now');
  });

  it('mengganti variabel', () => {
    expect(translate('id', 'time.minutesAgo', { n: 5 })).toBe('5 mnt lalu');
    expect(translate('en', 'time.hoursAgo', { n: 3 })).toBe('3h ago');
  });

  it('fallback ke default untuk locale tak dikenal', () => {
    expect(translate('fr', 'time.yesterday')).toBe('kemarin');
  });
});

describe('i18n — kelengkapan kamus', () => {
  it('kunci id dan en identik', () => {
    expect(catalogsComplete()).toBe(true);
  });

  it('tidak ada nilai kosong di kedua kamus', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of Object.keys(MESSAGES[locale]) as (keyof typeof MESSAGES.id)[]) {
        expect(MESSAGES[locale][key].length).toBeGreaterThan(0);
      }
    }
  });
});
