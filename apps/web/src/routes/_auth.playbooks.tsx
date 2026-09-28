import { createFileRoute } from '@tanstack/react-router';

import { PlaybooksPage } from '@/features/playbook/components/PlaybooksPage';

// F4 (ZITN-TECH-017 §10.8): strategy playbooks + per-setup statistics.
export const Route = createFileRoute('/_auth/playbooks')({
  component: PlaybooksPage,
});
