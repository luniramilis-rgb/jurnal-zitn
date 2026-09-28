import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface SheetContextEntry {
  market: string;
  ticker: string;
  /** Tautan ke chart ZITN (permukaan Lembar Harian) bila tersedia; jurnal tidak menggambar chart. */
  chartUrl?: string;
}

export interface SheetContextView {
  ok: boolean;
  tersedia: boolean;
  tanggal: string | null;
  asof: string | null;
  simbol: SheetContextEntry[];
  level_watch: SheetContextEntry[];
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
          status === 409 ? 'belum_tertaut' : status === 503 ? 'konteks_nonaktif' : 'tidak_tersedia';
        return {
          ok: false,
          tersedia: false,
          tanggal,
          asof: null,
          simbol: [],
          level_watch: [],
          error,
        };
      }
    },
  });
}
