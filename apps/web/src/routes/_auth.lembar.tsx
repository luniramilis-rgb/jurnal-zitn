import { createFileRoute } from '@tanstack/react-router';

import { DailySheetContext } from '@/features/journal-context/components/DailySheetContext';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `/lembar` — "lihat lembar hari itu" (permukaan #2, ZITN-TECH-019).
 *
 * Halaman ini menampilkan **cuplikan konteks** lembar ZITN untuk satu tanggal; ia tidak merender
 * ulang lembar, tidak memakai iframe, dan tidak menyalin data. Tanggal datang dari tautan bertanggal
 * (SSO: `GET /api/auth/sso?tanggal=…` → `/?tanggal=…`, atau menu "Lembar harian").
 */
function LembarPage() {
  const { tanggal } = Route.useSearch();
  return <DailySheetContext tanggal={tanggal ?? null} />;
}

export const Route = createFileRoute('/_auth/lembar')({
  validateSearch: (search: Record<string, unknown>): { tanggal?: string } => {
    const value = typeof search.tanggal === 'string' ? search.tanggal.trim() : undefined;
    return value && DATE_RE.test(value) ? { tanggal: value } : {};
  },
  component: LembarPage,
});
