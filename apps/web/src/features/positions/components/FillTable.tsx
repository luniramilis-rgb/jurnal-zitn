import { useState } from 'react';

import type { Fill } from '@jurnal-zitn/shared';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useT } from '@/hooks/useLocale';

import { useDeleteFill } from '../hooks/usePosition';

import { FillDialog } from './FillDialog';

interface Props {
  fills: Fill[];
  positionId: string;
  positionStatus: string;
}

export function FillTable({ fills, positionId, positionStatus }: Props) {
  const t = useT();
  const deleteFill = useDeleteFill(positionId);
  const [editFill, setEditFill] = useState<Fill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fill | null>(null);
  const isClosed = positionStatus === 'closed';

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('pos.field.type')}</TableHead>
            <TableHead className="text-right">{t('pos.field.price')}</TableHead>
            <TableHead className="text-right">{t('pos.col.qty')}</TableHead>
            <TableHead className="text-right">{t('pos.field.fees')}</TableHead>
            <TableHead>{t('pos.col.date')}</TableHead>
            <TableHead>{t('pos.field.notes')}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                No fills yet
              </TableCell>
            </TableRow>
          ) : (
            fills.map((fill) => (
              <TableRow key={fill.id}>
                <TableCell>
                  <Badge variant={fill.type === 'entry' ? 'default' : 'secondary'}>
                    {fill.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{fill.price}</TableCell>
                <TableCell className="text-right">{fill.quantity}</TableCell>
                <TableCell className="text-right">{fill.fees}</TableCell>
                <TableCell>{new Date(fill.filledAt).toLocaleString()}</TableCell>
                <TableCell className="max-w-32 truncate">{fill.notes || '—'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer">
                        ⋯
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setEditFill(fill)}
                      >
                        Edit
                      </DropdownMenuItem>
                      {!isClosed && (
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive"
                          onClick={() => setDeleteTarget(fill)}
                        >
                          {t('pos.action.delete')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {editFill && (
        <FillDialog
          open={!!editFill}
          onOpenChange={(open) => !open && setEditFill(null)}
          positionId={positionId}
          positionStatus={positionStatus}
          isClosedPosition={isClosed}
          fill={editFill}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pos.fill.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pos.fill.deleteBody', { type: deleteTarget?.type ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                if (deleteTarget) {
                  deleteFill.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              {t('pos.action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
