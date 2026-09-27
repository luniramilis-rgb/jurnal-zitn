/**
 * Pure helpers for the user data export (ZITN-TECH-017, Gerbang #7/#9).
 *
 * Kept free of DB imports so they can be unit-tested without Postgres, and reused by
 * `export.service.ts` (which does the introspection and queries).
 */

/** Tables that must NEVER appear in an export (credentials, tokens, audit, system). */
export const EXPORT_DENY_TABLES = new Set<string>([
  'sessions',
  'email_tokens',
  'account_deletions',
  'account_deletion_schedules',
  'admin_audit_log',
  'sso_consumed_tokens',
  'advisor_provider_keys',
  'external_api_keys',
  'webhook_events',
  'symbols',
  'symbol_sync_state',
  '_post_migrations_journal',
  'drizzle_migrations',
]);

/**
 * Column names whose values are redacted before export. Pattern is deliberately broad:
 * a false positive only withholds a value the user can still see in the app, while a
 * false negative could leak a credential.
 */
export const EXPORT_REDACT_COLUMN_RE =
  /pass(word)?|token|secret|_key$|apikey|api_key|hash|cipher|encrypted|private|credential|webhook|stripe_secret/i;

export const REDACTED = '[redacted]';

/** SQL-quote an identifier discovered via information_schema. */
export function quoteIdent(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/** JSON-safe scalar conversion (Date/Decimal/Buffer/bigint → strings). */
export function toJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (typeof value === 'object') {
    // Decimal.js instances and other boxed objects serialise through toString().
    const maybe = value as { toJSON?: () => unknown; toString?: () => string };
    if (typeof maybe.toJSON === 'function') return maybe.toJSON();
    if (typeof maybe.toString === 'function') return maybe.toString();
    return JSON.parse(JSON.stringify(value));
  }
  return value;
}

/** Redact sensitive columns and normalise every value to JSON-safe scalars. */
export function redactRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = EXPORT_REDACT_COLUMN_RE.test(key) ? REDACTED : toJsonValue(value);
  }
  return out;
}

export interface FkEdge {
  childTable: string;
  childColumn: string;
  parentTable: string;
}

/**
 * Order tables so every table follows the tables it references, starting from the
 * user's own row. Tables not reachable from the root are dropped (they hold no data
 * for this user anyway).
 */
export function reachableTables(
  rootTable: string,
  allTables: readonly string[],
  edges: readonly FkEdge[],
): string[] {
  const children = new Map<string, { table: string; column: string }[]>();
  for (const e of edges) {
    if (!children.has(e.parentTable)) children.set(e.parentTable, []);
    children.get(e.parentTable)!.push({ table: e.childTable, column: e.childColumn });
  }
  const known = new Set(allTables);
  const order: string[] = [];
  const seen = new Set<string>();
  const queue = [rootTable];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    if (seen.has(parent)) continue;
    if (known.has(parent)) {
      seen.add(parent);
      order.push(parent);
    }
    for (const child of children.get(parent) ?? []) {
      if (!seen.has(child.table)) queue.push(child.table);
    }
  }
  return order;
}
