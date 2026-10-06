// RetentionSummary — the survival and money lines both deletion dialogs share
// (design §C11, Req 7.6).
//
// These lines are EXTRACTS of the docs page (user-guide/account-deletion.mdx,
// task 15): the dialog states the few facts a user must weigh before confirming,
// and the docs link carries the full statement under its stable heading. Keep
// the two in step — a fact added here that is not on the page, or the reverse,
// is a drift the page's own review should catch.
//
// The unused credit balance is a PROP, not a hook read: self-service passes
// `useWalletBalance`'s balance and admin passes the target's `walletBalance`, so
// this component stays presentation-only and testable without either query.

import { Numeric } from '@/components/Numeric';
import { useT } from '@/hooks/useLocale';
import { docsHref } from '@/lib/docs';

export interface RetentionSummaryProps {
  /**
   * Unused wallet-credit balance as a credit-unit string (1 credit = 1
   * micro-USD), or `undefined` while the source query is still loading — in
   * which case the money line drops the figure but still states credits are not
   * refunded.
   */
  creditBalance?: string;
}

export function RetentionSummary({ creditBalance }: RetentionSummaryProps) {
  const t = useT();
  // Hidden while frontendFlags.DOCS_LINKS_ENABLED is false (ZITN rebrand); the
  // surrounding facts stay, only the external docs link drops.
  const accountDeletionDocs = docsHref('accountDeletion');
  return (
    <div className="space-y-3 text-sm" data-testid="retention-summary">
      <div>
        <p className="font-medium">{t('retention.title')}</p>
        <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-6">
          <li>{t('retention.item.stripe')}</li>
          <li>{t('retention.item.audit')}</li>
          <li>{t('retention.item.tombstone')}</li>
          <li>{t('retention.item.backups')}</li>
        </ul>
      </div>

      <div>
        <p className="font-medium">{t('retention.moneyTitle')}</p>
        <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-6">
          <li>{t('retention.money.notRefunded')}</li>
          <li data-testid="retention-credits">
            {creditBalance === undefined ? (
              t('retention.money.creditsPlain')
            ) : (
              <>
                <Numeric value={creditBalance} kind="integer" direction="none" />{' '}
                {t('retention.money.creditsSuffix')}
              </>
            )}
          </li>
        </ul>
      </div>

      {accountDeletionDocs && (
        <p className="text-muted-foreground">
          <a
            href={accountDeletionDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {t('retention.docsLink')}
          </a>
        </p>
      )}
    </div>
  );
}
