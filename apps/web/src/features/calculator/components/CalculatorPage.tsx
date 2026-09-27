import { PageHeader } from '@/components/layout/PageHeader';
import { useT } from '@/hooks/useLocale';

import { CalculatorForm } from './CalculatorForm';

export function CalculatorPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <PageHeader page={t('calc.page.title')} className="mb-2" />
        <p className="text-sm text-muted-foreground">
          Plan position size and risk/reward before placing a trade.
        </p>
      </div>

      <CalculatorForm />
    </div>
  );
}
