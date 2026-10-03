import type { CekRisikoVerdict, CekRisikoVerdictLevel } from '@jurnal-zitn/shared';

import { useT } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

/**
 * Satu baris status risiko (D-H2): tiga tingkat aman/kuning/tinggi dengan
 * **warna + teks**. Deskriptif, bukan perintah — tidak ada ajakan bertindak.
 */
const LEVEL_CLASSES: Record<CekRisikoVerdictLevel, string> = {
  aman: 'border-success/50 bg-success/10 text-success',
  kuning: 'border-warning/50 bg-warning/10 text-warning',
  tinggi: 'border-destructive/50 bg-destructive/10 text-destructive',
};

export function VerdictBanner({ verdict }: { verdict: CekRisikoVerdict }) {
  const t = useT();
  return (
    <div
      data-testid="cek-verdict"
      data-level={verdict.level}
      role="status"
      className={cn(
        'rounded-md border px-3 py-2 text-sm font-medium',
        LEVEL_CLASSES[verdict.level],
      )}
    >
      <span className="mr-1 font-semibold">{t('cek.verdict.title')}:</span>
      {t(`cek.verdict.${verdict.level}`)}
    </div>
  );
}

export default VerdictBanner;
