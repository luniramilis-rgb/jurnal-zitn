/**
 * Pemetaan murni payload candle jurnal -> data Lightweight Charts (ZITN-TECH-029 Fase 3c).
 *
 * Dipisah dari komponen supaya bisa diuji tanpa canvas/DOM. `time` LWC menerima `YYYY-MM-DD`
 * (persis bentuk `t` dari jembatan ZITN).
 */

export const CHART_RANGES = ['3M', '6M', '1Y', '3Y', 'max'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

/** Perkiraan jumlah bar harian per rentang (`max` = semua). */
const RANGE_BARS: Record<ChartRange, number | null> = {
  '3M': 63,
  '6M': 126,
  '1Y': 252,
  '3Y': 756,
  max: null,
};

export function isChartRange(value: string | null | undefined): value is ChartRange {
  return typeof value === 'string' && (CHART_RANGES as readonly string[]).includes(value);
}

export interface CandleInput {
  t: unknown[];
  o: unknown[];
  h: unknown[];
  l: unknown[];
  c: unknown[];
}

export interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Zip `t/o/h/l/c` menjadi deret candle; lewati baris yang tak lengkap/tak valid. Rentang memotong
 * ke sejumlah bar terakhir. Hasil selalu menaik sesuai urutan sumber (ZITN sudah kronologis).
 */
export function toCandlePoints(series: CandleInput, range: ChartRange = '1Y'): CandlePoint[] {
  const n = series.t.length;
  const limit = RANGE_BARS[range];
  const start = limit === null ? 0 : Math.max(0, n - limit);
  const points: CandlePoint[] = [];
  for (let i = start; i < n; i += 1) {
    const time = series.t[i];
    const open = Number(series.o[i]);
    const high = Number(series.h[i]);
    const low = Number(series.l[i]);
    const close = Number(series.c[i]);
    if (typeof time !== 'string' || time === '') continue;
    if (![open, high, low, close].every((v) => Number.isFinite(v))) continue;
    points.push({ time, open, high, low, close });
  }
  return points;
}
