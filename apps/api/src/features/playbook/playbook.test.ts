import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { db } from '@/db';
import { playbooks, tradePlans, users } from '@/db/schema';

// F4 playbooks (ZITN-TECH-017 §10.8): user-scoped CRUD, read-time stats, and the
// soft-link contract — deleting a playbook leaves every trading row alone.

let ipCounter = 0;
function uniqueIp() {
  return `10.55.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
}
let seedCounter = 0;
const runId = Date.now();
function uniqueEmail(tag: string) {
  return `pb-it-${runId}-${++seedCounter}-${tag}@example.com`;
}

function getCookieValue(res: Response, name: string): string | undefined {
  for (const header of res.headers.getSetCookie()) {
    const match = header.match(new RegExp(`${name}=([^;]*)`));
    if (match) return match[1];
  }
  return undefined;
}

async function register(): Promise<{ cookie: string; email: string; id: string }> {
  const email = uniqueEmail('user');
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': uniqueIp() },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  expect(res.status).toBe(201);
  const cookie = getCookieValue(res, 'session')!;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return { cookie, email, id: user!.id };
}

function authed(method: string, path: string, cookie: string, body?: unknown) {
  const headers: Record<string, string> = {
    Cookie: `session=${cookie}`,
    'X-Forwarded-For': uniqueIp(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return app.request(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(async () => {
  await db.delete(tradePlans);
  await db.delete(playbooks);
});

describe('playbooks CRUD', () => {
  it('requires a session', async () => {
    const res = await app.request('/api/playbooks');
    expect(res.status).toBe(401);
  });

  it('creates, lists, reads, updates and deletes a playbook', async () => {
    const { cookie } = await register();

    const created = await authed('POST', '/api/playbooks', cookie, {
      name: 'Breakout',
      setupRules: 'Above prior high on volume',
      timeframe: '15m',
    });
    expect(created.status).toBe(201);
    const playbook = (await created.json()) as { id: string; name: string };
    expect(playbook.name).toBe('Breakout');

    const list = await authed('GET', '/api/playbooks', cookie);
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1);

    const got = await authed('GET', `/api/playbooks/${playbook.id}`, cookie);
    expect(got.status).toBe(200);

    const patched = await authed('PATCH', `/api/playbooks/${playbook.id}`, cookie, {
      name: 'Breakout v2',
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { name: string }).name).toBe('Breakout v2');

    const removed = await authed('DELETE', `/api/playbooks/${playbook.id}`, cookie);
    expect(removed.status).toBe(204);
    expect((await authed('GET', `/api/playbooks/${playbook.id}`, cookie)).status).toBe(404);
  });

  it('rejects an empty name', async () => {
    const { cookie } = await register();
    expect((await authed('POST', '/api/playbooks', cookie, { name: '' })).status).toBe(400);
  });

  it('does not leak another user’s playbook', async () => {
    const a = await register();
    const b = await register();
    const created = (await (
      await authed('POST', '/api/playbooks', a.cookie, { name: 'Mine' })
    ).json()) as {
      id: string;
    };
    expect((await authed('GET', `/api/playbooks/${created.id}`, b.cookie)).status).toBe(404);
  });
});

describe('playbook stats + soft link', () => {
  it('serves a stats response for a currency, and requires the currency', async () => {
    const { cookie } = await register();
    await authed('POST', '/api/playbooks', cookie, { name: 'X' });
    const res = await authed('GET', '/api/playbooks/stats?currency=USD', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(((await res.json()) as { items: unknown[] }).items)).toBe(true);
    // No currency → no meaningful cross-currency aggregate.
    expect((await authed('GET', '/api/playbooks/stats', cookie)).status).toBe(400);
  });

  it('deleting a playbook does NOT cascade into a soft-linked trade plan', async () => {
    const { cookie, id: userId } = await register();
    const created = (await (
      await authed('POST', '/api/playbooks', cookie, { name: 'Soft' })
    ).json()) as {
      id: string;
    };
    await db.insert(tradePlans).values({
      userId,
      symbol: 'BBRI',
      side: 'long',
      playbookId: created.id,
    });

    expect((await authed('DELETE', `/api/playbooks/${created.id}`, cookie)).status).toBe(204);

    const survivors = await db.select().from(tradePlans).where(eq(tradePlans.userId, userId));
    expect(survivors).toHaveLength(1);
    // The dangling id is preserved — the link is soft by design.
    expect(survivors[0]!.playbookId).toBe(created.id);
  });
});

describe('playbooks & trade plans in export and deletion (Gerbang #7/#9)', () => {
  it('both appear in the export bundle and are removed by the account-deletion cascade', async () => {
    const alice = await register();
    const playbook = (await (
      await authed('POST', '/api/playbooks', alice.cookie, { name: 'Exported' })
    ).json()) as { id: string };
    await db.insert(tradePlans).values({
      userId: alice.id,
      symbol: 'BBCA',
      side: 'long',
      playbookId: playbook.id,
    });

    const exported = await authed('GET', '/api/users/me/export', alice.cookie);
    expect(exported.status).toBe(200);
    const bundle = (await exported.json()) as { tables: Record<string, unknown[]> };
    expect(bundle.tables.playbooks).toHaveLength(1);
    expect(bundle.tables.trade_plans).toHaveLength(1);
    expect(bundle.tables.playbooks?.[0]).toMatchObject({ name: 'Exported' });

    const deleted = await authed('POST', '/api/users/me/deletion', alice.cookie, {
      password: 'password123',
    });
    expect(deleted.status).toBe(200);
    expect(((await deleted.json()) as { outcome: string }).outcome).toBe('deleted');

    expect(await db.select().from(playbooks).where(eq(playbooks.userId, alice.id))).toHaveLength(0);
    expect(await db.select().from(tradePlans).where(eq(tradePlans.userId, alice.id))).toHaveLength(
      0,
    );
  });
});
