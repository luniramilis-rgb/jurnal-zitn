import type {
  CreateFeedbackInput,
  Feedback,
  FeedbackListQuery,
  FeedbackListResponse,
  FeedbackStatus,
} from '@jurnal-zitn/shared';
import { FEEDBACK_ADMIN_LIMIT_DEFAULT, FEEDBACK_ADMIN_LIMIT_MAX } from '@jurnal-zitn/shared';

import { db } from '@/db';
import { NotFoundError } from '@/lib/errors';
import { withTransaction } from '@/lib/transaction';

import {
  decodeFeedbackCursor,
  encodeFeedbackCursor,
  insertFeedback,
  selectFeedbackPage,
  selectUserEmail,
  updateFeedbackStatus,
  type FeedbackFilters,
  type FeedbackRow,
} from './feedback.query';

// ---------------------------------------------------------------------------
// Feedback service (ZITN-TECH-017 §10.4, F0b).
//
// No server-side telemetry: submitting a message writes one row and nothing
// else (PostHog stays off, as the doctrine requires). The user's own email is
// snapshotted from `users` at submit time.
// ---------------------------------------------------------------------------

function toFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    pageUrl: row.pageUrl,
    source: row.source,
    status: row.status,
    userEmail: row.userEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

/** `POST /api/feedback`: store one authenticated user's message. */
export async function submitFeedback(
  userId: string,
  input: CreateFeedbackInput,
): Promise<Feedback> {
  const userEmail = await selectUserEmail(db, userId);
  if (userEmail === null) throw new NotFoundError('User', userId);
  const row = await withTransaction(db, async (tx) => {
    const [created] = await insertFeedback(tx, {
      userId,
      userEmail,
      type: input.type,
      message: input.message,
      pageUrl: input.pageUrl,
      source: input.source,
    });
    return created;
  });
  return toFeedback(row);
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return FEEDBACK_ADMIN_LIMIT_DEFAULT;
  if (limit < 1) return 1;
  if (limit > FEEDBACK_ADMIN_LIMIT_MAX) return FEEDBACK_ADMIN_LIMIT_MAX;
  return limit;
}

/**
 * `GET /api/admin/feedback`: the admin inbox, newest-first, filtered by any of
 * type/status/source and cursor-paginated over `(created_at, id)`.
 */
export async function listFeedback(query: FeedbackListQuery): Promise<FeedbackListResponse> {
  const limit = clampLimit(query.limit);
  const cursor = query.cursor ? decodeFeedbackCursor(query.cursor) : null;
  const filters: FeedbackFilters = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.source ? { source: query.source } : {}),
  };

  const rows = await selectFeedbackPage(db, filters, cursor, limit);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toFeedback),
    nextCursor: hasMore && last ? encodeFeedbackCursor(last.createdAt, last.id) : null,
  };
}

/** `PATCH /api/admin/feedback/:id`: move one row to another triage status. */
export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<Feedback> {
  return withTransaction(db, async (tx) => {
    const [row] = await updateFeedbackStatus(tx, id, status);
    if (!row) throw new NotFoundError('Feedback', id);
    return toFeedback(row);
  });
}
