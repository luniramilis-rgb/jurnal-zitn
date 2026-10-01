import { createFileRoute } from '@tanstack/react-router';

import { ChartView } from '@/features/chart/components/ChartView';

// Fase 3c (ZITN-TECH-029): chart internal jurnal (Lightweight Charts di-vendor), membaca konteks
// dari URL (?symbol=&tf=&pasar=) dan data OHLCV lewat jembatan jurnal.
interface ChartSearch {
  symbol?: string;
  tf?: string;
  pasar?: string;
  market?: string;
}

export const Route = createFileRoute('/_auth/chart')({
  // Konteks dibaca dari raw query di komponen; ini hanya men-deklarasikan agar `Link search`
  // bertipe dan tidak ter-strip dari URL.
  validateSearch: (search: Record<string, unknown>): ChartSearch => ({
    symbol: typeof search.symbol === 'string' ? search.symbol : undefined,
    tf: typeof search.tf === 'string' ? search.tf : undefined,
    pasar: typeof search.pasar === 'string' ? search.pasar : undefined,
    market: typeof search.market === 'string' ? search.market : undefined,
  }),
  component: ChartView,
});
