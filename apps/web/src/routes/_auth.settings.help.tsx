import { createFileRoute } from '@tanstack/react-router';

import { WalkthroughLauncher } from '@/features/onboarding/components/WalkthroughLauncher';
import { useT } from '@/hooks/useLocale';

function SettingsHelp() {
  const t = useT();
  return (
    <div className="space-y-6" data-slot="settings-help">
      <div>
        <h2 className="text-lg font-medium">{t('onboard.help.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboard.help.subtitle')}</p>
      </div>

      <WalkthroughLauncher />
    </div>
  );
}

export const Route = createFileRoute('/_auth/settings/help')({
  component: SettingsHelp,
});
