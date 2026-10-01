import type { LocatedError, LocatedWarning } from '@jurnal-zitn/shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/useLocale';

import { issueErrorKey, issueWarningKey } from '../lib/issueCopy';

interface IssueListProps {
  errors: LocatedError[];
  warnings: LocatedWarning[];
}

/**
 * Located errors (blocking) and warnings (non-blocking) for the preview
 * (REQ-12.3). Errors use the danger token so the user sees exactly which
 * row/column/field is wrong; warnings (duplicates, inferred direction, missing
 * fees column, rounding) use the warning token and do not block confirm.
 *
 * Salinan galat/peringatan dipilih dari KODE (`issueCopy.ts`), bukan `message`
 * mentah berbahasa Inggris dari server — pengguna ID membaca penjelasan ID
 * (ZITN-TECH-021 §5.14 butir 5). Kalimat lokasi dirakit dari kunci kamus, bukan
 * literal.
 */
export function IssueList({ errors, warnings }: IssueListProps) {
  const t = useT();

  function location(rowNumber?: number, csvColumn?: string, journalField?: string): string {
    const parts: string[] = [];
    if (rowNumber && rowNumber > 0) parts.push(t('import.issue.row', { row: rowNumber }));
    if (csvColumn) parts.push(t('import.issue.column', { column: csvColumn }));
    if (journalField) parts.push(t('import.issue.field', { field: journalField }));
    return parts.join(' · ');
  }

  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              {t('import.issue.errorsTitle', { n: errors.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {errors.map((e, i) => {
              const loc = location(e.rowNumber, e.csvColumn, e.journalField);
              return (
                <div
                  key={`${e.code}-${i}`}
                  className="rounded-md bg-destructive/10 p-2 text-sm text-foreground"
                >
                  {loc && <span className="font-medium text-destructive">{loc}: </span>}
                  <span>
                    {t(issueErrorKey(e.code), {
                      field: e.journalField ?? '',
                      column: e.csvColumn ?? '',
                    })}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-base text-warning">
              {t('import.issue.warningsTitle', { n: warnings.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.map((w, i) => {
              const loc = location(w.rowNumber, w.csvColumn);
              return (
                <div
                  key={`${w.kind}-${i}`}
                  className="rounded-md bg-warning/10 p-2 text-sm text-foreground"
                >
                  {loc && <span className="font-medium text-warning">{loc}: </span>}
                  <span>{t(issueWarningKey(w.kind), { column: w.csvColumn ?? '' })}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
