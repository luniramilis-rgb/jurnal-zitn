/**
 * User data export (ZITN-TECH-017, Gerbang #7/#9). Returns everything the instance
 * holds for one user as a single JSON document, with credentials redacted.
 */

import { db } from '@/db';

import { EXPORT_DENY_TABLES, reachableTables, redactRow } from './export.helpers';
import { fetchScopedRows, introspect } from './export.query';

export interface ExportBundle {
  format: 'jurnal-zitn-export';
  version: 1;
  exportedAt: string;
  userId: string;
  tables: Record<string, Record<string, unknown>[]>;
  truncatedTables: string[];
}

/** Prefer the most inclusive parent when several scope edges reach one table. */
const PARENT_PRIORITY = ['users', 'accounts', 'positions', 'advisor_conversations'];
const priority = (name: string): number => {
  const i = PARENT_PRIORITY.indexOf(name);
  return i === -1 ? PARENT_PRIORITY.length : i;
};

export async function exportUserData(userId: string): Promise<ExportBundle> {
  const schema = await introspect(db);
  const order = reachableTables('users', schema.tables, schema.edges);

  const idsByTable = new Map<string, unknown[]>();
  const tables: Record<string, Record<string, unknown>[]> = {};
  const truncatedTables: string[] = [];

  for (const table of order) {
    if (EXPORT_DENY_TABLES.has(table)) continue;

    let scope: { column: string; values: unknown[] } | null = null;
    if (table === 'users') {
      scope = { column: 'id', values: [userId] };
    } else {
      const inbound = schema.edges
        .filter((e) => e.childTable === table && e.parentTable !== table)
        .sort((a, b) => priority(a.parentTable) - priority(b.parentTable));
      for (const edge of inbound) {
        const parentIds = idsByTable.get(edge.parentTable);
        if (parentIds && parentIds.length > 0) {
          scope = { column: edge.childColumn, values: parentIds };
          break;
        }
      }
      // No parent the user owns → this table holds nothing for them.
      if (!scope) continue;
    }

    const { rows, truncated } = await fetchScopedRows(db, table, scope);
    tables[table] = rows.map(redactRow);
    if (truncated) truncatedTables.push(table);

    const ids = rows
      .map((r) => r.id)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (ids.length > 0) idsByTable.set(table, ids);
  }

  return {
    format: 'jurnal-zitn-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    tables,
    truncatedTables,
  };
}
