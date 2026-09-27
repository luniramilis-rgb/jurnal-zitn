/**
 * User data export — query layer (ZITN-TECH-017, Gerbang #7/#9).
 *
 * Discovers the user's rows by walking the foreign-key graph from `users`, so a table
 * added later is exported automatically without editing a hand list. Identifiers come
 * from `information_schema` and are quoted; values are always bound parameters.
 */

import { sql } from 'drizzle-orm';

import type { Database } from '@/db';

import { quoteIdent, type FkEdge } from './export.helpers';

/** Hard cap per table so one runaway table cannot exhaust memory. */
export const EXPORT_ROW_CAP = 200_000;

export interface SchemaMap {
  tables: string[];
  columns: { table: string; column: string }[];
  edges: FkEdge[];
}

/** Columns that denote a user scope even when the FK constraint is absent. */
const SYNTHETIC_PARENTS: { column: string; parent: string }[] = [
  { column: 'user_id', parent: 'users' },
  { column: 'account_id', parent: 'accounts' },
  { column: 'position_id', parent: 'positions' },
  { column: 'conversation_id', parent: 'advisor_conversations' },
];

export async function introspect(db: Database): Promise<SchemaMap> {
  const tablesRes = (await db.execute(
    sql`SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  )) as unknown as { table_name: string }[];

  const colsRes = (await db.execute(
    sql`SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public'`,
  )) as unknown as { table_name: string; column_name: string }[];

  const fkRes = (await db.execute(
    sql`SELECT tc.table_name AS child_table, kcu.column_name AS child_column,
               ccu.table_name AS parent_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
  )) as unknown as { child_table: string; child_column: string; parent_table: string }[];

  const tables = tablesRes.map((r) => r.table_name);
  const columns = colsRes.map((r) => ({ table: r.table_name, column: r.column_name }));

  const edges: FkEdge[] = fkRes.map((r) => ({
    childTable: r.child_table,
    childColumn: r.child_column,
    parentTable: r.parent_table,
  }));
  // Add synthetic scope edges for columns that lack an FK constraint.
  const tableSet = new Set(tables);
  for (const c of columns) {
    for (const s of SYNTHETIC_PARENTS) {
      if (c.column === s.column && tableSet.has(s.parent) && c.table !== s.parent) {
        edges.push({ childTable: c.table, childColumn: c.column, parentTable: s.parent });
      }
    }
  }

  return { tables, columns, edges };
}

export interface FetchResult {
  rows: Record<string, unknown>[];
  truncated: boolean;
}

/** `SELECT *` for one table, scoped by a parent-id list (or the whole table for the root). */
export async function fetchScopedRows(
  db: Database,
  table: string,
  scope: { column: string; values: unknown[] } | null,
): Promise<FetchResult> {
  const target = quoteIdent(table);
  const limit = EXPORT_ROW_CAP + 1;

  if (!scope) {
    const res = (await db.execute(
      sql`SELECT * FROM ${sql.raw(target)} LIMIT ${limit}`,
    )) as unknown as Record<string, unknown>[];
    return { rows: res.slice(0, EXPORT_ROW_CAP), truncated: res.length > EXPORT_ROW_CAP };
  }

  const list = sql.join(
    scope.values.map((v) => sql`${v}`),
    sql`, `,
  );
  const res = (await db.execute(
    sql`SELECT * FROM ${sql.raw(target)} WHERE ${sql.raw(quoteIdent(scope.column))} IN (${list}) LIMIT ${limit}`,
  )) as unknown as Record<string, unknown>[];
  return { rows: res.slice(0, EXPORT_ROW_CAP), truncated: res.length > EXPORT_ROW_CAP };
}
