import { useNavigate } from '@tanstack/react-router';

import { CLASSIFICATIONS } from '@jurnal-zitn/shared';
import type { MessageKey } from '@jurnal-zitn/shared';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/hooks/useLocale';

type Classification = (typeof CLASSIFICATIONS)[number];

const RESULT_KEYS: Record<Classification, MessageKey> = {
  winning: 'pos.filter.winning',
  losing: 'pos.filter.losing',
  breakeven: 'pos.filter.breakeven',
};

interface Props {
  /** The active classification, or 'all' when the result filter is unset. */
  value: string;
}

/**
 * The result (winning/losing/breakeven) filter for the positions list. It writes
 * only `classification` into the URL — status and tag ride through untouched via
 * `...prev`, so it composes with the status tabs and the tag filter (REQ-9.5).
 */
export function ClassificationFilter({ value }: Props) {
  const t = useT();
  const navigate = useNavigate();

  // "All" plus one entry per classification, in the enum's order.
  const resultOptions: { value: string; label: string }[] = [
    { value: 'all', label: t('pos.filter.all') },
    ...CLASSIFICATIONS.map((c) => ({ value: c, label: t(RESULT_KEYS[c]) })),
  ];

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        navigate({
          to: '/positions',
          search: (prev) => ({
            ...prev,
            classification: next === 'all' ? undefined : (next as Classification),
          }),
        })
      }
    >
      <SelectTrigger className="cursor-pointer" aria-label={t('pos.filter.result')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {resultOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
