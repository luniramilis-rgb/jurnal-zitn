// BillingPanel — wallet balance card + credit-pack picker (design §Component 8;
// REQ-2.2/7.3/7.5).
//
// The balance is a credit COUNT (1 credit = 1 micro-USD), with an optional
// approximate USD equivalent derived from that constant — NEVER labeled
// displayCurrency. Pack prices are fiat, shown via formatCurrency(priceMinor/100).

import { useState } from 'react';
import { toast } from 'sonner';

import type { CreditPack } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/useLocale';
import { formatCurrency } from '@/lib/format';

import { useCreateCheckout } from './useCreateCheckout';
import { useWalletBalance } from './useWalletBalance';

// 1 credit = 1 micro-USD (design §Component 3). Used ONLY to show an approximate
// USD equivalent of a credit count — the credit unit itself is never currency.
const MICRO_USD_PER_USD = 1_000_000;

// Approximate USD equivalent of a credit-unit string, without coercing the raw
// magnitude through a lossy float (we divide as a Number only for display). This
// is an APPROXIMATION display, independent of the credit-count figure; it routes
// through lib/format's canonical USD Intl shape (R5.1) rather than a bespoke Intl.
function approxUsd(credits: string): string {
  const usd = Number(credits) / MICRO_USD_PER_USD;
  return formatCurrency(usd, 'USD');
}

/**
 * D1 (keputusan pemilik): harga paket kredit adalah **IDR**. `pack.currency`
 * di-mirror dari Stripe saat runtime — jangan diasumsikan. Bila mirror membawa
 * mata uang lain, gagalkan keras alih-alih merender mata uang yang tidak kita
 * putuskan (pagar harga/honesty).
 */
export function assertIdrCurrency(currency: string): void {
  if (currency !== 'IDR') {
    throw new Error(`D1: harga paket kredit harus IDR; diterima "${currency}"`);
  }
}

function PackCard({
  pack,
  onBuy,
  pending,
}: {
  pack: CreditPack;
  onBuy: (packId: string) => void;
  pending: boolean;
}) {
  const t = useT();
  // Fail loud before rendering any price (D1) — a non-IDR mirror is a bug.
  assertIdrCurrency(pack.currency);
  return (
    <Card data-testid={`credit-pack-${pack.id}`}>
      <CardHeader>
        <CardTitle>{pack.label}</CardTitle>
        <CardDescription>{t('billing.pack.credits', { n: pack.credits })}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          {formatCurrency(pack.priceMinor / 100, pack.currency)}
        </span>
        <Button
          type="button"
          size="sm"
          className="cursor-pointer"
          disabled={pending}
          onClick={() => onBuy(pack.id)}
        >
          {t('billing.buyCredits')}
        </Button>
      </CardContent>
    </Card>
  );
}

export interface BillingPanelProps {
  packs: CreditPack[];
}

export function BillingPanel({ packs }: BillingPanelProps) {
  const t = useT();
  const balanceQuery = useWalletBalance();
  const checkout = useCreateCheckout();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  const onBuy = (packId: string) => {
    setPendingPackId(packId);
    checkout.mutate(
      { packId },
      {
        onError: () => {
          setPendingPackId(null);
          toast.error(t('billing.checkout.error'));
        },
        // onSuccess redirects via window.location (useCreateCheckout) — no reset.
      },
    );
  };

  const balance = balanceQuery.data;

  return (
    <div className="space-y-6" data-testid="billing-panel">
      <Card data-testid="balance-card">
        <CardHeader>
          <CardTitle>{t('billing.balance.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {balanceQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t('billing.loading')}</p>
          ) : balance ? (
            <div>
              <p className="text-2xl font-semibold">
                {/* Credit COUNT (neutral) — never gain/loss color, never displayCurrency. */}
                <Numeric value={balance.available} kind="integer" direction="none" />{' '}
                {t('term.credits')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('billing.balance.approxUsd', { amount: approxUsd(balance.available) })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-destructive">{t('billing.balance.error')}</p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h3 className="text-base font-medium">{t('billing.buyCredits')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onBuy={onBuy}
              pending={checkout.isPending && pendingPackId === pack.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
