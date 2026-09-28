import { z } from 'zod';

import { PerformanceStatsSchema } from './performance';

// F4 — strategy playbooks (ZITN-TECH-017 §10.8).
export const PLAYBOOK_NAME_MAX = 120;

export const PlaybookSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  setupRules: z.string().nullable(),
  entryTrigger: z.string().nullable(),
  exitCriteria: z.string().nullable(),
  timeframe: z.string().nullable(),
  instrument: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Playbook = z.infer<typeof PlaybookSchema>;

export const CreatePlaybookInputSchema = z
  .object({
    name: z.string().trim().min(1).max(PLAYBOOK_NAME_MAX),
    setupRules: z.string().max(4000).optional(),
    entryTrigger: z.string().max(2000).optional(),
    exitCriteria: z.string().max(2000).optional(),
    timeframe: z.string().max(32).optional(),
    instrument: z.string().max(64).optional(),
  })
  .strict();
export type CreatePlaybookInput = z.infer<typeof CreatePlaybookInputSchema>;

export const UpdatePlaybookInputSchema = CreatePlaybookInputSchema.partial();
export type UpdatePlaybookInput = z.infer<typeof UpdatePlaybookInputSchema>;

export const PlaybookListResponseSchema = z.object({ items: z.array(PlaybookSchema) });
export type PlaybookListResponse = z.infer<typeof PlaybookListResponseSchema>;

// Per-setup statistics are computed at READ time by joining trades on
// `positions.playbook_id` (a soft link). `playbookId: null` is the "unassigned"
// bucket — trades with no playbook, or whose playbook was deleted.
export const PlaybookSetupStatsSchema = z.object({
  playbookId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  stats: PerformanceStatsSchema,
});
export type PlaybookSetupStats = z.infer<typeof PlaybookSetupStatsSchema>;

export const PlaybookStatsResponseSchema = z.object({ items: z.array(PlaybookSetupStatsSchema) });
export type PlaybookStatsResponse = z.infer<typeof PlaybookStatsResponseSchema>;
