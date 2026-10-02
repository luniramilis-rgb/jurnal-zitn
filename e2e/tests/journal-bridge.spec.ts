import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Journal context bridge — route mount regression (ZITN-TECH-040 §12).
 *
 * Fase G / D-G3 removed the journal's own `/chart` and `/lembar` surfaces; what
 * remains is the server bridge the journal reads from. With the route wired, an
 * authed call reaches the fail-closed gate (503 `konteks_nonaktif` while
 * unconfigured), never a 404.
 */

const PASSWORD = 'test-password-1234';

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `10.${process.pid % 256}.141.${ipCounter % 254}`;
}

function uniqueEmail(label: string): string {
  return `e2e-bridge-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function register(req: APIRequestContext, label: string): Promise<void> {
  const email = uniqueEmail(label);
  const res = await req.post('/api/auth/register', {
    data: { email, password: PASSWORD },
    headers: { 'X-Forwarded-For': uniqueIp() },
  });
  expect(res.status(), `register ${email}`).toBe(201);
}

test.describe('journal context bridge — desktop', () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Desktop-only suite — runs under chromium (Desktop Chrome).',
  );

  test.beforeEach(async ({ page }) => {
    try {
      const res = await page.request.get('/api/auth/me', { failOnStatusCode: false });
      if (res.status() >= 500) test.skip(true, `API stack returned ${res.status()}`);
    } catch (err) {
      test.skip(true, `API stack unreachable (${(err as Error).message})`);
    }
  });

  test('the bridge routes are mounted: 503 konteks_nonaktif, not 404', async ({ request }) => {
    await register(request, 'mounted');

    const context = await request.get('/api/journal/context');
    expect(context.status(), 'GET /api/journal/context').toBe(503);
    expect(((await context.json()) as { error?: string }).error).toBe('konteks_nonaktif');

    const candles = await request.get('/api/journal/candles?market=id&ticker=BBRI');
    expect(candles.status(), 'GET /api/journal/candles').toBe(503);
    expect(((await candles.json()) as { error?: string }).error).toBe('konteks_nonaktif');
  });
});
