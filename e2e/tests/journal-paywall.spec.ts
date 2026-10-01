import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { setJournalAccess } from '../support/db';

/**
 * Journal soft-paywall gate (ZITN-TECH-029 Fase 4). The context bridge is
 * fail-closed in three steps — 503 unconfigured, 409 unlinked, 402 lapsed
 * entitlement — and this suite exercises the two reachable ones against the
 * booted stack:
 *
 *  - an account with a ZITN link but a PAST `entitled_until` answers 402
 *    `paywall` on both bridge routes, and `/lembar` renders the locked panel +
 *    the renew CTA;
 *  - an account with no ZITN link answers 409 `belum_tertaut` (never the
 *    paywall).
 *
 * `playwright.config.ts` arms the bridge (`ZITN_BASE_URL` + `JOURNAL_SSO_SECRET`)
 * so the 409/402 branches are reachable, but that base URL is an unroutable
 * loopback port: every case here stops at the gate BEFORE any ZITN fetch.
 * `support/db.ts` (the suite's only direct DB access) seeds the link and the
 * entitlement; production code is untouched.
 */

const PASSWORD = 'test-password-1234';

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.${process.pid % 256}.141.${ipCounter % 254}`;
}

function uniqueEmail(label: string): string {
  return `e2e-paywall-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function register(req: APIRequestContext, label: string): Promise<{ email: string }> {
  const email = uniqueEmail(label);
  const res = await req.post('/api/auth/register', {
    data: { email, password: PASSWORD },
    headers: { 'X-Forwarded-For': uniqueIp() },
  });
  expect(res.status(), `register ${email}`).toBe(201);
  return { email };
}

async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.setExtraHTTPHeaders({ 'X-Forwarded-For': uniqueIp() });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Skip gracefully when the stack is not booted (mirrors the other live suites). */
async function ensureStackOrSkip(req: APIRequestContext): Promise<void> {
  try {
    const res = await req.get('/api/auth/me', { failOnStatusCode: false });
    if (res.status() >= 500) {
      test.skip(true, `API stack returned ${res.status()} — skipping live e2e`);
    }
  } catch (err) {
    test.skip(true, `API stack unreachable — skipping live e2e (${(err as Error).message})`);
  }
}

test.describe('journal paywall gate — desktop', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Desktop-only suite — runs under chromium (Desktop Chrome).',
  );

  test.beforeEach(async ({ page }) => {
    await ensureStackOrSkip(page.request);
  });

  test('a linked account with a lapsed entitlement gets 402 paywall and a locked /lembar', async ({
    page,
    request,
  }) => {
    const user = await register(request, 'lapsed');
    await setJournalAccess(user.email, {
      zitnUserId: `zitn-e2e-${Date.now()}`,
      entitledUntil: new Date('2020-01-01T00:00:00.000Z'),
    });
    await loginViaUi(page, user.email);

    // Server gate — 402 `paywall` on both bridge routes (before any ZITN call).
    const context = await request.get('/api/journal/context');
    expect(context.status(), 'GET /api/journal/context').toBe(402);
    expect(((await context.json()) as { error?: string }).error).toBe('paywall');

    const candles = await request.get('/api/journal/candles?market=id&ticker=BBRI');
    expect(candles.status(), 'GET /api/journal/candles').toBe(402);
    expect(((await candles.json()) as { error?: string }).error).toBe('paywall');

    // UI gate — the locked panel + the renew CTA, never a sheet table.
    await page.goto('/lembar');
    await expect(page.locator('[data-slot="sheet-context-unavailable"]')).toBeVisible();
    const renew = page.getByRole('link', { name: 'Renew access' });
    await expect(renew).toBeVisible();
    await expect(renew).toHaveAttribute('href', /\/api\/auth\/sso\/start\?redirect=/);
  });

  test('an unlinked account gets 409 belum_tertaut, not the paywall', async ({ request }) => {
    await register(request, 'unlinked');
    const context = await request.get('/api/journal/context');
    expect(context.status(), 'GET /api/journal/context').toBe(409);
    expect(((await context.json()) as { error?: string }).error).toBe('belum_tertaut');
  });
});
