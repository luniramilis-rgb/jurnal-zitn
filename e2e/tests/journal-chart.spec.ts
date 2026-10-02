import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Journal chart draw (ZITN-TECH-029 Fase 3c). `/chart?symbol=&tf=&pasar=` reads a
 * candle series from the bridge and mounts a vendored Lightweight Charts canvas.
 *
 * The series is stubbed at the network boundary so the DRAW is deterministic
 * (the vendored bundle must load and attach a <canvas> to the container); the
 * server-side bridge gate is covered in journal-paywall.spec.ts. This is the
 * browser-only case the handoff tracked separately.
 */

const PASSWORD = 'test-password-1234';

/** A small, valid OHLCV payload — `t` is the `YYYY-MM-DD` form Lightweight Charts accepts. */
const CANDLES = {
  ok: true,
  market: 'id',
  symbol: 'BBRI',
  name: 'Bank Rakyat Indonesia',
  sector: 'Financials',
  asof: '2026-09-30',
  bars: 5,
  t: ['2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30'],
  o: [4500, 4520, 4510, 4550, 4560],
  h: [4540, 4550, 4560, 4580, 4600],
  l: [4480, 4500, 4500, 4530, 4550],
  c: [4520, 4510, 4550, 4560, 4590],
  v: [1_000_000, 1_200_000, 900_000, 1_100_000, 1_300_000],
};

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.${process.pid % 256}.142.${ipCounter % 254}`;
}

function uniqueEmail(label: string): string {
  return `e2e-chart-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
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

test.describe('journal chart — desktop', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Desktop-only suite — runs under chromium (Desktop Chrome).',
  );

  test.beforeEach(async ({ page }) => {
    await ensureStackOrSkip(page.request);
  });

  test('a candle series draws the Lightweight Charts canvas on /chart', async ({
    page,
    request,
  }) => {
    const user = await register(request, 'draw');
    await loginViaUi(page, user.email);

    await page.route('**/api/journal/candles*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CANDLES),
      }),
    );

    await page.goto('/chart?symbol=BBRI&tf=1Y');

    await expect(page.getByTestId('chart-view')).toBeVisible();
    await expect(page.getByRole('heading', { name: /BBRI/i })).toBeVisible();

    // The container only renders when the series is usable, and Lightweight
    // Charts mounts a <canvas> into it once setData has run.
    const canvasBox = page.getByTestId('chart-canvas');
    await expect(canvasBox).toBeVisible();
    await expect(canvasBox.locator('canvas').first()).toBeVisible({ timeout: 15_000 });

    // The vendored bundle is Lightweight Charts v5 (`addSeries`); a v4
    // `addCandlestickSeries` call would throw into the surface's error alert.
    // Asserting its absence is what makes this test a real draw regression, not
    // just a "container mounted" check.
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('a missing symbol shows the empty state, not a canvas', async ({ page, request }) => {
    const user = await register(request, 'empty');
    await loginViaUi(page, user.email);

    await page.goto('/chart');
    await expect(page.getByTestId('chart-empty')).toBeVisible();
    await expect(page.getByTestId('chart-canvas')).toHaveCount(0);
  });

  test('the empty /chart state offers an emitter picker that draws the chart', async ({
    page,
    request,
  }) => {
    const user = await register(request, 'picker');
    await loginViaUi(page, user.email);

    await page.route('**/api/symbols/search*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ ticker: 'BBRI', name: 'Bank Rakyat Indonesia', exchange: 'IDX' }],
        }),
      }),
    );
    await page.route('**/api/journal/candles*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CANDLES),
      }),
    );

    await page.goto('/chart');
    const empty = page.getByTestId('chart-empty');
    await expect(empty).toBeVisible();

    // Pick from the emitter combobox -> the URL gains the symbol and the chart draws.
    await empty.getByRole('combobox').fill('BBRI');
    // The autocomplete listbox portals to document.body, so the option is not a
    // descendant of the (non-portalled) `chart-empty` section.
    await page.getByRole('option', { name: /BBRI/ }).click();

    await expect(page).toHaveURL(/[?&]symbol=BBRI/);
    await expect(page.getByTestId('chart-canvas').locator('canvas').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
