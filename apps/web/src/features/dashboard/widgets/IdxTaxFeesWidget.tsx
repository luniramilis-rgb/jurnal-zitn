import { Link } from '@tanstack/react-router';

import { EmptyState } from '@/components/EmptyState';
import { Numeric } from '@/components/Numeric';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeeRollup } from '@/features/expenses/hooks/useFeeRollup';
import { useTaxSummary } from '@/features/expenses/hooks/useTaxSummary';
import { useT } from '@/hooks/useLocale';

/**
 * IdxTaxFeesWidget — Fase F0 (ZITN-TECH-017 §10.3). A compact IDX-specific
 * summary of the running year's **PPh final** (0.1% of sale proceeds, from
 * `tax-summary`) and recorded fill fees (from `fee-rollup`).
 *
 * Both endpoints are yearly, so this shows the running YEAR, labelled as such
 * (`w.idxTax.year`) rather than claiming a month it cannot compute. It shows
 * the user's own accounting figures on the authenticated dashboard only.
 */
function IdxTaxFeesWidget() {
  const t = useT();
  const year = new Date().getUTCFullYear();
  const tax = useTaxSummary(year);
  const fees = useFeeRollup(year);

  if (tax.isLoading || fees.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (tax.isError || fees.isError || !tax.data || !fees.data) {
    return <EmptyState title={t('w.idxTax.errorTitle')} />;
  }

  const pph = tax.data.pphFinal;
  const pphRows = pph?.perCurrency ?? [];
  const perCurrencyFees = fees.data.perCurrencyTotals;
  const hasAnyFee = fees.data.grandTotal !== null || perCurrencyFees.length > 0;
  const hasAny = pphRows.length > 0 || hasAnyFee;

  if (!hasAny) {
    return <EmptyState title={t('w.idxTax.empty')} description={t('w.idxTax.year', { year })} />;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <dl className="space-y-2 text-sm">
        <div className="space-y-1">
          <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {pph ? t('tax.pphTitle', { rate: pph.rate }) : t('w.idxTax.pph')}
          </dt>
          <dd>
            {pphRows.length > 0 ? (
              <ul className="space-y-1">
                {pphRows.map((row) => (
                  <li key={row.currency} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{row.currency}</span>
                    <span className="font-medium">
                      <Numeric
                        value={row.amount}
                        kind="money"
                        currency={row.currency}
                        direction="none"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">{t('tax.pphEmpty')}</span>
            )}
          </dd>
        </div>

        <div className="space-y-1">
          <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {t('w.idxTax.fees')}
          </dt>
          <dd>
            {fees.data.grandTotal !== null ? (
              <Numeric
                value={fees.data.grandTotal.totalFees}
                kind="money"
                currency={fees.data.grandTotal.displayCurrency}
                direction="none"
                className="font-medium"
              />
            ) : (
              <ul className="space-y-1">
                {perCurrencyFees.map((row) => (
                  <li key={row.currency} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{row.currency}</span>
                    <span className="font-medium">
                      <Numeric
                        value={row.totalFees}
                        kind="money"
                        currency={row.currency}
                        direction="none"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">{t('w.idxTax.note')}</p>

      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/accounting/tax-summary" className="cursor-pointer font-medium hover:underline">
          {t('w.idxTax.viewTax')}
        </Link>
        <Link to="/accounting/fee-rollup" className="cursor-pointer font-medium hover:underline">
          {t('w.idxTax.viewFees')}
        </Link>
      </div>
    </div>
  );
}

export default IdxTaxFeesWidget;
