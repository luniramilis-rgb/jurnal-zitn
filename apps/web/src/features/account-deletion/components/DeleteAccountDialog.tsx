// DeleteAccountDialog — the confirmation in front of self-service deletion
// (design §C11, Req 8.1/8.2).
//
// It carries the RetentionSummary (what survives, the money facts, the docs
// link), a timing line read from the billing tier, and the password gate. The
// confirm is destructive; every other control is neutral. Every server refusal
// keeps the dialog open with one message per code (Req 8.2) so the user can
// correct and retry without losing the typed password.

import { useState } from 'react';

import { formatDate, type MessageKey } from '@jurnal-zitn/shared';

import { RetentionSummary } from '@/components/account-deletion/RetentionSummary';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTierState } from '@/features/billing/useTierState';
import { useWalletBalance } from '@/features/billing/useWalletBalance';
import { useLocale, useT } from '@/hooks/useLocale';

import { useDeleteAccount } from '../hooks/useAccountDeletion';

// One message per code in Req 8.2, plus 409 DELETION_IN_PROGRESS. Anything else
// (a bare 500, an unmapped code) falls back to the neutral line below.
const DELETE_ERROR_KEYS: Record<string, MessageKey> = {
  VALIDATION_ERROR: 'settings.delete.error.validation',
  INVALID_PASSWORD: 'settings.delete.error.invalidPassword',
  LAST_ADMIN: 'settings.delete.error.lastAdmin',
  SUBSCRIPTION_UNRESOLVED: 'settings.delete.error.subscription',
  RATE_LIMITED: 'settings.delete.error.rateLimited',
  STRIPE_CANCEL_FAILED: 'settings.delete.error.stripe',
  DELETION_IN_PROGRESS: 'settings.delete.error.inProgress',
};

const FALLBACK_DELETE_ERROR_KEY: MessageKey = 'settings.delete.error.fallback';

interface DeleteAccountDialogProps {
  /** Called on a scheduled outcome or when the user dismisses the dialog. */
  onClose: () => void;
}

export function DeleteAccountDialog({ onClose }: DeleteAccountDialogProps) {
  const t = useT();
  const { locale } = useLocale();
  const [password, setPassword] = useState('');
  const balance = useWalletBalance();
  const tier = useTierState();
  const del = useDeleteAccount();

  function deleteErrorMessage(err: unknown): string {
    const code =
      typeof err === 'object' && err !== null
        ? (err as { error?: { code?: string } }).error?.code
        : undefined;
    return t((code && DELETE_ERROR_KEYS[code]) || FALLBACK_DELETE_ERROR_KEY);
  }

  // Timing (design §C11): a live subscription whose paid period ends in the
  // future defers the delete to that date; otherwise it fires immediately.
  const subscription = tier.data?.subscription ?? null;
  const periodEnd = subscription ? new Date(subscription.currentPeriodEnd) : null;
  const timingLine =
    periodEnd !== null && periodEnd.getTime() > Date.now()
      ? t('settings.delete.timingScheduled', { date: formatDate(periodEnd, locale) })
      : t('settings.delete.timingImmediate');

  const submit = () => {
    if (password.length === 0 || del.isPending) return;
    del.mutate(
      { password },
      {
        // `deleted` navigates away; `scheduled` leaves the user signed in, so
        // close the dialog and let the settings section show the scheduled
        // state (Req 8.3). Errors keep the dialog open (no onClose).
        onSuccess: (result) => {
          if (result.outcome === 'scheduled') onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !del.isPending) onClose();
      }}
    >
      <DialogContent data-testid="delete-account-dialog">
        <DialogHeader>
          <DialogTitle>{t('settings.delete.dialogTitle')}</DialogTitle>
          <DialogDescription>{timingLine}</DialogDescription>
        </DialogHeader>

        <RetentionSummary creditBalance={balance.data?.balance} />

        <div className="space-y-2">
          <Label htmlFor="delete-account-password">{t('settings.delete.confirmPassword')}</Label>
          <Input
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {del.isError && (
          <p className="text-destructive text-sm" role="alert" data-testid="delete-account-error">
            {deleteErrorMessage(del.error)}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={onClose}
            disabled={del.isPending}
          >
            {t('settings.delete.cancelButton')}
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={password.length === 0 || del.isPending}
            onClick={submit}
          >
            {del.isPending ? t('settings.delete.submitting') : t('settings.delete.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
