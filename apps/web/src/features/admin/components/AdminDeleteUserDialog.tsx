// AdminDeleteUserDialog — the confirmation in front of the admin Delete action
// (design §C11, Req 6.4/7.6).
//
// It mirrors FactoryResetDialog: the typed email is the safety mechanism and the
// server re-checks it before anything is deleted, so this dialog is the
// usability layer, not the guard. It carries the shared RetentionSummary (what
// survives, the money facts, the docs link) fed the TARGET's unused credit
// balance from useAdminUser, and a typed-email gate on the destructive confirm.
//
// Every server refusal keeps the dialog open with one message per code (Req 6.4)
// so the operator can retry — the confirm button IS the retry — without
// re-typing the address. 502 STRIPE_CANCEL_FAILED is the fail-closed case: the
// live subscription could not be cancelled and nothing was deleted.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { MessageKey } from '@jurnal-zitn/shared';
import type { AdminUserListItem } from '@jurnal-zitn/shared/schemas/admin';

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
import { useT } from '@/hooks/useLocale';

import { useAdminDeleteUser } from '../hooks/useAdminDeleteUser';
import { useAdminUser } from '../hooks/useAdminUser';

// One message per code the delete route returns (Req 6.4); anything unmapped
// falls back to the neutral line. Every case here left the account intact.

const DELETE_ERROR_KEYS: Record<string, MessageKey> = {
  VALIDATION_ERROR: 'adm.error.validation',
  NOT_FOUND: 'adm.error.notFound',
  LAST_ADMIN: 'adm.error.lastAdmin',
  SUBSCRIPTION_UNRESOLVED: 'adm.error.subscription',
  RATE_LIMITED: 'auth.error.rateLimited',
  STRIPE_CANCEL_FAILED: 'adm.error.stripe',
};

const FALLBACK_DELETE_ERROR_KEY: MessageKey = 'adm.error.fallback';

function deleteErrorMessage(
  err: unknown,
  t: (k: MessageKey, v?: Record<string, string | number>) => string,
): string {
  const code =
    typeof err === 'object' && err !== null
      ? (err as { error?: { code?: string } }).error?.code
      : undefined;
  return t((code && DELETE_ERROR_KEYS[code]) || FALLBACK_DELETE_ERROR_KEY);
}

interface AdminDeleteUserDialogProps {
  /** The user to delete, or `null` when the dialog is closed. */
  user: AdminUserListItem | null;
  onClose: () => void;
}

export function AdminDeleteUserDialog({ user, onClose }: AdminDeleteUserDialogProps) {
  const t = useT();
  const [typedEmail, setTypedEmail] = useState('');
  const detail = useAdminUser(user?.id);
  const del = useAdminDeleteUser();

  // Start clean for every user the dialog is opened on: a typed address (or a
  // stale error) carried across a close would mean the confirm was armed, or the
  // last failure was showing, the next time it opened — on a different row.
  useEffect(() => {
    setTypedEmail('');
    del.reset();
  }, [user?.id]);

  // Case-insensitive, as the server compares it: an operator reading the address
  // off the row should not be defeated by a capital letter.
  const confirmed =
    user !== null && typedEmail.trim().toLowerCase() === user.email.toLowerCase().trim();

  const submit = () => {
    if (!user || !confirmed || del.isPending) return;
    del.mutate(
      { userId: user.id, confirmEmail: typedEmail.trim() },
      {
        onSuccess: () => {
          toast.success(`Deleted ${user.email}.`);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open && !del.isPending) onClose();
      }}
    >
      <DialogContent data-testid="admin-delete-user-dialog">
        <DialogHeader>
          <DialogTitle>{t('adm.delete.title', { email: user?.email ?? '' })}</DialogTitle>
          <DialogDescription>{t('adm.delete.desc')}</DialogDescription>
        </DialogHeader>

        <RetentionSummary creditBalance={detail.data?.walletBalance} />

        <div className="space-y-2">
          <Label htmlFor="confirm-delete-email">
            {t('adm.delete.typePrefix')} <span className="font-mono">{user?.email}</span>{' '}
            {t('adm.delete.typeSuffix')}
          </Label>
          <Input
            id="confirm-delete-email"
            autoComplete="off"
            value={typedEmail}
            onChange={(e) => setTypedEmail(e.target.value)}
            placeholder={user?.email}
          />
        </div>

        {del.isError && (
          <p className="text-destructive text-sm" role="alert" data-testid="admin-delete-error">
            {deleteErrorMessage(del.error, t)}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={onClose}
            disabled={del.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={!confirmed || del.isPending}
            onClick={submit}
          >
            {del.isPending ? 'Deleting…' : 'Delete this account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
