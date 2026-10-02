import { useLocation } from '@tanstack/react-router';

import { useT } from '@/hooks/useLocale';

import { hasContext, parseContext } from '../context';

/**
 * ContextStrip — Fase 3 (ZITN-TECH-029). A slim, app-wide strip that shows the
 * context the URL is carrying (`tanggal · simbol · timeframe · akun`). It renders
 * nothing when the URL carries no context, so it never adds chrome to a plain page.
 *
 * G4 (D-G3): it no longer links to the removed `/lembar` & `/chart` journal
 * routes — the journal still carries the context, but sheet/chart live on ZITN.
 * Pure reader: no data, no computation.
 */
export function ContextStrip() {
  const t = useT();
  const { searchStr } = useLocation();
  const ctx = parseContext(searchStr);
  if (!hasContext(ctx)) return null;

  const chips: { label: string; value: string }[] = [];
  if (ctx.tanggal) chips.push({ label: t('ctx.tanggal'), value: ctx.tanggal });
  if (ctx.symbol) chips.push({ label: t('ctx.symbol'), value: ctx.symbol });
  if (ctx.tf) chips.push({ label: t('ctx.tf'), value: ctx.tf });
  if (ctx.account) chips.push({ label: t('ctx.account'), value: ctx.account });

  return (
    <div
      data-testid="context-strip"
      className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
    >
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1"
        >
          <span>{chip.label}</span>
          <span className="font-medium text-foreground">{chip.value}</span>
        </span>
      ))}
    </div>
  );
}

export default ContextStrip;
