import { createFileRoute, redirect } from '@tanstack/react-router';

import { OptionsPage } from '@/features/options/components/OptionsPage';
import { isAdvisorEnabledForRoute } from '@/hooks/useRegistrationEnabled';

// The US-style options surfaces (OCC tools + the advisor-bound chain viewer) are
// withdrawn together with the advisor (A7, Fase F6). On an instance that has not
// opted in, a typed or bookmarked /options URL lands on the dashboard, matching
// the advisor routes' posture. Courtesy, not control — the chain viewer's own
// requests are refused by the advisor gate.
async function redirectWhenOptionsHidden(): Promise<void> {
  if (!(await isAdvisorEnabledForRoute())) {
    throw redirect({ to: '/dashboard' });
  }
}

export const Route = createFileRoute('/_auth/options')({
  beforeLoad: redirectWhenOptionsHidden,
  component: OptionsPage,
});
