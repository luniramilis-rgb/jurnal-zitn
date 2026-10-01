import { describe, expect, it } from 'vitest';

import {
  catalogsComplete,
  DEFAULT_LOCALE,
  formatDate,
  formatNumber,
  MESSAGES,
  resolveLocale,
  SUPPORTED_LOCALES,
  translate,
} from './i18n';

describe('i18n — locale dasar', () => {
  it('mendukung id & en', () => {
    expect(SUPPORTED_LOCALES).toEqual(['id', 'en']);
  });

  it("default tetap 'id' — pasar utama (ZITN-TECH-021 §6, keputusan pemilik B1)", () => {
    // Gate bahasa TIDAK dilakukan dengan menahan default di 'en' (ditolak: `users.locale` kosong
    // untuk semua pengguna sehingga permukaan sebelum-masuk & email tampil EN bagi pengguna ID).
    // Pengguna ber-bahasa Inggris mendapat 'en' lewat penyemian sekali `detectBrowserLocale()`
    // di `apps/web/src/hooks/useLocale.tsx`. Yang bergerak selama tinjauan adalah status `sah`
    // per rute, bukan default bahasa.
    expect(DEFAULT_LOCALE).toBe('id');
  });

  it('resolveLocale menormalkan nilai tak dikenal ke default', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('id')).toBe('id');
    expect(resolveLocale('fr')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
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
    expect(translate('fr', 'time.yesterday')).toBe(MESSAGES[DEFAULT_LOCALE]['time.yesterday']);
  });
});

describe('i18n — format nilai kanonik (rubrik R13)', () => {
  it('formatNumber memakai pemisah desimal per locale', () => {
    expect(formatNumber('0.1', 'id')).toBe('0,1');
    expect(formatNumber('0.1', 'en')).toBe('0.1');
  });

  it('formatDate memformat ISO date-saja per locale (UTC, tanpa geser hari)', () => {
    expect(formatDate('2026-01-01', 'en')).toContain('2026');
    expect(formatDate('2026-01-01', 'en')).not.toBe('2026-01-01');
    expect(formatDate('2026-01-01', 'id')).toContain('2026');
  });

  it('kunci pajak ber-placeholder {rate} di kedua kamus', () => {
    for (const key of ['tax.pphTitle', 'tax.pphNote', 'tax.disc.recID'] as const) {
      expect(MESSAGES.id[key], `id ${key}`).toContain('{rate}');
      expect(MESSAGES.en[key], `en ${key}`).toContain('{rate}');
    }
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
