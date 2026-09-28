import { useState } from 'react';

import { Numeric } from '@/components/Numeric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDisplayCurrencyQuery } from '@/features/accounting/hooks/useDisplayCurrency';
import { useT } from '@/hooks/useLocale';

import {
  useCreatePlaybook,
  useDeletePlaybook,
  usePlaybooks,
  usePlaybookStats,
} from '../hooks/usePlaybooks';

const EMPTY = {
  name: '',
  setupRules: '',
  entryTrigger: '',
  exitCriteria: '',
  timeframe: '',
  instrument: '',
};

/**
 * PlaybooksPage — F4 (ZITN-TECH-017 §10.8). CRUD over the user's strategy
 * playbooks plus per-setup statistics computed at read time (soft-linked trades,
 * scoped to the display currency so figures are never summed across currencies).
 */
export function PlaybooksPage() {
  const t = useT();
  const { data: displayCurrencyData } = useDisplayCurrencyQuery();
  const currency = displayCurrencyData?.currency ?? null;
  const list = usePlaybooks();
  const stats = usePlaybookStats(currency);
  const create = useCreatePlaybook();
  const remove = useDeletePlaybook();
  const [form, setForm] = useState(EMPTY);

  const submit = () => {
    if (form.name.trim() === '') return;
    create.mutate(
      {
        name: form.name.trim(),
        ...(form.setupRules ? { setupRules: form.setupRules } : {}),
        ...(form.entryTrigger ? { entryTrigger: form.entryTrigger } : {}),
        ...(form.exitCriteria ? { exitCriteria: form.exitCriteria } : {}),
        ...(form.timeframe ? { timeframe: form.timeframe } : {}),
        ...(form.instrument ? { instrument: form.instrument } : {}),
      },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  const field = (key: keyof typeof EMPTY, label: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={form[key]}
        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('pb.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('pb.new')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {field('name', t('pb.name'))}
            {field('timeframe', t('pb.timeframe'))}
            {field('instrument', t('pb.instrument'))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {field('setupRules', t('pb.setupRules'))}
            {field('entryTrigger', t('pb.entryTrigger'))}
            {field('exitCriteria', t('pb.exitCriteria'))}
          </div>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={create.isPending}
            onClick={submit}
          >
            {t('pb.add')}
          </Button>
        </CardContent>
      </Card>

      {list.isError && <p className="text-sm text-destructive">{t('pb.failed')}</p>}

      <div className="space-y-2">
        {list.data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('pb.empty')}</p>
        )}
        {list.data?.items.map((playbook) => (
          <Card key={playbook.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div className="space-y-1">
                <p className="font-medium">{playbook.name}</p>
                {playbook.timeframe && (
                  <p className="text-sm text-muted-foreground">{playbook.timeframe}</p>
                )}
                {playbook.setupRules && <p className="text-sm">{playbook.setupRules}</p>}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => {
                  if (window.confirm(t('pb.deleteConfirm'))) remove.mutate(playbook.id);
                }}
              >
                {t('pb.delete')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('pb.stats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pb.name')}</TableHead>
                <TableHead>{t('pb.trades')}</TableHead>
                <TableHead>{t('pb.winRate')}</TableHead>
                <TableHead>{t('pb.netPnl')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {t('pb.empty')}
                  </TableCell>
                </TableRow>
              )}
              {stats.data?.items.map((row) => (
                <TableRow key={row.playbookId ?? 'unassigned'} data-testid="playbook-stat-row">
                  <TableCell>{row.name ?? t('pb.unassigned')}</TableCell>
                  <TableCell>
                    <Numeric value={row.stats.totalPositions} kind="integer" direction="none" />
                  </TableCell>
                  <TableCell>
                    <Numeric value={row.stats.winRate} kind="percent" direction="none" />
                  </TableCell>
                  <TableCell>
                    <Numeric value={row.stats.totalNetPnl} kind="decimal" direction="none" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlaybooksPage;
