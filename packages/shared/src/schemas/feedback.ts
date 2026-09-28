import { z } from 'zod';

// In-app feedback (ZITN-TECH-017 §10.4, F0b). The closed vocabularies that cross
// the wire. The DB CHECK constraints in `apps/api/src/db/schema/feedback.schema.ts`
// are the store-level guard behind these enums.
export const FEEDBACK_TYPES = ['bug', 'feature', 'general', 'question'] as const;
export const FeedbackTypeSchema = z.enum(FEEDBACK_TYPES);
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;

export const FEEDBACK_SOURCES = ['jurnal', 'lembar'] as const;
export const FeedbackSourceSchema = z.enum(FEEDBACK_SOURCES);
export type FeedbackSource = z.infer<typeof FeedbackSourceSchema>;

// Indonesian triage states, matching the ZITN feedback posture: new / reviewed /
// planned / done / declined. `baru` is the default on insert.
export const FEEDBACK_STATUSES = [
  'baru',
  'ditinjau',
  'direncanakan',
  'selesai',
  'ditolak',
] as const;
export const FeedbackStatusSchema = z.enum(FEEDBACK_STATUSES);
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;

export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 500;
export const FEEDBACK_PAGE_URL_MAX = 2048;

export const FEEDBACK_ADMIN_LIMIT_DEFAULT = 25;
export const FEEDBACK_ADMIN_LIMIT_MAX = 100;

/** The submit body. `pageUrl` is filled by the client; `source` defaults to `jurnal`. */
export const CreateFeedbackInputSchema = z
  .object({
    type: FeedbackTypeSchema,
    message: z
      .string()
      .trim()
      .min(FEEDBACK_MESSAGE_MIN, `Message must be at least ${FEEDBACK_MESSAGE_MIN} characters`)
      .max(FEEDBACK_MESSAGE_MAX, `Message must be at most ${FEEDBACK_MESSAGE_MAX} characters`),
    pageUrl: z.string().max(FEEDBACK_PAGE_URL_MAX),
    source: FeedbackSourceSchema.default('jurnal'),
  })
  .strict();
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackInputSchema>;

/** One feedback row as the admin inbox (and the submitter's own receipt) sees it. */
export const FeedbackSchema = z.object({
  id: z.string().uuid(),
  type: FeedbackTypeSchema,
  message: z.string(),
  pageUrl: z.string(),
  source: FeedbackSourceSchema,
  status: FeedbackStatusSchema,
  userEmail: z.string(),
  createdAt: z.string(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

/** Admin inbox filters. All optional; absent fields are not filtered. */
export const FeedbackListQuerySchema = z.object({
  type: FeedbackTypeSchema.optional(),
  status: FeedbackStatusSchema.optional(),
  source: FeedbackSourceSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().optional(),
});
export type FeedbackListQuery = z.infer<typeof FeedbackListQuerySchema>;

export const FeedbackListResponseSchema = z.object({
  items: z.array(FeedbackSchema),
  nextCursor: z.string().nullable(),
});
export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>;

/** Admin triage write: move a row to another status. */
export const UpdateFeedbackStatusSchema = z.object({ status: FeedbackStatusSchema }).strict();
export type UpdateFeedbackStatusInput = z.infer<typeof UpdateFeedbackStatusSchema>;
