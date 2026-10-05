import raw from '../data/risk_profile.json';

/**
 * Konsumsi artefak `risk_profile.json` dari ZITN (ZITN-TECH-043 §2).
 *
 * **Jangan menghitung ulang** di sini — data & logika sinyal ada di ZITN; ini hanya
 * lookup grid (satu sumber angka). Off-grid dibulatkan ke sel terdekat dan ditandai
 * "pendekatan". Label **in-sample**, **tanpa proyeksi P/L uang**.
 */

export interface RiskProfileCell {
  n: number;
  r_r: number | null;
  breakeven: number | null;
  p_tp: number;
  p_sl: number | null;
  e_net: number;
  median: number;
  p5: number;
  p1: number;
  min: number;
  p_loss10: number;
  p_loss20: number;
  p_loss40: number;
}

export interface RiskProfileRule {
  label: string;
  grid: Record<string, RiskProfileCell>;
}

export interface RiskProfileFile {
  generated: string;
  cost: number;
  cooldown: number;
  label_basis: string;
  rules: Record<string, RiskProfileRule>;
}

export const RISK_PROFILE = raw as RiskProfileFile;

export const RISK_RULES = ['V4_MOMENTUM_BULL', 'V5_ABSORPSI_BEAR'] as const;
export type RiskRule = (typeof RISK_RULES)[number];

export const RISK_PERIODS = ['penuh', 'modern', '2025'] as const;
export type RiskPeriod = (typeof RISK_PERIODS)[number];

export const RISK_TP_OPTIONS = [5, 10, 15, 20, 30] as const;
export const RISK_SL_OPTIONS = [10, 15, 20, 30] as const;
export const RISK_H_OPTIONS = [60, 252, 504] as const;

/**
 * Dropdown choices shown in the UI. A superset of the grid — values the grid
 * lacks (TP 25; SL 5/25/50) snap to the nearest cell and are labelled
 * "pendekatan". Keep `RISK_TP_OPTIONS`/`RISK_SL_OPTIONS` (the grid) for snapping.
 */
export const RISK_TP_CHOICES = [5, 10, 15, 20, 25, 30] as const;
export const RISK_SL_CHOICES = [5, 10, 15, 20, 25, 30, 50] as const;

/** Off-grid bounds accepted by the UI (values are rounded to the nearest cell). */
export const RISK_TP_RANGE = { min: 3, max: 50 } as const;
export const RISK_SL_RANGE = { min: 5, max: 50 } as const;
export const RISK_H_RANGE = { min: 20, max: 504 } as const;

export type RiskSl = number | 'none';

export interface RiskProfileChoice {
  rule: RiskRule;
  period: RiskPeriod;
  tp: number;
  sl: RiskSl;
  h: number;
}

/** Defaults per rule (handoff §3.1): V4 tp10/noSL/h504, V5 tp5/noSL/h504. */
export const RISK_PROFILE_DEFAULTS: Record<RiskRule, RiskProfileChoice> = {
  V4_MOMENTUM_BULL: { rule: 'V4_MOMENTUM_BULL', period: 'penuh', tp: 10, sl: 'none', h: 504 },
  V5_ABSORPSI_BEAR: { rule: 'V5_ABSORPSI_BEAR', period: 'penuh', tp: 5, sl: 'none', h: 504 },
};

export const DEFAULT_RISK_PROFILE_CHOICE: RiskProfileChoice =
  RISK_PROFILE_DEFAULTS.V4_MOMENTUM_BULL;

export const RISK_PRESETS = [
  { id: 'konservatif', tp: 5, sl: 10 },
  { id: 'seimbang', tp: 10, sl: 20 },
  { id: 'agresif', tp: 15, sl: 30 },
] as const;
export type RiskPresetId = (typeof RISK_PRESETS)[number]['id'];

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
  const approx = tp !== choice.tp || sl !== choice.sl || h !== choice.h || period !== choice.period;
  return { choice: { ...choice, tp, sl, h, period }, approx };
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

export function lookupRiskProfile(choice: RiskProfileChoice): RiskLookup {
  const { choice: used, approx } = snapChoice(choice);
  const rule = RISK_PROFILE.rules[used.rule];
  const cell = rule ? (rule.grid[riskCellKey(used)] ?? null) : null;
  return { cell, approx, used };
}
