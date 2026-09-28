import { createFileRoute } from '@tanstack/react-router';

import { TradePlansPage } from '@/features/trade-plans/components/TradePlansPage';

// F4 (ZITN-TECH-017 §10.8): pre-trade plans + lifecycle.
export const Route = createFileRoute('/_auth/trade-plans')({
  component: TradePlansPage,
});
