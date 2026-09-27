// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { t } from './i18n';
import { setAppLocale } from './locale';

// Konteks uji default `en` (setup); suite ini menyasar default produk `id`.
setAppLocale('id');

describe('adapter kamus web (A0)', () => {
  afterEach(() => setAppLocale('id'));

  it('default id', () => {
    expect(t('time.justNow')).toBe('baru saja');
    expect(t('time.minutesAgo', { n: 5 })).toBe('5 mnt lalu');
  });

  it('mengikuti locale aktif', () => {
    setAppLocale('en');
    expect(t('time.justNow')).toBe('just now');
    expect(t('time.hoursAgo', { n: 3 })).toBe('3h ago');
  });
});
