// ExportDataSection — the "Export data" block on the Account settings tab
// (ZITN-TECH-017, Gerbang #7/#9). It downloads everything the instance holds for
// the signed-in user as one JSON attachment via GET /api/users/me/export.
//
// The request goes through `api.download` so a 401 on the way out runs the same
// session-expiry handling as every other authed call; the body is kept as a
// Blob and saved under the server's Content-Disposition filename.

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/useLocale';
import { api } from '@/lib/api';

export function ExportDataSection() {
  const t = useT();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function startDownload() {
    setPending(true);
    setFailed(false);
    try {
      const { blob, filename } = await api.download('/users/me/export');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3" data-slot="export-data-section">
      <h3 className="text-sm font-medium">{t('settings.export.title')}</h3>
      <p className="text-muted-foreground text-sm">{t('settings.export.subtitle')}</p>
      {failed && (
        <p className="text-destructive text-sm" role="alert" data-testid="export-error">
          {t('settings.export.error')}
        </p>
      )}
      <Button
        variant="outline"
        className="cursor-pointer"
        onClick={() => void startDownload()}
        disabled={pending}
      >
        {pending ? t('settings.export.downloading') : t('settings.export.download')}
      </Button>
    </section>
  );
}
