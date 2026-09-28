import { useState } from 'react';

import { formatNumber, type Brokerage } from '@jurnal-zitn/shared';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocale, useT } from '@/hooks/useLocale';

import { useBrokerages } from '../hooks/useBrokerages';

export function BrokerageList() {
  const t = useT();
  const { locale } = useLocale();
  const { data: brokerages, isLoading } = useBrokerages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBrokerage, setEditBrokerage] = useState<Brokerage | null>(null);

  // Placeholder: dialog component is task 15
  void dialogOpen;
  void editBrokerage;

  function formatFeeSummary(brokerage: Brokerage): string {
    const parts: string[] = [];
    const stock = Number(brokerage.feeSchedule.stockPerShareCommission);
    const option = Number(brokerage.feeSchedule.optionsPerContractCommission);

    if (stock > 0) {
      parts.push(
        t('broker.fee.perShare', {
          amount: formatNumber(brokerage.feeSchedule.stockPerShareCommission, locale),
        }),
      );
    }
    if (option > 0) {
      parts.push(
        t('broker.fee.perContract', {
          amount: formatNumber(brokerage.feeSchedule.optionsPerContractCommission, locale),
        }),
      );
    }
    if (parts.length === 0) {
      return t('broker.fee.none');
    }
    return parts.join(', ');
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        page={t('page.brokerages')}
        right={
          <Button
            className="cursor-pointer"
            onClick={() => {
              setEditBrokerage(null);
              setDialogOpen(true);
            }}
          >
            {t('broker.list.new')}
          </Button>
        }
      />

      {!brokerages?.length ? (
        <div className="py-12 text-center text-muted-foreground">{t('broker.list.empty')}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('broker.col.type')}</TableHead>
              <TableHead>{t('broker.col.feeSummary')}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {brokerages.map((brokerage) => (
              <TableRow key={brokerage.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{brokerage.name}</span>
                    {brokerage.isSystem && (
                      <p className="text-xs text-muted-foreground">{t('broker.row.approx')}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={brokerage.isSystem ? 'secondary' : 'outline'}>
                    {t(brokerage.isSystem ? 'broker.type.system' : 'broker.type.custom')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFeeSummary(brokerage)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="cursor-pointer">
                        ⋯
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {brokerage.isSystem ? (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setEditBrokerage(brokerage);
                            setDialogOpen(true);
                          }}
                        >
                          {t('common.view')}
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setEditBrokerage(brokerage);
                              setDialogOpen(true);
                            }}
                          >
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive">
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
