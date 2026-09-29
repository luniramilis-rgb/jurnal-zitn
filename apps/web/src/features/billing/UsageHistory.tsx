// UsageHistory — paginated wallet/usage history list (design §Component 8; REQ-7.3).
//
// Renders one row per wallet transaction: credit/reversal purchase entries and
// debit entries with their per-turn usage detail (provider/model/tokens) when
// joined. Credits are shown as a credit COUNT (never labeled displayCurrency).

import type { MessageKey, WalletHistoryItem } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/useLocale';
import { formatRelativeTime } from '@/lib/format';

import { useWalletHistory } from './useWalletHistory';

const KIND_KEY: Record<WalletHistoryItem['kind'], MessageKey> = {
  credit: 'billing.kind.purchase',
  debit: 'billing.kind.usage',
  reversal: 'billing.kind.reversal',
};

function HistoryRow({ item }: { item: WalletHistoryItem }) {
  const t = useT();
  return (
    <li
      data-testid="usage-history-row"
      className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{t(KIND_KEY[item.kind])}</p>
        {item.usage ? (
          <p className="text-xs text-muted-foreground">
            {t('billing.usage.detail', {
              provider: item.usage.providerId,
              model: item.usage.model,
              input: item.usage.inputTokens,
              output: item.usage.outputTokens,
            })}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
      </div>
      {/* The credit/debit figure is MONEY-DIRECTION, not a status: a credit reads
          as a gain (+ / text-gain), a debit as a loss. direction="auto"
          replaces the former hue-only green/foreground encoding. */}
      <span className="shrink-0 text-sm">
        <Numeric value={item.amount} kind="integer" direction="auto" /> {t('term.credits')}
      </span>
    </li>
  );
}

export function UsageHistory() {
  const t = useT();
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useWalletHistory();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Card data-testid="usage-history">
      <CardHeader>
        <CardTitle>{t('billing.history.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('billing.loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('billing.history.error')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('billing.history.empty')}</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {items.map((item) => (
                <HistoryRow key={item.id} item={item} />
              ))}
            </ul>
            {hasNextPage ? (
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? t('billing.loading') : t('billing.history.loadMore')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
