import { useState } from 'react';

import type { MessageKey } from '@jurnal-zitn/shared';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useT } from '@/hooks/useLocale';

/**
 * Disclosure progresif (D-H5): rumus ditampilkan **dilipat** supaya jawaban
 * tetap di atas dan transparansi tetap tersedia. Isi rumus berasal dari kamus,
 * bukan diketik di komponen.
 */
export function RumusDisclosure({ formulaKey }: { formulaKey: MessageKey }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          data-testid="cek-rumus-toggle"
        >
          {open ? t('cek.formula.hide') : t('cek.formula.toggle')}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="cek-rumus">
          {t(formulaKey)}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default RumusDisclosure;
