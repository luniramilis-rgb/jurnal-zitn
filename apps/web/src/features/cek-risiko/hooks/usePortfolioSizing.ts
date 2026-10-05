import { useCallback, useEffect, useState } from 'react';

import { RISK_SLOTS_DEFAULT, RISK_WEIGHT_DEFAULT } from '../lib/risk-profile';

/**
 * Setelan sizing/slot pengguna (w×S). Default = model US terkunci
 * (`docs/analysis/us_sizing_slot_prereg.md`): w 2% · S 20. Disimpan di peramban
 * (pola config widget, tanpa migrasi). **Tanpa telemetri.**
 */
const STORAGE_KEY = 'zitn.cek-risiko.portfolio.v1';

export interface PortfolioSizing {
  /** Bobot per posisi, persen ekuitas. */
  w: number;
  /** Jumlah slot terbuka maksimum. */
  s: number;
}

export const PORTFOLIO_SIZING_DEFAULT: PortfolioSizing = {
  w: RISK_WEIGHT_DEFAULT,
  s: RISK_SLOTS_DEFAULT,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function parsePortfolioSizing(raw: string | null): PortfolioSizing {
  if (!raw) return PORTFOLIO_SIZING_DEFAULT;
  try {
    const data = JSON.parse(raw) as Partial<PortfolioSizing>;
    return {
      w: clampInt(data.w, 1, 100, PORTFOLIO_SIZING_DEFAULT.w),
      s: clampInt(data.s, 1, 100, PORTFOLIO_SIZING_DEFAULT.s),
    };
  } catch {
    return PORTFOLIO_SIZING_DEFAULT;
  }
}

function read(): PortfolioSizing {
  if (typeof window === 'undefined') return PORTFOLIO_SIZING_DEFAULT;
  try {
    return parsePortfolioSizing(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return PORTFOLIO_SIZING_DEFAULT;
  }
}

export function usePortfolioSizing(): {
  sizing: PortfolioSizing;
  setSizing: (sizing: PortfolioSizing) => void;
} {
  const [sizing, setSizingState] = useState<PortfolioSizing>(read);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setSizingState(parsePortfolioSizing(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSizing = useCallback((next: PortfolioSizing) => {
    const clean: PortfolioSizing = {
      w: clampInt(next.w, 1, 100, PORTFOLIO_SIZING_DEFAULT.w),
      s: clampInt(next.s, 1, 100, PORTFOLIO_SIZING_DEFAULT.s),
    };
    setSizingState(clean);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* storage unavailable — keep the in-memory sizing */
    }
  }, []);

  return { sizing, setSizing };
}
