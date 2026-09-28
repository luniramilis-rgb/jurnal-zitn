import type { Brokerage } from '@jurnal-zitn/shared';

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
import { useT } from '@/hooks/useLocale';

interface DeleteBrokerageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brokerage: Brokerage;
  referencedAccountNames?: string[];
  onConfirm: () => void;
}

export function DeleteBrokerageDialog({
  open,
  onOpenChange,
  brokerage,
  referencedAccountNames = [],
  onConfirm,
}: DeleteBrokerageDialogProps) {
  const t = useT();
  const hasReferences = referencedAccountNames.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('broker.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(hasReferences ? 'broker.delete.bodyReferenced' : 'broker.delete.body', {
              name: brokerage.name,
              names: referencedAccountNames.join(', '),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction className="cursor-pointer" variant="destructive" onClick={onConfirm}>
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
