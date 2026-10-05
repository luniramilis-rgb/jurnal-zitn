import { readFile } from 'node:fs/promises';

import { Hono } from 'hono';

import { config } from '@/lib/config';
import { authMiddleware } from '@/middleware/auth.middleware';

/**
 * Cek Risiko — the risk-profile grid artifacts (ZITN-TECH-043 / 047).
 *
 * The grids (rule × TP×SL×H with per-cell backtest statistics) are **strategy IP**.
 * They are deliberately NOT committed to this repo: one file per market lives at
 * `RISK_PROFILE_PATH_US` / `RISK_PROFILE_PATH_ID` on the host, provisioned at
 * deploy from ZITN's generators. This endpoint serves the grid for `?market=us|id`
 * (default `us`) to authenticated users only, so the public repo holds the
 * simulator's CODE but none of the numbers. Unset/nonexistent → 503.
 *
 * `RISK_PROFILE_PATH` (the pre-047 single path) is still honored as a US fallback.
 */

type AuthEnv = { Variables: { userId: string; isAdmin: boolean } };

const cekRisikoRouter = new Hono<AuthEnv>();
cekRisikoRouter.use(authMiddleware);

/** Resolve the private grid path for a market, or undefined when unprovisioned. */
function riskProfilePath(market: 'us' | 'id'): string | undefined {
  if (market === 'id') return config.RISK_PROFILE_PATH_ID || undefined;
  return config.RISK_PROFILE_PATH_US || config.RISK_PROFILE_PATH || undefined;
}

/**
 * @swagger
 * /api/cek-risiko/risk-profile:
 *   get:
 *     summary: The per-market risk-profile grid (private strategy artifact, runtime-served).
 *     tags: [Cek Risiko]
 *     parameters:
 *       - in: query
 *         name: market
 *         schema: { type: string, enum: [us, id], default: us }
 *         description: Which market's grid to serve (us = S&P 500, id = IDX).
 *     responses:
 *       200: { description: The risk_profile_<market>.json grid. }
 *       400: { description: Unknown market. }
 *       401: { description: No valid session. }
 *       503: { description: The grid is not provisioned on this instance. }
 */
cekRisikoRouter.get('/risk-profile', async (c) => {
  const market = (c.req.query('market') ?? 'us').toLowerCase();
  if (market !== 'us' && market !== 'id') return c.json({ error: 'invalid_market' }, 400);
  const path = riskProfilePath(market);
  if (!path) return c.json({ error: 'risk_profile_unavailable' }, 503);
  try {
    const raw = await readFile(path, 'utf8');
    return c.body(raw, 200, { 'Content-Type': 'application/json' });
  } catch {
    return c.json({ error: 'risk_profile_unavailable' }, 503);
  }
});

export default cekRisikoRouter;
