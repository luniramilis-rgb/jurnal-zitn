import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { resolveLocale, translate, type AppLocale, type MessageKey } from '@jurnal-zitn/shared';

import { api } from '@/lib/api';
import { getAppLocale, setAppLocale } from '@/lib/locale';

const STORAGE_KEY = 'jurnal_zitn_locale';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStored(): AppLocale {
  try {
    return resolveLocale(globalThis.localStorage?.getItem(STORAGE_KEY));
  } catch {
    return 'id';
  }
}

function writeStored(locale: AppLocale): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    /* private mode / no storage — preference simply does not persist locally */
  }
}

/**
 * Menyediakan bahasa UI aktif (ZITN-TECH-017 A0). Sumber kebenaran berurutan:
 * preferensi server (`/api/users/me/locale`) → localStorage → default `id`.
 * Mengubah bahasa juga menyetel `document.documentElement.lang` dan menyimpan ke server.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [locale, setLocaleState] = useState<AppLocale>(readStored);

  const { data } = useQuery({
    queryKey: ['users', 'me', 'locale'],
    queryFn: async () => api.get<{ locale: AppLocale }>('/users/me/locale'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Server wins when it answers (a signed-in user's stored choice).
  useEffect(() => {
    if (data?.locale) setLocaleState(resolveLocale(data.locale));
  }, [data?.locale]);

  // Set locale modul secara sinkron SELAMA render, sebelum anak-anak merender, agar
  // formatter murni (`formatCurrency` dll.) memakai bahasa baru di render yang sama.
  // Menaruhnya di useEffect membuat nilai tertinggal satu render.
  setAppLocale(locale);

  // Apply the active locale to the document + local storage on every change.
  useEffect(() => {
    document.documentElement.lang = locale;
    writeStored(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      const resolved = resolveLocale(next);
      setLocaleState(resolved);
      void api
        .put('/users/me/locale', { locale: resolved })
        .then(() => queryClient.invalidateQueries({ queryKey: ['users', 'me', 'locale'] }))
        .catch(() => {
          /* keep the local choice even if the write fails; it retries on next change */
        });
    },
    [queryClient],
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  // `key={locale}` memaksa subtree dirender ulang saat bahasa berganti. Tanpa ini,
  // React melewati render karena elemen `children` identik, sehingga formatter murni
  // (`formatCurrency` dll. yang membaca `getAppLocale()`) tidak pernah dipanggil ulang.
  return (
    <LocaleContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  );
}

/**
 * Locale aktif. Di dalam aplikasi ini berasal dari `LocaleProvider`; di luar provider
 * (mis. uji komponen yang dirender berdiri sendiri) jatuh ke locale modul sehingga
 * `setAppLocale()` dapat mengendalikannya tanpa membungkus provider.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return { locale: getAppLocale(), setLocale: (next: AppLocale) => setAppLocale(next) };
}

/** `t` yang mengikuti locale aktif dan memicu re-render saat bahasa berubah. */
export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const { locale } = useLocale();
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
}
