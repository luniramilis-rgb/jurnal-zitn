/**
 * Loader Lightweight Charts (ZITN-TECH-029 Fase 3c, jalur vendor).
 *
 * Pustaka di-vendor sebagai skrip standalone di `public/vendor/` (pola yang sama dipakai ZITN),
 * jadi tidak butuh dependensi npm. Dimuat sekali (promise di-cache) lalu diakses lewat global
 * `window.LightweightCharts`. Tipe di bawah hanya permukaan yang kami pakai.
 */

export interface LwcSeries {
  setData(data: unknown[]): void;
  applyOptions?(options: unknown): void;
}

export interface LwcChart {
  addCandlestickSeries(options?: unknown): LwcSeries;
  timeScale(): { fitContent(): void; applyOptions?(options: unknown): void };
  applyOptions(options: unknown): void;
  remove(): void;
}

export interface LwcApi {
  createChart(container: HTMLElement, options?: unknown): LwcChart;
}

export const LWC_SRC = '/vendor/lightweight-charts.standalone.production.js';

type LwcWindow = Window & { LightweightCharts?: LwcApi };

let pending: Promise<LwcApi> | null = null;

/** Muat sekali; resolve ke API. Idempoten dan aman dipanggil berkali-kali. */
export function loadLwc(): Promise<LwcApi> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('LightweightCharts butuh peramban'));
  }
  const existing = (window as LwcWindow).LightweightCharts;
  if (existing) return Promise.resolve(existing);
  if (pending) return pending;

  pending = new Promise<LwcApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LWC_SRC;
    script.async = true;
    script.onload = () => {
      const api = (window as LwcWindow).LightweightCharts;
      if (api) resolve(api);
      else reject(new Error('global LightweightCharts tidak ditemukan'));
    };
    script.onerror = () => reject(new Error('gagal memuat LightweightCharts'));
    document.head.appendChild(script);
  });
  return pending;
}

/** Hanya untuk uji: lupakan promise yang di-cache. */
export function __resetLwcLoader(): void {
  pending = null;
}
