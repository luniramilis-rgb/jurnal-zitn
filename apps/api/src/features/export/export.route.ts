/**
 * GET /api/users/me/export — download all data the instance holds for the signed-in
 * user as one JSON document (ZITN-TECH-017, Gerbang #7/#9). Authed; no query params.
 * Mounted at its absolute path (the account-deletion precedent).
 */

import { Hono } from 'hono';

import { authMiddleware } from '@/middleware/auth.middleware';

import { exportUserData } from './export.service';

type Env = { Variables: { userId: string } };

const exportRouter = new Hono<Env>();

exportRouter.use(authMiddleware);

/**
 * @swagger
 * /api/users/me/export:
 *   get:
 *     summary: Export all of the signed-in user's data as JSON.
 *     description: >
 *       Authed. Walks every table reachable from the user's row and returns the rows as
 *       one JSON document. Credential/token columns are redacted (`[redacted]`); a table
 *       that hit the row cap is listed in `truncatedTables`. Served as a download.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: The export bundle (`application/json`, attachment).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 format: { type: string, example: jurnal-zitn-export }
 *                 version: { type: integer, example: 1 }
 *                 exportedAt: { type: string, format: date-time }
 *                 userId: { type: string, format: uuid }
 *                 tables:
 *                   type: object
 *                   additionalProperties: { type: array, items: { type: object } }
 *                 truncatedTables: { type: array, items: { type: string } }
 *       401: { description: Authentication required. }
 */
exportRouter.get('/', async (c) => {
  const bundle = await exportUserData(c.get('userId'));
  const filename = `jurnal-zitn-export-${new Date().toISOString().slice(0, 10)}.json`;
  return c.body(JSON.stringify(bundle, null, 2), 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
});

export default exportRouter;
