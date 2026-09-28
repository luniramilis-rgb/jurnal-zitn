import { and, desc, eq, lt, or, sql } from 'drizzle-orm';

import type { FeedbackStatus, FeedbackType, FeedbackSource } from '@jurnal-zitn/shared';

import type { Database, Transaction } from '@/db';
import { feedback, users } from '@/db/schema';

// ---------------------------------------------------------------------------
// Feedback query layer (ZITN-TECH-017 §10.4, F0b).
//
// User-scoped inserts and reads, plus the cross-user admin inbox read — the
// latter is imported ONLY by feedback.service behind the gated /api/admin
// router. Every select names its columns explicitly.
// ---------------------------------------------------------------------------

export interface FeedbackRow {
  id: string;
  userId: string;
  userEmail: string;
  type: FeedbackType;
  message: string;
  pageUrl: string;
  source: FeedbackSource;
  status: FeedbackStatus;
  createdAt: Date;
}

const FEEDBACK_COLUMNS = {
  id: feedback.id,
  userId: feedback.userId,
  userEmail: feedback.userEmail,
  type: sql<FeedbackType>`${feedback.type}`,
  message: feedback.message,
  pageUrl: feedback.pageUrl,
  source: sql<FeedbackSource>`${feedback.source}`,
  status: sql<FeedbackStatus>`${feedback.status}`,
  createdAt: feedback.createdAt,
};

/** Insert one feedback row; used by `submitFeedback` (feedback.service). */
export function insertFeedback(
  tx: Transaction,
  data: {
    userId: string;
    userEmail: string;
    type: FeedbackType;
    message: string;
    pageUrl: string;
    source: FeedbackSource;
  },
): Promise<FeedbackRow[]> {
  return tx.insert(feedback).values(data).returning(FEEDBACK_COLUMNS);
}

/** The user's email snapshot for the feedback row; null when the user is gone. */
export async function selectUserEmail(
  db: Database | Transaction,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.email ?? null;
}

/** Encode a `(created_at, id)` tuple into a stable base64 list cursor. */
export function encodeFeedbackCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64');
}

/** Decode a base64 list cursor into its tuple, or `null` if malformed. */
export function decodeFeedbackCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf8');
    const sep = raw.indexOf('|');
    if (sep === -1) return null;
    const iso = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    const createdAt = new Date(iso);
    if (id.length === 0 || Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export interface FeedbackFilters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  source?: FeedbackSource;
}

/**
 * One page of the admin inbox, newest-first over `(created_at, id)`. Reads
 * `limit + 1` rows so the service can tell whether a next page exists.
 */
export function selectFeedbackPage(
  db: Database | Transaction,
  filters: FeedbackFilters,
  cursor: { createdAt: Date; id: string } | null,
  limit: number,
): Promise<FeedbackRow[]> {
  const conditions = [];
  if (filters.type) conditions.push(eq(feedback.type, filters.type));
  if (filters.status) conditions.push(eq(feedback.status, filters.status));
  if (filters.source) conditions.push(eq(feedback.source, filters.source));
  if (cursor) {
    conditions.push(
      or(
        lt(feedback.createdAt, cursor.createdAt),
        and(eq(feedback.createdAt, cursor.createdAt), lt(feedback.id, cursor.id)),
      ),
    );
  }

  return db
    .select(FEEDBACK_COLUMNS)
    .from(feedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(feedback.createdAt), desc(feedback.id))
    .limit(limit + 1);
}

/** A single feedback row (or none); used by the admin status write. */
export function findFeedbackById(db: Database | Transaction, id: string): Promise<FeedbackRow[]> {
  return db.select(FEEDBACK_COLUMNS).from(feedback).where(eq(feedback.id, id)).limit(1);
}

/** Move one row to a new triage status; used by the admin status write. */
export function updateFeedbackStatus(
  tx: Transaction,
  id: string,
  status: FeedbackStatus,
): Promise<FeedbackRow[]> {
  return tx
    .update(feedback)
    .set({ status, updatedAt: new Date() })
    .where(eq(feedback.id, id))
    .returning(FEEDBACK_COLUMNS);
}
