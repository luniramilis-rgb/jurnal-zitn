import { useMemo } from 'react';
import { toast } from 'sonner';

import type { TradePlanChecklist } from '@jurnal-zitn/shared';

import { useSheetContext } from '@/features/journal-context/hooks/useSheetContext';
import { useT } from '@/hooks/useLocale';

import { useUpdateTradePlan } from '../hooks/useTradePlans';

import { PraTradeChecklist } from './PraTradeChecklist';

/** Cocokkan pasar jurnal (`id`/`us`) dengan `market` baris konteks ZITN (longgar). */
function marketMatches(rowMarket: string | null | undefined, planMarket: string): boolean {
  const m = String(rowMarket ?? '').toLowerCase();
  return planMarket === 'us' ? m.startsWith('us') : m.startsWith('id');
}

/**
 * Seksi ceklis pra-trade F4 (ZITN-TECH-069 Lapis 2): baca `pra` dari konteks lembar ZITN
 * (D12=(ii)) untuk (pasar, ticker, tanggal-sinyal), lalu simpan keputusan user ke rencana.
 * Tidak menghitung apa pun; tanpa endpoint baru (memakai `/api/journal/context` yang ada).
 */
export function PlanChecklistSection({
  planId,
  symbol,
  market,
  signalDate,
  value,
  onSaved,
}: {
  planId: string;
  symbol: string;
  market: string;
  signalDate: string | null;
  value: TradePlanChecklist | null;
  onSaved: (next: TradePlanChecklist) => void;
}) {
  const t = useT();
  const ctx = useSheetContext(signalDate);
  const update = useUpdateTradePlan();

  const pra = useMemo(() => {
    const rows = ctx.data?.rows ?? [];
    const tk = symbol.trim().toUpperCase();
    const row = rows.find(
      (r) => String(r.ticker ?? '').toUpperCase() === tk && marketMatches(r.market, market),
    );
    return row?.pra ?? null;
  }, [ctx.data, symbol, market]);

  return (
    <PraTradeChecklist
      pra={pra}
      value={value}
      asOf={signalDate}
      saving={update.isPending}
      onSave={(next) =>
        update.mutate(
          { id: planId, data: { checklist: next } },
          {
            onSuccess: () => {
              toast.success(t('pra.saved'));
              onSaved(next);
            },
          },
        )
      }
    />
  );
}
