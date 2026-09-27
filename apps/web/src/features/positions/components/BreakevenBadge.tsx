// A neutral chip in the same register as PositionStatusChip. Net P&L that rounds
// to zero in the account currency is neither a win nor a loss, so the chip wears
// the flat token behind a hairline outline — never gain, loss or amber (R9.4).
// The accessible name spells out what "breakeven" means; the visible text stays
// short.
import { useT } from '@/hooks/useLocale';

export function BreakevenBadge() {
  const t = useT();
  return (
    <span
      aria-label={t('pos.breakeven.aria')}
      className="inline-flex items-center rounded-full border border-hairline px-2 py-px font-mono text-xs tracking-[0.06em] text-flat"
    >
      {t('pos.filter.breakeven')}
    </span>
  );
}
