import type { MessageKey } from '@jurnal-zitn/shared';
import type { SuperficialLossFlag, WashSaleFlag } from '@jurnal-zitn/shared/schemas/expense';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useT } from '@/hooks/useLocale';
import { formatCurrency } from '@/lib/format';

// Translated reason labels. Two values per the v1 closed enum on
// `WashSaleFlag.reason` (packages/shared/src/schemas/expense.ts).
const REASON_KEYS: Record<WashSaleFlag['reason'], MessageKey> = {
  repurchase_within_30_days: 'wash.reason.repurchase',
  held_open_in_30d_window: 'wash.reason.heldOpen',
};

interface WashSaleFlagsTableProps {
  flags: WashSaleFlag[] | SuperficialLossFlag[];
  kind: 'washSale' | 'superficialLoss';
  /** Display currency for the realised-loss column. Per-position currency is
   * not carried on the flag shape; the loss decimal is rendered in the
   * tax-summary display currency. Falls back to no currency code when null. */
  displayCurrency: string | null;
}

function truncateIds(
  ids: string[],
  t: (k: MessageKey, v?: Record<string, string | number>) => string,
): string {
  if (ids.length === 0) return '—';
  if (ids.length <= 2) return ids.join(', ');
  return `${ids.slice(0, 2).join(', ')} ${t('wash.more', { n: ids.length - 2 })}`;
}

export function WashSaleFlagsTable({ flags, displayCurrency }: WashSaleFlagsTableProps) {
  const t = useT();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('pos.col.symbol')}</TableHead>
          <TableHead>{t('wash.col.underlying')}</TableHead>
          <TableHead>{t('pos.col.side')}</TableHead>
          <TableHead>{t('wash.col.opened')}</TableHead>
          <TableHead>{t('wash.col.closed')}</TableHead>
          <TableHead className="text-right">{t('wash.col.realisedLoss')}</TableHead>
          <TableHead>{t('wash.col.reason')}</TableHead>
          <TableHead>{t('wash.col.counterparties')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((flag) => (
          <TableRow key={flag.positionId}>
            <TableCell className="font-medium">{flag.symbol}</TableCell>
            <TableCell>{flag.underlying ?? flag.symbol}</TableCell>
            <TableCell className="capitalize">{flag.side}</TableCell>
            <TableCell>{flag.openedAt}</TableCell>
            <TableCell>{flag.closedAt}</TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {displayCurrency
                ? formatCurrency(parseFloat(flag.realisedLoss), displayCurrency)
                : flag.realisedLoss}
            </TableCell>
            <TableCell>{t(REASON_KEYS[flag.reason])}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {truncateIds(flag.counterpartyPositionIds, t)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
