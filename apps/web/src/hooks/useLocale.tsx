import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import {
  MESSAGES,
  resolveLocale,
  translate,
  type AppLocale,
  type MessageKey,
} from '@jurnal-zitn/shared';

import { api } from '@/lib/api';
import { detectBrowserLocale } from '@/lib/browserLocale';
import { getAppLocale, setAppLocale } from '@/lib/locale';
import { useEventBusSubscribe } from '@/stores/event-bus.store';

declare global {
  interface ImportMetaEnv {
    readonly DEV?: boolean;
    readonly VITE_I18N_DEBUG?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/**
 * Overlay tinjau dev (ZITN-TECH-021 §5.4). Aktif hanya bila `VITE_I18N_DEBUG=1`
 * pada build dev: menandai string yang jatuh ke fallback locale dan kalimat yang
 * `id === en` (kandidat belum diterjemahkan), agar peninjau menilai terjemahan,
 * bukan mencari string mentah. Tidak berpengaruh pada produksi/uji.
 */
const I18N_DEBUG = import.meta.env.DEV === true && import.meta.env.VITE_I18N_DEBUG === '1';

function markDebug(locale: AppLocale, key: MessageKey, value: string): string {
  if (!I18N_DEBUG) return value;
  const markers: string[] = [];
  const activeCatalog = MESSAGES[locale] as Record<string, string | undefined>;
  if (activeCatalog[key] === undefined) markers.push('fallback');
  if (
    MESSAGES.id[key] === MESSAGES.en[key] &&
    MESSAGES.id[key].trim().split(/\s+/).filter(Boolean).length >= 3
  ) {
    markers.push('id=en');
  }
  return markers.length === 0 ? value : `${value} ⟦${markers.join(',')}⟧`;
}

const STORAGE_KEY = 'jurnal_zitn_locale';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStored(): AppLocale {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === 'id' || stored === 'en') return stored;
  } catch {
    /* private mode / no storage — fall through to the product default */
  }
  // The first paint has no session to ask yet, so signed-out pages keep the
  // product default `id`. The browser preference applies on the authenticated
  // path only: the server flags a never-chosen row `stored: false` and the
  // one-time seed below persists the language the browser reports.
  return 'id';
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
  // One-time guard for the browser-language seed. A boolean, not the result
  // object: keying on identity would re-seed on every refetch (a PUT invalidates
  // the query), and a server that kept answering `stored: false` would loop. The
  // guard is re-armed on a session teardown so the next user is seeded too.
  const seedDone = useRef(false);
  const [seedEpoch, setSeedEpoch] = useState(0);

  // `clearClientSessionState` clears the cache and announces the teardown, so the
  // next user on this tab — whose row may also be `stored: false` — is seeded.
  const resetSeed = useCallback(() => {
    seedDone.current = false;
    setSeedEpoch((epoch) => epoch + 1);
  }, []);
  useEventBusSubscribe('auth:logout', resetSeed);

  const { data } = useQuery({
    queryKey: ['users', 'me', 'locale'],
    queryFn: async () => api.get<{ locale: AppLocale; stored: boolean }>('/users/me/locale'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Server wins when it answers a STORED choice. A `stored: false` answer is the
  // server's substituted default (`id`), not a choice, so applying it here would
  // flash that default over the browser preference the seed is about to persist.
  useEffect(() => {
    if (data?.stored === false) return;
    if (data?.locale) setLocaleState(resolveLocale(data.locale));
  }, [data?.locale, data?.stored]);

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

  // One-time seed of a row whose language was never chosen (ZITN-TECH-017 A0):
  // the server substitutes DEFAULT_LOCALE ('id') and flags `stored: false`, so
  // the first authenticated load stores the language the browser already
  // reports. Mirrors useReportingTimezoneBackfill: once per session (`seedEpoch`
  // re-arms it), never overwrites a stored choice, silent on failure, and
  // skipped when the browser reports nothing we support. Also skipped when
  // detection already equals the resolved default, so an Indonesian browser
  // never writes 'id'.
  useEffect(() => {
    if (!data || data.stored !== false || seedDone.current) return;
    seedDone.current = true;

    const detected = detectBrowserLocale();
    if (detected && detected !== resolveLocale(data.locale)) setLocale(detected);
  }, [data, setLocale, seedEpoch]);

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
    (key: MessageKey, vars?: Record<string, string | number>) =>
      markDebug(locale, key, translate(locale, key, vars)),
    [locale],
  );
}
