import { useCallback, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SHORTCUT_SEQUENCES, useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useT } from '@/hooks/useLocale';

/**
 * GlobalShortcuts — F6 (ZITN-TECH-017 §10.9). Mounts the global `g <letter>`
 * navigation shortcuts and a `?` help dialog listing them. Mounted once in the
 * authenticated layout so it is present on every app page and nowhere public.
 */
export function GlobalShortcuts() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const onHelp = useCallback(() => setOpen(true), []);
  useGlobalShortcuts({ onHelp });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="shortcut-help">
        <DialogHeader>
          <DialogTitle>{t('shortcut.title')}</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1 text-sm">
          {SHORTCUT_SEQUENCES.map((shortcut) => (
            <li key={shortcut.key} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t(shortcut.labelKey)}</span>
              <kbd className="rounded border px-2 py-0.5 font-mono text-xs">g {shortcut.key}</kbd>
            </li>
          ))}
          <li className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t('shortcut.help')}</span>
            <kbd className="rounded border px-2 py-0.5 font-mono text-xs">?</kbd>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">{t('shortcut.hint')}</p>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalShortcuts;
