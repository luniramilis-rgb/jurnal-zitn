import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Respons `/api/journal/candles` (ZITN-TECH-029 Fase 3c). */
export interface CandleResponse {
  ok: boolean;
  market: string;
  symbol: string;
  name: string;
  sector: string;
  asof: string | null;
  bars: number;
  t: string[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  error?: string;
}

/**
 * Deret OHLCV satu emiten dari jembatan jurnal. Fail-closed: kegagalan (belum tertaut / konteks
 * mati / data ditahan) dikembalikan sebagai `ok:false` supaya UI menjelaskan, bukan melempar.
 */
export function useCandles(market: string, ticker: string) {
  return useQuery({
    queryKey: ['journal', 'candles', market, ticker],
    enabled: ticker.trim() !== '',
    queryFn: async (): Promise<CandleResponse> => {
      const path = `/journal/candles?market=${encodeURIComponent(market)}&ticker=${encodeURIComponent(ticker)}`;
      try {
        return await api.get<CandleResponse>(path);
      } catch (err) {
        const status = (err as { status?: number }).status;
        const error =
          status === 402
            ? 'paywall'
            : status === 409
              ? 'belum_tertaut'
              : status === 503
                ? 'konteks_nonaktif'
                : 'tidak_tersedia';
        return {
          ok: false,
          market,
          symbol: ticker,
          name: '',
          sector: '',
          asof: null,
          bars: 0,
          t: [],
          o: [],
          h: [],
          l: [],
          c: [],
          v: [],
          error,
        };
      }
    },
  });
}
