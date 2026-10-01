import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface SheetContextEntry {
  market: string;
  ticker: string;
  /** Tautan ke chart ZITN (IDX & US, permukaan Lembar Harian) bila tersedia; jurnal tidak menggambar chart. */
  chartUrl?: string;
}

/**
 * Baris lembar ber-harga (ZITN-TECH-029 Fase 3b, D-4(a)/(b)) — hanya muncul di **workspace
 * berbayar** dan hanya bila jembatan ZITN mengirimnya.
 */
export interface SheetRow {
  market: string;
  ticker: string;
  name: string | null;
  kind: string | null;
  date: string | null;
  direction: string | null;
  order_type: string | null;
  rule: string | null;
  entry: number | null;
  target: number | null;
  stop: number | null;
  entry_prev_close: number | null;
  distance_pct: number | null;
  size_qty: number | null;
  size_unit: string | null;
  data_status: string | null;
  evidence_status: string | null;
}

export interface SheetContextView {
  ok: boolean;
  tersedia: boolean;
  tanggal: string | null;
  asof: string | null;
  simbol: SheetContextEntry[];
  level_watch: SheetContextEntry[];
  rows: SheetRow[];
  error?: string;
}

/**
 * Konteks lembar ZITN untuk satu tanggal (ZITN-TECH-019). Jurnal hanya membaca: ZITN yang
 * menyiapkan cuplikan; kegagalan (belum tertaut / konteks mati / data ditahan) dikembalikan
 * sebagai hasil `ok:false` supaya UI bisa menjelaskan, bukan melempar.
 */
export function useSheetContext(tanggal: string | null) {
  return useQuery({
    queryKey: ['journal', 'context', tanggal],
    queryFn: async (): Promise<SheetContextView> => {
      const path = tanggal
        ? `/journal/context?tanggal=${encodeURIComponent(tanggal)}`
        : '/journal/context';
      try {
        return await api.get<SheetContextView>(path);
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
          tersedia: false,
          tanggal,
          asof: null,
          simbol: [],
          level_watch: [],
          rows: [],
          error,
        };
      }
    },
  });
}
