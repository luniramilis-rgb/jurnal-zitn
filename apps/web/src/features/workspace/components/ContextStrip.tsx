import { Link, useLocation } from '@tanstack/react-router';

import { useT } from '@/hooks/useLocale';

import { hasContext, parseContext } from '../context';

/**
 * ContextStrip — Fase 3 (ZITN-TECH-029). A slim, app-wide strip that shows the
 * context the URL is carrying (`tanggal · simbol · timeframe · akun`) and gives a
 * one-click way back to that day's sheet. It renders nothing when the URL carries
 * no context, so it never adds chrome to a plain page.
 *
 * Pure reader: no data, no computation — the "one thread of context" made visible.
 */
export function ContextStrip() {
  const t = useT();
  const { searchStr } = useLocation();
  const ctx = parseContext(searchStr);
  if (!hasContext(ctx)) return null;

  const params = new URLSearchParams(searchStr);
  const market = params.get('market') === 'us' || params.get('pasar') === 'us' ? 'us' : 'id';

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
      {/* Benang konteks: tautan antar-permukaan jurnal yang MEMBAWA konteks (Fase 3c). */}
      {ctx.tanggal && (
        <Link to="/lembar" search={{ tanggal: ctx.tanggal }} className="cursor-pointer underline">
          {t('ctx.sheet')}
        </Link>
      )}
      {ctx.symbol && (
        <Link
          to="/chart"
          search={{
            symbol: ctx.symbol,
            ...(ctx.tf ? { tf: ctx.tf } : {}),
            ...(market === 'us' ? { pasar: 'us' } : {}),
          }}
          className="cursor-pointer underline"
        >
          {t('ctx.chart')}
        </Link>
      )}
    </div>
  );
}

export default ContextStrip;
