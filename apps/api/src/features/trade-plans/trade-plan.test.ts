import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '@/app';
import { db } from '@/db';
import { tradePlans, users } from '@/db/schema';

import { createOrFocusPendingPlan, setTradePlanDecision } from './trade-plan.service';

// F4 pre-trade plans (ZITN-TECH-017 §10.8): CRUD + the forward-only lifecycle.

let ipCounter = 0;
function uniqueIp() {
  return `10.66.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
}
let seedCounter = 0;
const runId = Date.now();
function uniqueEmail(tag: string) {
  return `tp-it-${runId}-${++seedCounter}-${tag}@example.com`;
}

function getCookieValue(res: Response, name: string): string | undefined {
  for (const header of res.headers.getSetCookie()) {
    const match = header.match(new RegExp(`${name}=([^;]*)`));
    if (match) return match[1];
  }
  return undefined;
}

async function register(): Promise<{ cookie: string; id: string }> {
  const email = uniqueEmail('user');
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': uniqueIp() },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  expect(res.status).toBe(201);
  const cookie = getCookieValue(res, 'session')!;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return { cookie, id: user!.id };
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
});

describe('trade plans CRUD + lifecycle', () => {
  it('requires a session', async () => {
    expect((await app.request('/api/trade-plans')).status).toBe(401);
  });

  it('creates a pending plan, updates its fields, and reads it back', async () => {
    const { cookie } = await register();
    const created = await authed('POST', '/api/trade-plans', cookie, {
      symbol: 'bbri',
      side: 'long',
      entryPrice: '4000',
      stopLoss: '3800',
      targetPrice: '4500',
    });
    expect(created.status).toBe(201);
    const plan = (await created.json()) as {
      id: string;
      status: string;
      symbol: string;
      entryPrice: string | null;
    };
    expect(plan.status).toBe('draft');
    expect(plan.symbol).toBe('bbri');
    expect(plan.entryPrice).toBe('4000.00000000');

    const patched = await authed('PATCH', `/api/trade-plans/${plan.id}`, cookie, {
      note: 'Gap and go',
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { note: string }).note).toBe('Gap and go');

    const list = await authed('GET', '/api/trade-plans', cookie);
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1);
  });

  it('walks draft → closed via a decision, then refuses a second decision', async () => {
    const { cookie } = await register();
    const plan = (await (
      await authed('POST', '/api/trade-plans', cookie, { symbol: 'AAPL', side: 'short' })
    ).json()) as { id: string; status: string };
    expect(plan.status).toBe('draft');

    const decided = await authed('PATCH', `/api/trade-plans/${plan.id}/decision`, cookie, {
      decision: 'taken',
    });
    expect(decided.status).toBe(200);
    const decidedPlan = (await decided.json()) as { status: string; decision: string | null };
    // The decision closes the plan (§3b); the choice lives in `decision`.
    expect(decidedPlan.status).toBe('closed');
    expect(decidedPlan.decision).toBe('taken');

    // A closed plan refuses another decision.
    const illegal = await authed('PATCH', `/api/trade-plans/${plan.id}/decision`, cookie, {
      decision: 'skipped',
    });
    expect(illegal.status).toBe(400);
  });

  it('deletes a plan and 404s an unknown id', async () => {
    const { cookie } = await register();
    const plan = (await (
      await authed('POST', '/api/trade-plans', cookie, { symbol: 'TLKM', side: 'long' })
    ).json()) as { id: string };

    expect((await authed('DELETE', `/api/trade-plans/${plan.id}`, cookie)).status).toBe(204);
    expect((await authed('GET', `/api/trade-plans/${plan.id}`, cookie)).status).toBe(404);
    expect(
      (await authed('GET', `/api/trade-plans/${'00000000-0000-4000-8000-000000000000'}`, cookie))
        .status,
    ).toBe(404);
  });

  it('does not leak another user’s plan', async () => {
    const a = await register();
    const b = await register();
    const plan = (await (
      await authed('POST', '/api/trade-plans', a.cookie, { symbol: 'MSFT', side: 'long' })
    ).json()) as { id: string };
    expect((await authed('GET', `/api/trade-plans/${plan.id}`, b.cookie)).status).toBe(404);
  });

  it('stores the ZITN prefill (market + signalDate) on create', async () => {
    const { cookie } = await register();
    const res = await authed('POST', '/api/trade-plans', cookie, {
      symbol: 'AAPL',
      side: 'long',
      market: 'us',
      signalDate: '2026-09-30',
    });
    expect(res.status).toBe(201);
    const plan = (await res.json()) as { market: string; signalDate: string | null };
    expect(plan.market).toBe('us');
    expect(plan.signalDate).toBe('2026-09-30');
  });
});

describe('create-or-focus (Tambah ke Jurnal, ZITN-TECH-043)', () => {
  it('is idempotent per (symbol, market) and never focuses a terminal plan', async () => {
    const { id } = await register();

    const a = await createOrFocusPendingPlan(id, {
      symbol: 'BBCA',
      market: 'id',
      signalDate: '2026-09-30',
    });
    expect(a.focused).toBe(false);
    expect(a.plan.market).toBe('id');
    expect(a.plan.signalDate).toBe('2026-09-30');

    // Same symbol+market, still Pending -> focus the existing draft.
    const b = await createOrFocusPendingPlan(id, { symbol: 'BBCA', market: 'id' });
    expect(b.focused).toBe(true);
    expect(b.plan.id).toBe(a.plan.id);

    // Different market -> a distinct draft.
    const c = await createOrFocusPendingPlan(id, { symbol: 'BBCA', market: 'us' });
    expect(c.focused).toBe(false);
    expect(c.plan.id).not.toBe(a.plan.id);

    // Closed plan is not re-focused; a fresh draft is made.
    await setTradePlanDecision(id, a.plan.id, 'taken');
    const d = await createOrFocusPendingPlan(id, { symbol: 'BBCA', market: 'id' });
    expect(d.focused).toBe(false);
    expect(d.plan.id).not.toBe(a.plan.id);
  });
});
