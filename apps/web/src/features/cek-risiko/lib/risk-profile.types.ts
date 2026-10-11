/**
 * Types for the private risk-profile grid (ZITN-TECH-043). Kept in a separate
 * module with NO data so nothing about the strategy is committed here.
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
  /** A/B/C split, aligned with Pemindai/Chart (ZITN-TECH-062). Optional for older artifacts. */
  p_a?: number;
  p_b?: number;
  p_c?: number;
  /** MAE (max adverse excursion, %) — median/p5/min; optional. */
  mae_med?: number | null;
  mae_p5?: number | null;
  mae_min?: number | null;
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
  /** Per-market artifact markers (ZITN-TECH-047); absent on the legacy US file. */
  market?: string;
  currency?: string;
  rules: Record<string, RiskProfileRule>;
}
