/**
 * GET /api/journal/context?tanggal=YYYY-MM-DD — jembatan konteks dari jurnal ke ZITN
 * (ZITN-TECH-019). Authed by the journal session; the ZITN token is minted server-side and never
 * reaches the browser.
 *
 * The response is the **selected snippet** only (`tanggal`, `asof`, `simbol`, `level_watch`) —
 * never the lembar HTML, never `signals_*.csv`. The journal only reads.
 */

import { Hono } from 'hono';

import { ValidationError } from '@/lib/errors';
import { authMiddleware } from '@/middleware/auth.middleware';

import { getSheetContextForUser } from './journal-context.service';

type Env = { Variables: { userId: string } };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const journalContextRouter = new Hono<Env>();

journalContextRouter.use(authMiddleware);

/**
 * @swagger
 * /api/journal/context:
 *   get:
 *     summary: Read the ZITN daily-sheet snippet for a date (context bridge).
 *     description: >
 *       Authed. Mints a short-lived `journal_context` token with the shared secret and calls
 *       ZITN's `GET /api/journal/context` on the server, so no ZITN token reaches the browser.
 *       Returns only the selected snippet: `tanggal`, `asof`, `simbol[]`, `level_watch[]`. Each
 *       IDX entry also carries a `chartUrl` deep-link to ZITN's `/daily/chart/` (option B: the
 *       journal links to the chart, it never renders one and never receives a price).
 *       Fail-closed: `503 konteks_nonaktif` when unconfigured, `409 belum_tertaut` when the
 *       journal account is not linked to ZITN, and ZITN's own status when its gates are shut.
 *     tags: [Journal]
 *     parameters:
 *       - in: query
 *         name: tanggal
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Sheet date (`YYYY-MM-DD`); omitted lets ZITN use the latest published sheet.
 *     responses:
 *       200: { description: 'The snippet (`ok`, `tersedia`, `tanggal`, `asof`, `simbol`, `level_watch`).' }
 *       400: { description: 'tanggal is not a YYYY-MM-DD date.' }
 *       401: { description: Authentication required. }
 *       409: { description: 'belum_tertaut — the account is not linked to ZITN.' }
 *       503: { description: 'konteks_nonaktif, or ZITN data gates are shut.' }
 */
journalContextRouter.get('/context', async (c) => {
  const userId = c.get('userId');
  const raw = c.req.query('tanggal');
  if (raw !== undefined && !DATE_RE.test(raw)) {
    throw new ValidationError('tanggal must be YYYY-MM-DD');
  }

  const { status, body } = await getSheetContextForUser(userId, raw ?? null);
  c.header('Cache-Control', 'no-store');
  return c.json(body, status as 200);
});

export default journalContextRouter;
