import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Journal soft-paywall UI gate (ZITN-TECH-029 Fase 4). When the context bridge
 * answers 402 `paywall`, `/lembar` must render the locked panel + the renew CTA
 * ("Renew access" -> `/api/auth/sso/start?redirect=…`); any other failure must
 * render the neutral unavailable panel with a retry instead of that CTA.
 *
 * The bridge response is stubbed at the network boundary so the UI gate is
 * exercised deterministically, independent of the server's live posture. The
 * server-side gate lives behind `getSheetContextForUser` (and its API tests);
 * see HANDOFF_technical_40.md §12 for why the bridge's documented routes are
 * asserted here at the UI boundary rather than through the live API.
 */

const PASSWORD = 'test-password-1234';

const PAYWALL_BODY = {
  ok: false,
  tersedia: false,
  tanggal: null,
  asof: null,
  simbol: [],
  level_watch: [],
  rows: [],
  error: 'paywall',
};

const OFF_BODY = { ...PAYWALL_BODY, error: 'konteks_nonaktif' };

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

  test('a 402 paywall locks /lembar and offers the renew CTA', async ({ page, request }) => {
    const user = await register(request, 'lapsed');
    await loginViaUi(page, user.email);

    await page.route('**/api/journal/context*', (route) =>
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify(PAYWALL_BODY),
      }),
    );

    await page.goto('/lembar');
    await expect(page.locator('[data-slot="sheet-context-unavailable"]')).toBeVisible();
    const renew = page.getByRole('link', { name: 'Renew access' });
    await expect(renew).toBeVisible();
    await expect(renew).toHaveAttribute('href', /\/api\/auth\/sso\/start\?redirect=/);
  });

  test('a non-paywall failure shows the neutral panel with a retry, not the renew CTA', async ({
    page,
    request,
  }) => {
    const user = await register(request, 'off');
    await loginViaUi(page, user.email);

    await page.route('**/api/journal/context*', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify(OFF_BODY),
      }),
    );

    await page.goto('/lembar');
    await expect(page.locator('[data-slot="sheet-context-unavailable"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Renew access' })).toHaveCount(0);
  });
});
