import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isChartRange, toCandlePoints } from './candles';

describe('toCandlePoints (ZITN-TECH-029 Fase 3c)', () => {
  const series = {
    t: ['2026-09-25', '2026-09-26', '2026-09-27'],
    o: [10, 11, 12],
    h: [13, 14, 15],
    l: [9, 10, 11],
    c: [12, 13, 14],
  };

  it('zip t/o/h/l/c menjadi candle', () => {
    expect(toCandlePoints(series, 'max')).toEqual([
      { time: '2026-09-25', open: 10, high: 13, low: 9, close: 12 },
      { time: '2026-09-26', open: 11, high: 14, low: 10, close: 13 },
      { time: '2026-09-27', open: 12, high: 15, low: 11, close: 14 },
    ]);
  });

  it('memotong ke sejumlah bar terakhir sesuai rentang', () => {
    // '3M' -> 63 bar; deret 3 bar tidak terpotong.
    expect(toCandlePoints(series, '3M')).toHaveLength(3);
  });

  it('melewati baris tidak valid dan tetap kosong bila tak ada yang valid', () => {
    expect(
      toCandlePoints({ t: ['x', null], o: [1, 2], h: [1, 2], l: [1, 2], c: [1, 2] }, 'max'),
    ).toEqual([{ time: 'x', open: 1, high: 1, low: 1, close: 1 }]);
    expect(toCandlePoints({ t: [], o: [], h: [], l: [], c: [] }, '1Y')).toEqual([]);
  });
});

describe('isChartRange', () => {
  it('menerima hanya rentang yang dikenal', () => {
    expect(isChartRange('1Y')).toBe(true);
    expect(isChartRange('max')).toBe(true);
    expect(isChartRange('5Y')).toBe(false);
    expect(isChartRange(null)).toBe(false);
  });
});

describe('vendored Lightweight Charts contract (ZITN-TECH-029)', () => {
  // Guards the v4 → v5 drift that broke the journal chart: the vendored bundle is
  // v5 (`addSeries` + `CandlestickSeries`), and `lwc.ts`/`ChartView.tsx` target
  // that API. Swapping the bundle without updating the code (or vice versa) fails
  // here or in typecheck, instead of silently rendering "chart.failed".
  // Resolved from the test runner's cwd (the web package root), not
  // `import.meta.url` — the latter is not a `file:` URL under the CI module runner.
  const source = readFileSync(
    resolve(process.cwd(), 'public/vendor/lightweight-charts.standalone.production.js'),
    'utf8',
  );

  it('ships the v5 API the chart code calls', () => {
    expect(source).toMatch(/Lightweight Charts[^\n]*v5\./);
    expect(source).toContain('addSeries');
    expect(source).toContain('CandlestickSeries');
    expect(source).not.toContain('addCandlestickSeries');
  });
});
