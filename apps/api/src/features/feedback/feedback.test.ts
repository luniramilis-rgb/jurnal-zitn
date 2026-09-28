import { createHash, randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { db } from '@/db';
import { feedback, sessions, users } from '@/db/schema';

// ---------------------------------------------------------------------------
// F0b in-app feedback (ZITN-TECH-017 §10.4). Exercises the real routes over the
// shared Postgres harness: auth, validation, cross-user isolation, the admin
// inbox/filters/status write, and coverage by the export graph and the account
// deletion cascade.
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

let ipCounter = 0;
function uniqueIp() {
  return `10.44.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
}
let seedCounter = 0;
const runId = Date.now();
function uniqueEmail(tag: string) {
  return `feedback-it-${runId}-${++seedCounter}-${tag}@example.com`;
}

function getCookieValue(res: Response, name: string): string | undefined {
  for (const header of res.headers.getSetCookie()) {
    const match = header.match(new RegExp(`${name}=([^;]*)`));
    if (match) return match[1];
  }
  return undefined;
}

async function registerAndGetCookie(): Promise<{ cookie: string; email: string; id: string }> {
  const email = uniqueEmail('registered');
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': uniqueIp() },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  expect(res.status).toBe(201);
  const cookie = getCookieValue(res, 'session');
  expect(cookie).toBeDefined();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return { cookie: cookie!, email, id: user!.id };
}

async function seedAdmin(): Promise<{ id: string; email: string; token: string }> {
  const email = uniqueEmail('admin');
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: 'x', isAdmin: true })
    .returning({ id: users.id, email: users.email });
  const token = randomUUID();
  await db.insert(sessions).values({
    userId: user!.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    createdAt: new Date(),
    lastAccessed: new Date(),
    expiresAt: new Date(Date.now() + DAY),
  });
  return { id: user!.id, email: user!.email, token };
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

function submit(cookie: string, body: unknown) {
  return authed('POST', '/api/feedback', cookie, body);
}

const VALID = {
  type: 'bug',
  message: 'Ada masalah pada halaman posisi',
  pageUrl: 'https://jurnal.zitn.test/positions',
};

beforeEach(async () => {
  await db.delete(feedback);
});

describe('POST /api/feedback', () => {
  it('requires a session', async () => {
    const res = await app.request('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(401);
  });

  it('stores one row scoped to the caller, snapshotting the email', async () => {
    const { cookie, email, id } = await registerAndGetCookie();
    const res = await submit(cookie, VALID);
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      type: 'bug',
      message: VALID.message,
      pageUrl: VALID.pageUrl,
      source: 'jurnal',
      status: 'baru',
      userEmail: email,
    });

    const rows = await db.select().from(feedback).where(eq(feedback.userId, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userEmail).toBe(email);
    expect(rows[0]!.status).toBe('baru');
    expect(rows[0]!.source).toBe('jurnal');
  });

  it('accepts the lembar source', async () => {
    const { cookie } = await registerAndGetCookie();
    const res = await submit(cookie, { ...VALID, source: 'lembar' });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { source: string }).source).toBe('lembar');
  });

  it('rejects a message under 10 characters, a bad type, a missing pageUrl and a bad source', async () => {
    const { cookie } = await registerAndGetCookie();
    expect((await submit(cookie, { ...VALID, message: 'too short' })).status).toBe(400);
    expect((await submit(cookie, { ...VALID, type: 'rant' })).status).toBe(400);
    expect((await submit(cookie, { type: 'bug', message: VALID.message })).status).toBe(400);
    expect((await submit(cookie, { ...VALID, source: 'lemur' })).status).toBe(400);
  });
});

describe('admin feedback inbox', () => {
  it('refuses a non-admin', async () => {
    const { cookie } = await registerAndGetCookie();
    expect((await authed('GET', '/api/admin/feedback', cookie)).status).toBe(403);
  });

  it('lists user feedback newest-first and filters by type/status/source', async () => {
    const admin = await seedAdmin();
    const alice = await registerAndGetCookie();
    const bob = await registerAndGetCookie();

    await submit(alice.cookie, { ...VALID, type: 'bug', source: 'jurnal' });
    await submit(bob.cookie, {
      type: 'feature',
      message: 'Mohon tambahkan ekspor CSV',
      pageUrl: 'https://jurnal.zitn.test/dashboard',
      source: 'lembar',
    });

    const all = await authed('GET', '/api/admin/feedback', admin.token);
    expect(all.status).toBe(200);
    const allBody = (await all.json()) as { items: { type: string; source: string }[] };
    expect(allBody.items).toHaveLength(2);
    expect(allBody.items.map((i) => i.type).sort()).toEqual(['bug', 'feature']);

    const bugs = await authed('GET', '/api/admin/feedback?type=bug', admin.token);
    const bugsBody = (await bugs.json()) as { items: unknown[] };
    expect(bugsBody.items).toHaveLength(1);

    const lembar = await authed('GET', '/api/admin/feedback?source=lembar', admin.token);
    const lembarBody = (await lembar.json()) as { items: { source: string }[] };
    expect(lembarBody.items).toHaveLength(1);
    expect(lembarBody.items[0]!.source).toBe('lembar');

    const baru = await authed('GET', '/api/admin/feedback?status=baru', admin.token);
    expect(((await baru.json()) as { items: unknown[] }).items).toHaveLength(2);
  });

  it('moves a row through the triage statuses, 404s an unknown id, 403s a non-admin', async () => {
    const admin = await seedAdmin();
    const alice = await registerAndGetCookie();
    const created = (await (await submit(alice.cookie, VALID)).json()) as { id: string };

    const patched = await authed('PATCH', `/api/admin/feedback/${created.id}`, admin.token, {
      status: 'selesai',
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { status: string }).status).toBe('selesai');

    const [row] = await db.select().from(feedback).where(eq(feedback.id, created.id));
    expect(row!.status).toBe('selesai');

    const missing = await authed('PATCH', `/api/admin/feedback/${randomUUID()}`, admin.token, {
      status: 'ditolak',
    });
    expect(missing.status).toBe(404);

    const asAlice = await authed('PATCH', `/api/admin/feedback/${created.id}`, alice.cookie, {
      status: 'ditolak',
    });
    expect(asAlice.status).toBe(403);
  });
});

describe('feedback in export and deletion (Gerbang #7/#9)', () => {
  it('is part of the user export bundle', async () => {
    const alice = await registerAndGetCookie();
    await submit(alice.cookie, VALID);

    const res = await authed('GET', '/api/users/me/export', alice.cookie);
    expect(res.status).toBe(200);
    const bundle = (await res.json()) as { tables: Record<string, Record<string, unknown>[]> };
    expect(bundle.tables.feedback).toBeDefined();
    expect(bundle.tables.feedback).toHaveLength(1);
    expect(bundle.tables.feedback[0]).toMatchObject({
      message: VALID.message,
      page_url: VALID.pageUrl,
      type: 'bug',
      source: 'jurnal',
      status: 'baru',
    });
  });

  it('is removed by the account-deletion FK cascade', async () => {
    const alice = await registerAndGetCookie();
    await submit(alice.cookie, VALID);
    const before = await db.select().from(feedback).where(eq(feedback.userId, alice.id));
    expect(before).toHaveLength(1);

    const res = await authed('POST', '/api/users/me/deletion', alice.cookie, {
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { outcome: string }).outcome).toBe('deleted');

    const after = await db.select().from(feedback).where(eq(feedback.userId, alice.id));
    expect(after).toHaveLength(0);
  });
});
