import { useNavigate } from '@tanstack/react-router';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/hooks/useLocale';

type AccountingTab = 'expenses' | 'fee-rollup' | 'tax-summary';

interface AccountingSubNavProps {
  activeTab: AccountingTab;
}

export function AccountingSubNav({ activeTab }: AccountingSubNavProps) {
  const t = useT();
  const navigate = useNavigate();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        navigate({ to: `/accounting/${value}` });
      }}
    >
      <TabsList>
        <TabsTrigger value="expenses" className="cursor-pointer">
          {t('acc.nav.expenses')}
        </TabsTrigger>
        <TabsTrigger value="fee-rollup" className="cursor-pointer">
          {t('acc.nav.feeRollup')}
        </TabsTrigger>
        <TabsTrigger value="tax-summary" className="cursor-pointer">
          {t('tax.page.title')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
