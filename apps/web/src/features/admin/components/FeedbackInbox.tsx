import { useState } from 'react';

import {
  FEEDBACK_SOURCES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type Feedback,
  type FeedbackSource,
  type FeedbackStatus,
  type FeedbackType,
  type MessageKey,
} from '@jurnal-zitn/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useT } from '@/hooks/useLocale';

import { useAdminFeedback, useUpdateFeedbackStatus } from '../hooks/useAdminFeedback';

const STATUS_LABEL: Record<FeedbackStatus, MessageKey> = {
  baru: 'admin.feedback.status.baru',
  ditinjau: 'admin.feedback.status.ditinjau',
  direncanakan: 'admin.feedback.status.direncanakan',
  selesai: 'admin.feedback.status.selesai',
  ditolak: 'admin.feedback.status.ditolak',
};

const SOURCE_LABEL: Record<FeedbackSource, MessageKey> = {
  jurnal: 'admin.feedback.source.jurnal',
  lembar: 'admin.feedback.source.lembar',
};

const FEEDBACK_TYPE_LABEL: Record<FeedbackType, MessageKey> = {
  bug: 'feedback.form.types.bug',
  feature: 'feedback.form.types.feature',
  general: 'feedback.form.types.general',
  question: 'feedback.form.types.question',
};

interface Filters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  source?: FeedbackSource;
}

function FeedbackPage({
  filters,
  cursor,
  isFirst,
  onNext,
}: {
  filters: Filters;
  cursor?: string;
  isFirst: boolean;
  onNext: (cursor: string) => void;
}) {
  const t = useT();
  const { data, isLoading, isError, refetch } = useAdminFeedback(filters, cursor);
  const updateStatus = useUpdateFeedbackStatus();

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={6}>
          <Skeleton className="h-5 w-full" data-testid="feedback-row-skeleton" />
        </TableCell>
      </TableRow>
    );
  }

  if (isError) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{t('admin.feedback.failed')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                void refetch();
              }}
            >
              {t('admin.feedback.retry')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (!data) return null;

  if (isFirst && data.items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-muted-foreground">
          {t('admin.feedback.empty')}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {data.items.map((row: Feedback) => (
        <TableRow key={row.id} data-testid="feedback-row">
          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
            {new Date(row.createdAt).toLocaleDateString()}
          </TableCell>
          <TableCell className="text-xs">{row.userEmail}</TableCell>
          <TableCell>{t(FEEDBACK_TYPE_LABEL[row.type])}</TableCell>
          <TableCell>
            <Badge variant="secondary">{t(SOURCE_LABEL[row.source])}</Badge>
          </TableCell>
          <TableCell className="max-w-md whitespace-pre-wrap break-words">{row.message}</TableCell>
          <TableCell>
            <select
              aria-label={t('admin.feedback.filterStatus')}
              data-testid={`feedback-status-${row.id}`}
              value={row.status}
              disabled={updateStatus.isPending}
              onChange={(event) => {
                updateStatus.mutate({
                  id: row.id,
                  status: event.target.value as FeedbackStatus,
                });
              }}
              className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
            >
              {FEEDBACK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(STATUS_LABEL[status])}
                </option>
              ))}
            </select>
          </TableCell>
        </TableRow>
      ))}
      {data.nextCursor && (
        <TableRow>
          <TableCell colSpan={6}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => onNext(data.nextCursor as string)}
            >
              {t('admin.feedback.loadMore')}
            </Button>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T | '';
  options: readonly T[];
  labels: Record<T, MessageKey>;
  onChange: (value: T | '') => void;
}) {
  const t = useT();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T | '')}
        className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
      >
        <option value="">{t('admin.feedback.all')}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {t(labels[option])}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * FeedbackInbox — the admin triage inbox (ZITN-TECH-017 §10.4, F0b). Lists the
 * user feedback captured by POST /api/feedback, filterable by type/status/
 * source, with an inline status write per row. Paged cursor-newest-first.
 */
export function FeedbackInbox() {
  const t = useT();
  const [filters, setFilters] = useState<Filters>({});
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const changeFilter = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCursors([undefined]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <FilterSelect
          label={t('admin.feedback.filterType')}
          value={filters.type ?? ''}
          options={FEEDBACK_TYPES}
          labels={FEEDBACK_TYPE_LABEL}
          onChange={(value) => changeFilter({ type: value || undefined })}
        />
        <FilterSelect
          label={t('admin.feedback.filterStatus')}
          value={filters.status ?? ''}
          options={FEEDBACK_STATUSES}
          labels={STATUS_LABEL}
          onChange={(value) => changeFilter({ status: value || undefined })}
        />
        <FilterSelect
          label={t('admin.feedback.filterSource')}
          value={filters.source ?? ''}
          options={FEEDBACK_SOURCES}
          labels={SOURCE_LABEL}
          onChange={(value) => changeFilter({ source: value || undefined })}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.feedback.colDate')}</TableHead>
            <TableHead>{t('admin.feedback.colUser')}</TableHead>
            <TableHead>{t('admin.feedback.colType')}</TableHead>
            <TableHead>{t('admin.feedback.colSource')}</TableHead>
            <TableHead>{t('admin.feedback.colMessage')}</TableHead>
            <TableHead>{t('admin.feedback.colStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cursors.map((cursor, index) => (
            <FeedbackPage
              key={`${JSON.stringify(filters)}:${cursor ?? 'first'}`}
              filters={filters}
              cursor={cursor}
              isFirst={index === 0}
              onNext={(next) => setCursors((prev) => [...prev, next])}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
