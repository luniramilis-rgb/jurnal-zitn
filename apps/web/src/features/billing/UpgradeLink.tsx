// UpgradeLink — the shared upgrade CTA for the gated surfaces (plan-tiers
// design Component 12, D17; REQ-13.1). A small outline button linking into the
// billing tab that fires `upgrade_cta_clicked { surface }` with a per-surface
// value BEFORE navigating. Callers gate its rendering on their own conditions
// (gating on / purchasable) — this component never fetches.
//
// R12 (ZITN-TECH-021 §5.6): the label is a dictionary KEY, not a hardcoded
// default string — a money/offer surface must not carry an unlocalizable label.

import { Link } from '@tanstack/react-router';

import type { MessageKey } from '@jurnal-zitn/shared';

import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/useLocale';
import { captureClientEvent } from '@/lib/telemetry/posthog';
import { cn } from '@/lib/utils';

export interface UpgradeLinkProps {
  /** D17 funnel surface identifier — one distinct value per gated surface. */
  surface: string;
  /** Dictionary key; defaults to the shared `billing.upgrade` copy. */
  label?: MessageKey;
  className?: string;
}

export function UpgradeLink({ surface, label = 'billing.upgrade', className }: UpgradeLinkProps) {
  const t = useT();
  return (
    <Button asChild size="sm" variant="outline" className={cn('cursor-pointer', className)}>
      <Link
        to="/settings/billing"
        data-testid={`upgrade-cta-${surface}`}
        onClick={() => captureClientEvent('upgrade_cta_clicked', { surface })}
      >
        {t(label)}
      </Link>
    </Button>
  );
}
