import type { BuyingPowerBasis } from '@jurnal-zitn/shared';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBuyingPowerBasisMutation,
  useBuyingPowerBasisQuery,
} from '@/features/calculator/hooks/useBuyingPowerBasis';
import { useT } from '@/hooks/useLocale';

/**
 * Which account figure the position-sizing calculator caps position size against.
 *
 * Mounted on the settings Profile tab beside `DisplayCurrencySelect`, following
 * the same query/mutation shape.
 *
 * The copy has to carry the asymmetry, because the two options are not equally
 * safe. Capping against total equity double-counts capital already deployed and
 * will size a position the account cannot fund — the user finds out at the
 * broker. Capping against cash is at worst conservative. Hence the default, and
 * hence naming the consequence rather than describing the mechanism.
 */
export function BuyingPowerBasisSelect() {
  const t = useT();
  const { data, isLoading } = useBuyingPowerBasisQuery();
  const mutation = useBuyingPowerBasisMutation();

  const selected = data?.basis;

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <h2 className="text-lg font-semibold">{t('calc.basis.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Which figure the calculator caps position size against. Your risk percentage is always a
          percentage of the account balance — this changes only the size ceiling.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="buyingPowerBasis">{t('calc.basis.capBy')}</Label>
        {isLoading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <Select
            value={selected}
            onValueChange={(val) => mutation.mutate(val as BuyingPowerBasis)}
            disabled={mutation.isPending}
          >
            <SelectTrigger id="buyingPowerBasis" className="w-64 cursor-pointer">
              <SelectValue placeholder={t('calc.basis.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t('calc.basis.cash')}</SelectItem>
              <SelectItem value="balance">{t('calc.basis.balance')}</SelectItem>
            </SelectContent>
          </Select>
        )}
        <p className="text-sm text-muted-foreground">
          {selected === 'balance'
            ? 'Sizing against total equity can suggest a position larger than your available cash when you already hold open positions.'
            : 'Cash is your balance less the cost basis of open positions, so the calculator will not suggest a position you cannot fund.'}
        </p>
      </div>
    </div>
  );
}
