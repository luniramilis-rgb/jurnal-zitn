import type { PreviewRateChangeResponse } from '@jurnal-zitn/shared/schemas/accounting';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/hooks/useLocale';
import { formatMoney } from '@/lib/format';

export interface RateChangeConfirmModalProps {
  /** The preview response that triggered this modal. Always non-null when the modal is open. */
  preview: PreviewRateChangeResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

/**
 * Blocking confirmation modal shown when `previewRateChangeImpact` returns
 * `exceedsThreshold: true` (>5% shift in displayed total) — symmetric across
 * insert/upsert/delete via the `intent` discriminator on the preview input.
 *
 * Copy uses the hedged "approximately" wording from design.md §Component 6,
 * because the post-write total may differ from the previewed total
 * (cross-tab race, single-tab sequential composition).
 *
 * Callers must short-circuit (not render this modal) when `displayCurrency` is
 * null — formatting "undefined" via `formatMoney(_, null)` would surface
 * "$NaN"/"undefined" in the UI.
 */
export function RateChangeConfirmModal({
  preview,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isPending,
}: RateChangeConfirmModalProps) {
  const t = useT();
  const displayCurrency = preview?.displayCurrency ?? null;
  const beforeTotal = preview?.beforeTotal ?? null;
  const afterTotal = preview?.afterTotal ?? null;

  // Defensive short-circuit: when there is no display currency we cannot render
  // a meaningful before/after pair, so the modal must not render — even if a
  // caller forgets to gate the `open` prop. This is the contract Task 23.5
  // tests rely on. The caller (ExchangeRatesPage) ALSO short-circuits earlier
  // to avoid even opening this modal in that state.
  if (open && displayCurrency === null) {
    return null;
  }

  const formattedBefore =
    displayCurrency && beforeTotal !== null ? formatMoney(beforeTotal, displayCurrency) : '—';
  const formattedAfter =
    displayCurrency && afterTotal !== null ? formatMoney(afterTotal, displayCurrency) : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('fx.confirm.title')}</DialogTitle>
          <DialogDescription>
            {t('fx.confirm.body', { before: formattedBefore, after: formattedAfter })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={onCancel}
            disabled={isPending}
          >
            {t('action.cancel')}
          </Button>
          <Button type="button" className="cursor-pointer" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('common.saving') : t('common.continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
