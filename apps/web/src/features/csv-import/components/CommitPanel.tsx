import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { CsvCommitResponse, CsvPreviewResponse } from '@jurnal-zitn/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UpgradeLink } from '@/features/billing/UpgradeLink';
import { useTierState } from '@/features/billing/useTierState';
import { useT } from '@/hooks/useLocale';
import { apiErrorCode } from '@/lib/api-error';

import { useCsvCommit } from '../hooks/useCsvCommit';
import { commitErrorKey } from '../lib/issueCopy';

interface CommitPanelProps {
  preview: CsvPreviewResponse;
  /** Re-run preview with the current (unchanged) mapping — used by the superseded refusal. */
  onRePreview: () => void;
  isRePreviewing: boolean;
}

/**
 * Confirm/commit controls and result/refusal rendering (REQ-12.3/12.4, design
 * Component 13 steps 4–5).
 *
 * - Confirm is DISABLED while blocking errors remain (`committable === false`).
 * - Near-total (≥90%) duplicate overlap (`requiresDuplicateAffirmation`) requires
 *   a DISTINCT affirmation — a separate checkbox mapped to `confirmDuplicates`,
 *   not the normal confirm — before commit is allowed.
 * - Success → summary + link to imported positions (cache invalidation handled by
 *   the commit hook).
 * - Failure keeps the preview/mapping intact; a SUPERSEDED 409 shows the specific
 *   re-preview message rather than a generic error.
 *
 * Salinan refusal dipilih dari KODE via `issueCopy.ts` (bukan `message` server
 * mentah) — ZITN-TECH-021 §5.14 butir 5.
 */
export function CommitPanel({ preview, onRePreview, isRePreviewing }: CommitPanelProps) {
  const t = useT();
  const commit = useCsvCommit();
  const { data: tierState } = useTierState();
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);

  const result = commit.data as CsvCommitResponse | undefined;
  const error = commit.error;
  const code = error ? apiErrorCode(error) : undefined;
  const superseded = code === 'CSV_IMPORT_SUPERSEDED';
  // Plan-tiers L6 refusal (REQ-10.3/11.5) — mapped on the CODE only. The
  // staged preview survives a tier refusal server-side, so the same token is
  // re-committable after an upgrade (no re-upload).
  const tierLimited = code === 'TIER_LIMIT_CSV_IMPORTS';

  if (result) {
    return (
      <Card className="border-success/50">
        <CardHeader>
          <CardTitle className="text-base text-success">
            {t('import.commit.successTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {t('import.commit.success', {
              positions: result.positionsCreated,
              fills: result.fillsCreated,
            })}
          </p>
          <Button asChild className="cursor-pointer">
            <Link to="/positions">{t('import.commit.viewPositions')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const blocked = !preview.committable;
  const needsDupAffirmation = preview.requiresDuplicateAffirmation;
  const canCommit = !blocked && (!needsDupAffirmation || confirmDuplicates) && !commit.isPending;

  function runCommit() {
    commit.mutate({ token: preview.token, confirmDuplicates });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('import.commit.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blocked && <p className="text-sm text-destructive">{t('import.commit.blocked')}</p>}

        {needsDupAffirmation && (
          <label className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 cursor-pointer"
              checked={confirmDuplicates}
              onChange={(e) => setConfirmDuplicates(e.target.checked)}
            />
            <span>{t('import.commit.duplicates')}</span>
          </label>
        )}

        {error != null &&
          (tierLimited ? (
            <div
              data-testid="csv-tier-refusal"
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3"
            >
              <span className="text-sm text-destructive">{t('import.commit.tierLimit')}</span>
              {tierState?.purchasable && <UpgradeLink surface="csv-import" />}
            </div>
          ) : (
            <p className="text-sm text-destructive">
              {superseded ? t('import.commit.superseded') : t(commitErrorKey(code))}
            </p>
          ))}

        <div className="flex gap-2">
          {superseded ? (
            <Button
              type="button"
              className="cursor-pointer"
              onClick={onRePreview}
              disabled={isRePreviewing}
            >
              {isRePreviewing ? t('import.commit.rePreviewing') : t('import.commit.rePreview')}
            </Button>
          ) : (
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!canCommit}
              onClick={runCommit}
            >
              {commit.isPending ? t('import.commit.importing') : t('import.commit.submit')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
