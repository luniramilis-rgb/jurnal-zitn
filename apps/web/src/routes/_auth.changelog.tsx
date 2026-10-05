import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { ChunkLoadFallback } from '@/components/ChunkLoadFallback';
import { CHANGELOG_ENABLED } from '@/lib/frontendFlags';

// Lazy-load the changelog surface so its bundle (react-markdown, remark-gfm,
// rehype-sanitize) never lands in the initial app bundle (REQ-4.7) — the
// router does NOT auto-split routes; this is the _auth.advisor.tsx pattern.
const ChangelogPage = lazy(() =>
  import('@/features/changelog/pages/ChangelogPage').then((m) => ({ default: m.ChangelogPage })),
);

function ChangelogRoute() {
  return (
    <ChunkErrorBoundary fallback={({ reload }) => <ChunkLoadFallback onReload={reload} />}>
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading changelog…</div>}>
        <ChangelogPage />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

export const Route = createFileRoute('/_auth/changelog')({
  // Hidden during the ZITN rebrand (frontendFlags.CHANGELOG_ENABLED): a direct
  // URL visit lands on the dashboard instead of the Tradr release notes.
  beforeLoad: () => {
    if (!CHANGELOG_ENABLED) throw redirect({ to: '/dashboard' });
  },
  component: ChangelogRoute,
});
