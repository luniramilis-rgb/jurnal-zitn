import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { ChunkLoadFallback } from '@/components/ChunkLoadFallback';

// Lazy-load the Cek Risiko surface so its bundle (the calculator, both mode
// panels, and `@jurnal-zitn`'s cek-risiko math) never lands in the initial app
// bundle — the router does NOT auto-split routes; this is the _auth.changelog.tsx
// pattern.
const CekRisikoPage = lazy(() =>
  import('@/features/cek-risiko/components/CekRisikoPage').then((m) => ({
    default: m.CekRisikoPage,
  })),
);

function CekRisikoRoute() {
  return (
    <ChunkErrorBoundary fallback={({ reload }) => <ChunkLoadFallback onReload={reload} />}>
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
        <CekRisikoPage />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

export const Route = createFileRoute('/_auth/cek-risiko')({
  component: CekRisikoRoute,
});
