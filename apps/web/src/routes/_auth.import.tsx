import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { ChunkLoadFallback } from '@/components/ChunkLoadFallback';
import { useT } from '@/hooks/useLocale';

const ImportPage = lazy(() =>
  import('@/features/csv-import/components/ImportPage').then((m) => ({ default: m.ImportPage })),
);

function ImportRoute() {
  const t = useT();
  return (
    <ChunkErrorBoundary fallback={({ reload }) => <ChunkLoadFallback onReload={reload} />}>
      <Suspense fallback={<div className="p-6 text-muted-foreground">{t('import.loading')}</div>}>
        <ImportPage />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

export const Route = createFileRoute('/_auth/import')({
  component: ImportRoute,
});
