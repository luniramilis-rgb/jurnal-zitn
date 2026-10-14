import { createFileRoute, redirect } from '@tanstack/react-router';

import { BrokerageList } from '@/features/brokerages/components/BrokerageList';
import { BROKERAGES_ENABLED } from '@/lib/frontendFlags';

// Hidden on request (ZITN-TECH-065 §4, frontendFlags.BROKERAGES_ENABLED): a
// typed or bookmarked /brokerages URL lands on the dashboard instead. The code
// is kept, not deleted, so flipping the flag restores it (the _auth.changelog
// pattern).
export const Route = createFileRoute('/_auth/brokerages')({
  beforeLoad: () => {
    if (!BROKERAGES_ENABLED) throw redirect({ to: '/dashboard' });
  },
  component: BrokerageList,
});
