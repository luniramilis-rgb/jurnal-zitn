import { readFile } from 'node:fs/promises';

import { Hono } from 'hono';

import { config } from '@/lib/config';
import { authMiddleware } from '@/middleware/auth.middleware';

/**
 * Cek Risiko — the risk-profile grid artifact (ZITN-TECH-043).
 *
 * The grid (rule × TP×SL×H with per-cell backtest statistics) is **strategy IP**.
 * It is deliberately NOT committed to this repo: the file lives at
 * `RISK_PROFILE_PATH` on the host, provisioned at deploy from ZITN's generator.
 * This endpoint serves it to authenticated users only, so the public repo holds
 * the simulator's CODE but none of the numbers. Unset/nonexistent → 503.
 */

type AuthEnv = { Variables: { userId: string; isAdmin: boolean } };

const cekRisikoRouter = new Hono<AuthEnv>();
cekRisikoRouter.use(authMiddleware);

/**
 * @swagger
 * /api/cek-risiko/risk-profile:
 *   get:
 *     summary: The risk-profile grid (private strategy artifact, runtime-served).
 *     tags: [Cek Risiko]
 *     responses:
 *       200: { description: The risk_profile.json grid. }
 *       401: { description: No valid session. }
 *       503: { description: The grid is not provisioned on this instance. }
 */
cekRisikoRouter.get('/risk-profile', async (c) => {
  const path = config.RISK_PROFILE_PATH;
  if (!path) return c.json({ error: 'risk_profile_unavailable' }, 503);
  try {
    const raw = await readFile(path, 'utf8');
    return c.body(raw, 200, { 'Content-Type': 'application/json' });
  } catch {
    return c.json({ error: 'risk_profile_unavailable' }, 503);
  }
});

export default cekRisikoRouter;
