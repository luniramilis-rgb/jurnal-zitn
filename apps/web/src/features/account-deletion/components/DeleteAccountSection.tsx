// DeleteAccountSection — the "Delete account" block on the Account settings tab,
// rendered below Log out (design §C11, Req 8.1/8.4).
//
// It reads the deletion status and renders one of four states:
//   - loading            → a skeleton;
//   - status read failed  → an inline error with a retry;
//   - scheduled           → the scheduled date and a neutral "Cancel deletion"
//                           control; a failed cancel keeps the state and turns
//                           the same button into the retry (Req 8.4);
//   - pending/cancelling/firing → a neutral, in-progress line, no control;
//   - no schedule         → the destructive "Delete account" button and dialog.
//
// Destructive styling is only ever on the delete action.

import { useState, type ReactNode } from 'react';

import { formatDate } from '@jurnal-zitn/shared';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale, useT } from '@/hooks/useLocale';

import { useCancelDeletion, useDeletionStatus } from '../hooks/useAccountDeletion';

import { DeleteAccountDialog } from './DeleteAccountDialog';

function Section({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <section className="space-y-3" data-slot="delete-account-section">
      <h3 className="text-sm font-medium">{t('settings.delete.title')}</h3>
      {children}
    </section>
  );
}

export function DeleteAccountSection() {
  const t = useT();
  const { locale } = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const status = useDeletionStatus();
  const cancel = useCancelDeletion();

  if (status.isLoading) {
    return (
      <Section>
        <Skeleton className="h-9 w-40" />
      </Section>
    );
  }

  if (status.isError) {
    return (
      <Section>
        <p className="text-destructive text-sm">{t('settings.delete.loadError')}</p>
        <Button variant="outline" className="cursor-pointer" onClick={() => void status.refetch()}>
          {t('settings.delete.tryAgain')}
        </Button>
      </Section>
    );
  }

  const state = status.data?.state ?? null;
  const scheduledFor = status.data?.scheduledFor ?? null;

  if (state === 'scheduled') {
    return (
      <Section>
        <p className="text-sm" data-testid="deletion-scheduled">
          {t('settings.delete.scheduledPrefix')}{' '}
          {scheduledFor ? formatDate(scheduledFor, locale) : t('settings.delete.scheduledFallback')}
          .
        </p>
        {cancel.isError && (
          <p className="text-destructive text-sm" role="alert">
            {t('settings.delete.cancelError')}
          </p>
        )}
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
        >
          {cancel.isPending ? t('settings.delete.cancelling') : t('settings.delete.cancel')}
        </Button>
      </Section>
    );
  }

  if (state === 'pending' || state === 'cancelling' || state === 'firing') {
    return (
      <Section>
        <p className="text-muted-foreground text-sm" data-testid="deletion-in-progress">
          {t('settings.delete.inProgress')}
        </p>
      </Section>
    );
  }

  return (
    <Section>
      <p className="text-muted-foreground text-sm">{t('settings.delete.warning')}</p>
      <Button variant="destructive" className="cursor-pointer" onClick={() => setDialogOpen(true)}>
        {t('settings.delete.cta')}
      </Button>
      {dialogOpen && <DeleteAccountDialog onClose={() => setDialogOpen(false)} />}
    </Section>
  );
}
