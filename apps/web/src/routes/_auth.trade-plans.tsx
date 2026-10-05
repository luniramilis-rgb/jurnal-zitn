import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { ChunkLoadFallback } from '@/components/ChunkLoadFallback';

// Lazy so the trade-plans feature stays out of the initial bundle. The active
// risk-profile line reads the private grid at runtime (a fetched query), not a
// bundled artifact.
const TradePlansPage = lazy(() =>
  import('@/features/trade-plans/components/TradePlansPage').then((m) => ({
    default: m.TradePlansPage,
  })),
);

function TradePlansRoute() {
  return (
    <ChunkErrorBoundary fallback={({ reload }) => <ChunkLoadFallback onReload={reload} />}>
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
        <TradePlansPage />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

// F4 (ZITN-TECH-017 §10.8): pre-trade plans + lifecycle.
export const Route = createFileRoute('/_auth/trade-plans')({
  component: TradePlansRoute,
});
