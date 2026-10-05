import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import app from '@/app';
import { config } from '@/lib/config';

// ZITN-TECH-047: the risk-profile endpoint serves one PRIVATE grid per market.
// The grids are strategy IP and never committed — these tests point the two env
// paths at throwaway temp files and assert per-market routing, auth-only access,
// and fail-closed 503.

let dir: string;
const saved = {
  us: config.RISK_PROFILE_PATH_US,
  id: config.RISK_PROFILE_PATH_ID,
  legacy: config.RISK_PROFILE_PATH,
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rp-'));
  writeFileSync(join(dir, 'us.json'), JSON.stringify({ market: 'us', rules: { R_US: {} } }));
  writeFileSync(
    join(dir, 'id.json'),
    JSON.stringify({ market: 'id', rules: { cross10_nosl: {} } }),
  );
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

afterEach(() => {
  config.RISK_PROFILE_PATH_US = saved.us;
  config.RISK_PROFILE_PATH_ID = saved.id;
  config.RISK_PROFILE_PATH = saved.legacy;
});

let ipCounter = 0;
function uniqueIp() {
  return `10.47.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
}

async function register(): Promise<string> {
  const email = `rp-${Date.now()}-${Math.floor(Math.random() * 1e9)}@example.com`;
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': uniqueIp() },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  expect(res.status).toBe(201);
  const cookie = res.headers
    .getSetCookie()
    .map((h) => h.match(/session=([^;]*)/))
    .find((m) => m !== null);
  expect(cookie).toBeTruthy();
  return cookie![1];
}

function authed(path: string, cookie: string) {
  return app.request(path, {
    headers: { Cookie: `session=${cookie}`, 'X-Forwarded-For': uniqueIp() },
  });
}

describe('GET /api/cek-risiko/risk-profile — per-market artifacts (ZITN-TECH-047)', () => {
  it('requires a session', async () => {
    const res = await app.request('/api/cek-risiko/risk-profile?market=us', {
      headers: { 'X-Forwarded-For': uniqueIp() },
    });
    expect(res.status).toBe(401);
  });

  it('serves the US grid by default and explicitly', async () => {
    config.RISK_PROFILE_PATH_US = join(dir, 'us.json');
    config.RISK_PROFILE_PATH_ID = join(dir, 'id.json');
    const cookie = await register();

    const byDefault = await authed('/api/cek-risiko/risk-profile', cookie);
    expect(byDefault.status).toBe(200);
    expect((await byDefault.json()).market).toBe('us');

    const explicit = await authed('/api/cek-risiko/risk-profile?market=us', cookie);
    expect((await explicit.json()).market).toBe('us');
  });

  it('serves the IDX grid for market=id', async () => {
    config.RISK_PROFILE_PATH_US = join(dir, 'us.json');
    config.RISK_PROFILE_PATH_ID = join(dir, 'id.json');
    const cookie = await register();

    const res = await authed('/api/cek-risiko/risk-profile?market=id', cookie);
    expect(res.status).toBe(200);
    expect((await res.json()).market).toBe('id');
  });

  it('rejects an unknown market with 400', async () => {
    const cookie = await register();
    const res = await authed('/api/cek-risiko/risk-profile?market=jp', cookie);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_market');
  });

  it('fails closed with 503 when the market is not provisioned', async () => {
    config.RISK_PROFILE_PATH_US = join(dir, 'us.json');
    config.RISK_PROFILE_PATH_ID = undefined;
    const cookie = await register();

    const res = await authed('/api/cek-risiko/risk-profile?market=id', cookie);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('risk_profile_unavailable');
  });

  it('honors the legacy RISK_PROFILE_PATH as a US fallback', async () => {
    config.RISK_PROFILE_PATH_US = undefined;
    config.RISK_PROFILE_PATH_ID = undefined;
    config.RISK_PROFILE_PATH = join(dir, 'us.json');
    const cookie = await register();

    const res = await authed('/api/cek-risiko/risk-profile?market=us', cookie);
    expect(res.status).toBe(200);
    expect((await res.json()).market).toBe('us');
  });

  it('fails closed with 503 when the provisioned file is missing', async () => {
    config.RISK_PROFILE_PATH_US = join(dir, 'does-not-exist.json');
    config.RISK_PROFILE_PATH_ID = undefined;
    const cookie = await register();

    const res = await authed('/api/cek-risiko/risk-profile?market=us', cookie);
    expect(res.status).toBe(503);
  });
});
