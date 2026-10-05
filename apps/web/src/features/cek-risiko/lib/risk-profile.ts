import type { RiskProfileCell, RiskProfileFile } from './risk-profile.types';

export type { RiskProfileCell, RiskProfileFile, RiskProfileRule } from './risk-profile.types';

/**
 * Cek Risiko — grid "Profil risiko" (ZITN-TECH-043).
 *
 * Grid (rule × TP×SL×H dengan statistik backtest per sel) adalah **IP strategi**
 * dan **tidak** disimpan di repo ini. Ia diambil **saat runtime** dari
 * `GET /api/cek-risiko/risk-profile` (berkas privat di host). Di sini hanya ada
 * tipe + lookup murni; **jangan** menyalin angka grid ke sini.
 */

export type RiskRule = string;

/**
 * Pasar yang punya artefak grid sendiri (ZITN-TECH-047, keputusan pemilik D47-1):
 * `us` (S&P 500, default) dan `id` (IDX). Rule id-nya **datang dari artefak**
 * (grid privat) — tidak pernah ditulis di repo publik ini.
 */
export const RISK_MARKETS = ['us', 'id'] as const;
export type RiskMarket = (typeof RISK_MARKETS)[number];
export const DEFAULT_RISK_MARKET: RiskMarket = 'us';

export function isRiskMarket(value: unknown): value is RiskMarket {
  return (RISK_MARKETS as readonly string[]).includes(value as string);
}

export const RISK_PERIODS = ['penuh', 'modern', '2025'] as const;
export type RiskPeriod = (typeof RISK_PERIODS)[number];

export const RISK_TP_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
export const RISK_SL_OPTIONS = [5, 10, 15, 20, 25, 30, 50] as const;
export const RISK_H_OPTIONS = [60, 252, 504] as const;

export const RISK_TP_CHOICES = RISK_TP_OPTIONS;
export const RISK_SL_CHOICES = RISK_SL_OPTIONS;

export type RiskSl = number | 'none';

/**
 * Per-market presentation + exit defaults. The rule **id** still comes from the
 * artifact; these are only the label currency and the exit parameters the panel
 * starts from when the user switches markets (US exits are the frozen V4/V5
 * defaults, IDX the frozen TP +5% / no SL / H=504 rule — not strategy IP).
 */
export interface RiskMarketMeta {
  /** Currency the capital/exposure figures are denominated in. */
  currency: string;
  tp: number;
  sl: RiskSl;
  h: number;
}

export const RISK_MARKET_META: Record<RiskMarket, RiskMarketMeta> = {
  us: { currency: 'USD', tp: 10, sl: 'none', h: 504 },
  id: { currency: 'IDR', tp: 5, sl: 'none', h: 504 },
};

export interface RiskProfileChoice {
  market: RiskMarket;
  rule: RiskRule;
  period: RiskPeriod;
  tp: number;
  sl: RiskSl;
  h: number;
}

/**
 * Neutral default: no rule id (the real ids come from the private grid). The
 * panel adopts the grid's first rule once it loads, per selected market.
 */
export const DEFAULT_RISK_PROFILE_CHOICE: RiskProfileChoice = {
  market: DEFAULT_RISK_MARKET,
  rule: '',
  period: 'penuh',
  tp: 10,
  sl: 'none',
  h: 504,
};

/** Model sizing/slot US terkunci (`docs/analysis/us_sizing_slot_prereg.md`): w 2% · S 20. */
export const RISK_WEIGHT_DEFAULT = 2;
export const RISK_SLOTS_DEFAULT = 20;

export const RISK_PRESETS = [
  { id: 'konservatif', tp: 5, sl: 10 },
  { id: 'seimbang', tp: 10, sl: 20 },
  { id: 'agresif', tp: 15, sl: 30 },
] as const;

function nearest<T extends number>(options: readonly T[], value: number): T {
  return options.reduce(
    (best, option) => (Math.abs(option - value) < Math.abs(best - value) ? option : best),
    options[0],
  );
}

function snapPeriod(period: RiskPeriod): RiskPeriod {
  return (RISK_PERIODS as readonly string[]).includes(period) ? period : 'penuh';
}

/** Nearest valid choice; `approx` true when any dimension was rounded. */
export function snapChoice(choice: RiskProfileChoice): {
  choice: RiskProfileChoice;
  approx: boolean;
} {
  const tp = (RISK_TP_OPTIONS as readonly number[]).includes(choice.tp)
    ? choice.tp
    : nearest(RISK_TP_OPTIONS, choice.tp);
  const sl: RiskSl =
    choice.sl === 'none'
      ? 'none'
      : (RISK_SL_OPTIONS as readonly number[]).includes(choice.sl)
        ? choice.sl
        : nearest(RISK_SL_OPTIONS, choice.sl);
  const h = (RISK_H_OPTIONS as readonly number[]).includes(choice.h)
    ? choice.h
    : nearest(RISK_H_OPTIONS, choice.h);
  const period = snapPeriod(choice.period);
  const market = isRiskMarket(choice.market) ? choice.market : DEFAULT_RISK_MARKET;
  const approx = tp !== choice.tp || sl !== choice.sl || h !== choice.h || period !== choice.period;
  return { choice: { ...choice, market, tp, sl, h, period }, approx };
}

export function riskCellKey(choice: Pick<RiskProfileChoice, 'period' | 'tp' | 'sl' | 'h'>): string {
  const sl = choice.sl === 'none' ? 'none' : String(choice.sl);
  return `${choice.period}|tp${choice.tp}_sl${sl}_h${choice.h}`;
}

export interface RiskLookup {
  cell: RiskProfileCell | null;
  /** True when the requested choice was rounded to the nearest grid cell. */
  approx: boolean;
  /** The cell actually used (after rounding). */
  used: RiskProfileChoice;
}

/** Resolve a choice against the fetched grid; `cell` is null when absent. */
export function lookupRiskProfile(
  profile: RiskProfileFile | null,
  choice: RiskProfileChoice,
): RiskLookup {
  const { choice: used, approx } = snapChoice(choice);
  if (!profile) return { cell: null, approx, used };
  const rule = profile.rules[used.rule];
  const cell = rule ? (rule.grid[riskCellKey(used)] ?? null) : null;
  return { cell, approx, used };
}

/**
 * Komponen portofolio dari sel in-sample (fraksi ekuitas). **Bukan proyeksi P/L
 * uang** — hanya skala observasi `w × metrik`. Tampilkan sebagai komponen, bukan
 * skor tunggal (ZITN-TECH-043 §4).
 */
export interface PortfolioComponents {
  /** Eksposur maksimum = w × S (fraksi ekuitas). */
  exposureMax: number;
  /** Dampak 1 posisi bila rugi terburuk = w × min. */
  worstOne: number;
  /** Dampak 1 posisi pada p5 = w × p5. */
  p5One: number;
  /** Ekspektasi per transaksi = w × E net. */
  perTrade: number;
  /** Ilustrasi S slot serentak pada p5 = w × S × p5. */
  simultaneousP5: number;
}

export function portfolioComponents(
  cell: Pick<RiskProfileCell, 'min' | 'p5' | 'e_net'>,
  weightPercent: number,
  slots: number,
): PortfolioComponents {
  const w = weightPercent / 100;
  return {
    exposureMax: w * slots,
    worstOne: w * cell.min,
    p5One: w * cell.p5,
    perTrade: w * cell.e_net,
    simultaneousP5: w * slots * cell.p5,
  };
}
