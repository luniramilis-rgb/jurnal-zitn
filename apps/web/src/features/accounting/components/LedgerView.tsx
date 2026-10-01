import { Link } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { LedgerEntry } from '@jurnal-zitn/shared/schemas/accounting';

import { EmptyState } from '@/components/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useReverseCashMovement } from '@/features/accounting/hooks/useCashMovements';
import { useLedgerQuery } from '@/features/accounting/hooks/useLedger';
import { useT } from '@/hooks/useLocale';
import { formatDateTime, formatMoney } from '@/lib/format';

const PAGE_SIZE = 50;

// The three reversal entry types share the "(reversal)" badge; a Set keeps the
// membership test open to new reversal kinds without touching the row markup
// (replaces the former `entryType === 'position_pnl_reversal'` check).
const REVERSAL_TYPES = new Set<LedgerEntry['entryType']>([
  'position_pnl_reversal',
  'deposit_reversal',
  'withdrawal_reversal',
]);

// Map a cash-movement entry type to its dictionary key. A deposit and its
// reversal both read "Deposit"; a withdrawal and its reversal "Withdrawal".
// Everything else (trades, balance adjustments) returns null. The key (not a
// baked string) is returned so the caller renders it through `t()`.
type CashLabelKey = 'cash.type.deposit' | 'cash.type.withdrawal';
function cashMovementLabelKey(t: LedgerEntry['entryType']): CashLabelKey | null {
  if (t === 'deposit' || t === 'deposit_reversal') return 'cash.type.deposit';
  if (t === 'withdrawal' || t === 'withdrawal_reversal') return 'cash.type.withdrawal';
  return null;
}

interface Props {
  accountId: string;
  currency: string;
}

/**
 * Compute per-row running balances by summing forward from
 * `runningBalanceAtFirstRow`. Entries are ordered newest-first
 * (occurredAt DESC, createdAt DESC). The anchor represents the cumulative
 * balance up to (exclusive) the first page row — i.e., the balance state
 * immediately BEFORE the newest displayed entry was applied.
 *
 * Recurrence: B[0] = anchor + delta[0]; B[i] = B[i-1] − delta[i-1]
 *   where delta[i] = (direction === 'credit' ? +amount : −amount).
 */
function computeRunningBalances(
  entries: LedgerEntry[],
  runningBalanceAtFirstRow: string,
): number[] {
  if (entries.length === 0) return [];
  const anchor = Number(runningBalanceAtFirstRow);
  const balances = new Array<number>(entries.length);
  const delta = (e: LedgerEntry) =>
    e.direction === 'credit' ? Number(e.amount) : -Number(e.amount);
  balances[0] = anchor + delta(entries[0]);
  for (let i = 1; i < entries.length; i++) {
    balances[i] = balances[i - 1] - delta(entries[i - 1]);
  }
  return balances;
}

function formatLedgerAmount(n: number, currency: string): string {
  // Round to 4dp to match ledger amount precision before formatting.
  const rounded = Math.round(n * 10000) / 10000;
  return formatMoney(rounded.toString(), currency);
}

export function LedgerView({ accountId, currency }: Props) {
  const t = useT();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
  const { data, isLoading } = useLedgerQuery({ accountId, page });
  const reverse = useReverseCashMovement(accountId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return <EmptyState title={t('ledger.empty.title')} description={t('ledger.empty.desc')} />;
  }

  const runningBalances = computeRunningBalances(data.entries, data.runningBalanceAtFirstRow);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ledger.col.occurredAt')}</TableHead>
            <TableHead>{t('ledger.col.position')}</TableHead>
            <TableHead className="text-right">{t('ledger.col.debit')}</TableHead>
            <TableHead className="text-right">{t('ledger.col.credit')}</TableHead>
            <TableHead className="text-right">{t('ledger.col.balance')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('pos.col.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.entries.map((entry, i) => {
            const isReversal = REVERSAL_TYPES.has(entry.entryType);
            // Branch on entryType BEFORE positionId. A balance adjustment has no
            // position by design (Req 8.12), so falling through to the
            // positionId-null branch below would label it "(deleted)" and read
            // as an orphaned trade row. The same holds for cash movements.
            const isAdjustment = entry.entryType === 'balance_adjustment';
            const cashLabelKey = cashMovementLabelKey(entry.entryType);
            // Only originating movements are reversible; a reversal row is not
            // itself deletable (Req 7.2).
            const isCashMovement =
              entry.entryType === 'deposit' || entry.entryType === 'withdrawal';
            return (
              <TableRow key={entry.id}>
                <TableCell>{formatDateTime(entry.occurredAt)}</TableCell>
                <TableCell>
                  {isAdjustment ? (
                    <Badge variant="secondary">{t('ledger.badge.adjustment')}</Badge>
                  ) : cashLabelKey !== null ? (
                    <Badge variant="secondary">{t(cashLabelKey)}</Badge>
                  ) : entry.positionId ? (
                    <Link
                      to="/positions/$positionId"
                      params={{ positionId: entry.positionId }}
                      className="font-medium hover:underline"
                    >
                      {entry.symbol ?? '—'}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {entry.symbol
                        ? t('ledger.deletedSymbol', { symbol: entry.symbol })
                        : t('ledger.deleted')}
                    </span>
                  )}
                  {isReversal && (
                    <Badge variant="outline" className="ml-2">
                      {t('ledger.badge.reversal')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {entry.direction === 'debit' ? formatMoney(entry.amount, entry.currency) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {entry.direction === 'credit' ? formatMoney(entry.amount, entry.currency) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatLedgerAmount(runningBalances[i], currency)}
                </TableCell>
                <TableCell className="text-right">
                  {isCashMovement ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer text-muted-foreground"
                      aria-label={
                        entry.entryType === 'deposit'
                          ? t('ledger.action.deleteDepositAria')
                          : t('ledger.action.deleteWithdrawalAria')
                      }
                      data-testid="ledger-delete-cash-movement"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {(page > 1 || data.hasMore) && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('ledger.pag.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('ledger.pag.status', { page, size: PAGE_SIZE })}
          </span>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!data.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('ledger.pag.next')}
          </Button>
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget
                ? t('ledger.delete.title', {
                    type: t(cashMovementLabelKey(deleteTarget.entryType) ?? 'cash.type.deposit'),
                  })
                : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                t('ledger.delete.body', {
                  amount: formatMoney(deleteTarget.amount, deleteTarget.currency),
                  entryType: t(cashMovementLabelKey(deleteTarget.entryType) ?? 'cash.type.deposit'),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                if (deleteTarget) reverse.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
