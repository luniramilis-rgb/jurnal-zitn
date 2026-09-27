import { describe, expect, it } from 'vitest';

import {
  EXPORT_DENY_TABLES,
  reachableTables,
  redactRow,
  quoteIdent,
  toJsonValue,
  type FkEdge,
} from './export.helpers';

describe('toJsonValue', () => {
  it('normalises Date, Buffer, bigint and object', () => {
    const d = new Date('2026-09-26T12:00:00.000Z');
    expect(toJsonValue(d)).toBe('2026-09-26T12:00:00.000Z');
    expect(toJsonValue(10n)).toBe('10');
    expect(toJsonValue(Buffer.from('hi'))).toBe('aGk=');
    expect(toJsonValue({ toJSON: () => 'x' })).toBe('x');
    expect(toJsonValue(null)).toBeNull();
    expect(toJsonValue(42)).toBe(42);
  });
});

describe('redactRow', () => {
  it('redacts credential-shaped columns and keeps the rest', () => {
    const out = redactRow({
      id: 'u1',
      email: 'a@b.c',
      password_hash: 'bcrypt$...',
      token_hash: 'deadbeef',
      stripe_secret_key: 'sk_live',
      display_currency: 'IDR',
    });
    expect(out.id).toBe('u1');
    expect(out.email).toBe('a@b.c');
    expect(out.display_currency).toBe('IDR');
    expect(out.password_hash).toBe('[redacted]');
    expect(out.token_hash).toBe('[redacted]');
    expect(out.stripe_secret_key).toBe('[redacted]');
  });

  it('does not redact ordinary columns that merely contain a keyword', () => {
    const out = redactRow({ key: 'v', monkey: 'v', tokenizer: 'v' });
    // `tokenizer` contains "token" → redacted by the broad pattern (fails safe);
    // `key`/`monkey` pass through.
    expect(out.key).toBe('v');
    expect(out.monkey).toBe('v');
    expect(out.tokenizer).toBe('[redacted]');
  });
});

describe('quoteIdent', () => {
  it('quotes and escapes embedded quotes', () => {
    expect(quoteIdent('users')).toBe('"users"');
    expect(quoteIdent('we"ird')).toBe('"we""ird"');
  });
});

describe('reachableTables', () => {
  const all = ['users', 'accounts', 'positions', 'fills', 'symbols', 'sessions'];
  const edges: FkEdge[] = [
    { childTable: 'accounts', childColumn: 'user_id', parentTable: 'users' },
    { childTable: 'positions', childColumn: 'account_id', parentTable: 'accounts' },
    { childTable: 'fills', childColumn: 'position_id', parentTable: 'positions' },
    { childTable: 'sessions', childColumn: 'user_id', parentTable: 'users' },
  ];

  it('orders parents before children and roots at users', () => {
    const order = reachableTables('users', all, edges);
    expect(order[0]).toBe('users');
    expect(order.indexOf('accounts')).toBeLessThan(order.indexOf('positions'));
    expect(order.indexOf('positions')).toBeLessThan(order.indexOf('fills'));
  });

  it('drops tables unreachable from the root', () => {
    const order = reachableTables('users', all, edges);
    expect(order).not.toContain('symbols');
  });
});

describe('EXPORT_DENY_TABLES', () => {
  it('never exports credentials, tokens, audit or system tables', () => {
    for (const t of ['sessions', 'email_tokens', 'admin_audit_log', 'sso_consumed_tokens']) {
      expect(EXPORT_DENY_TABLES.has(t)).toBe(true);
    }
  });
});
