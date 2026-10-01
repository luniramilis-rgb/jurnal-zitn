import type { CsvPreviewResponse, MessageKey } from '@jurnal-zitn/shared';
import { formatNumber } from '@jurnal-zitn/shared';

import { Card, CardContent } from '@/components/ui/card';
import { useLocale, useT } from '@/hooks/useLocale';

interface PreviewSummaryProps {
  summary: CsvPreviewResponse['summary'];
}

/**
 * Top-of-preview summary counts (REQ-12.3) plus the segmentation explanation
 * (REQ-4.6) so the user's mental model matches how rows were grouped into
 * positions. Imports are additive (REQ-12.6) — repeated here as standing copy.
 */
export function PreviewSummary({ summary }: PreviewSummaryProps) {
  const t = useT();
  const { locale } = useLocale();

  const cells: Array<{ labelKey: MessageKey; value: number; tone?: 'error' }> = [
    { labelKey: 'import.summary.rowsParsed', value: summary.rowsParsed },
    { labelKey: 'import.summary.rowsValid', value: summary.rowsValid },
    {
      labelKey: 'import.summary.rowsWithErrors',
      value: summary.rowsWithErrors,
      tone: summary.rowsWithErrors > 0 ? 'error' : undefined,
    },
    { labelKey: 'import.summary.positions', value: summary.positions },
    { labelKey: 'import.summary.fills', value: summary.fills },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {cells.map((c) => (
            <div key={c.labelKey}>
              <div
                className={
                  c.tone === 'error'
                    ? 'text-2xl font-semibold text-destructive'
                    : 'text-2xl font-semibold'
                }
              >
                {formatNumber(c.value, locale, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">{t(c.labelKey)}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{t('import.summary.segmentation')}</p>
      </CardContent>
    </Card>
  );
}
