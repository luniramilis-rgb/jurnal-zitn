import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ReportingTimezoneSelect } from '@/components/ReportingTimezoneSelect';
import { UILanguageSelect } from '@/components/UILanguageSelect';
import { DisplayCurrencySelect } from '@/features/accounting/components/DisplayCurrencySelect';
import { ExchangeRatesPage } from '@/features/accounting/components/ExchangeRatesPage';
import { BuyingPowerBasisSelect } from '@/features/calculator/components/BuyingPowerBasisSelect';

// FX/display-currency settings live under the Profile tab (design §Component 8).
const ProfileSearchSchema = z.object({
  base: z.string().length(3).optional(),
  quote: z.string().length(3).optional(),
});

function SettingsProfile() {
  const { base, quote } = Route.useSearch();
  return (
    <div className="space-y-8">
      <UILanguageSelect />
      <DisplayCurrencySelect />
      <BuyingPowerBasisSelect />
      {/* Reporting timezone — viewable and changeable here whether or not the
          user ever saw onboarding. */}
      <ReportingTimezoneSelect />
      <ExchangeRatesPage initialBase={base} initialQuote={quote} />
    </div>
  );
}

export const Route = createFileRoute('/_auth/settings/profile')({
  validateSearch: ProfileSearchSchema,
  component: SettingsProfile,
});
