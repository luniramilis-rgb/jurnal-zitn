import { Link } from '@tanstack/react-router';

import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useT } from '@/hooks/useLocale';

/**
 * RecordCompletenessWidget — Fase F0 (ZITN-TECH-017 §10.3). PROCESS metrics,
 * not outcome figures: how much of the user's own record is incomplete.
 *
 *   - Open positions with no target price AND no stop loss (no plan recorded).
 *   - Closed trades with no tag.
 *   - Closed trades with no notes.
 *
 * These derive from the positions list the app already fetches; nothing here is
 * a performance claim and nothing is stored. The "unreconciled imports" item
 * links to `/import` with an explanatory hint rather than inventing a count —
 * the CSV pipeline persists no per-import reconciliation state to count.
 */
function RecordCompletenessWidget() {
  const t = useT();
  const open = usePositions({ status: 'open' });
  const closed = usePositions({ status: 'closed' });

  if (open.isLoading || closed.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  if (open.isError || closed.isError) {
    return <EmptyState title={t('w.record.errorTitle')} />;
  }

  const openRows = open.data ?? [];
  const closedRows = closed.data ?? [];

  const openWithoutPlan = openRows.filter(
    (p) => p.targetPrice == null && p.stopLoss == null,
  ).length;
  const closedWithoutTag = closedRows.filter((p) => !p.tags || p.tags.length === 0).length;
  const closedWithoutNotes = closedRows.filter(
    (p) => p.notes == null || p.notes.trim() === '',
  ).length;

  const total = openWithoutPlan + closedWithoutTag + closedWithoutNotes;

  if (total === 0) {
    return (
      <div className="flex h-full flex-col gap-2">
        <EmptyState title={t('w.record.empty')} />
        <p className="text-xs text-muted-foreground">{t('w.record.note')}</p>
      </div>
    );
  }

  const rows: { label: string; count: number }[] = [
    { label: t('w.record.openWithoutPlan'), count: openWithoutPlan },
    { label: t('w.record.closedWithoutTag'), count: closedWithoutTag },
    { label: t('w.record.closedWithoutNotes'), count: closedWithoutNotes },
  ];

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold">{row.count}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{t('w.record.import')}</span>
          <Link to="/import" className="cursor-pointer font-medium hover:underline">
            {t('w.record.importHint')}
          </Link>
        </div>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">{t('w.record.note')}</p>
      <Link to="/positions" className="cursor-pointer text-sm font-medium hover:underline">
        {t('w.record.viewPositions')}
      </Link>
    </div>
  );
}

export default RecordCompletenessWidget;
