import { Hono } from 'hono';
import { z } from 'zod';

import { CreatePlaybookInputSchema, UpdatePlaybookInputSchema } from '@jurnal-zitn/shared';

import { validate } from '@/lib/validation';
import { authMiddleware } from '@/middleware/auth.middleware';

import {
  createPlaybook,
  deletePlaybook,
  getPlaybook,
  getPlaybookStats,
  listPlaybooks,
  updatePlaybook,
} from './playbook.service';

// ---------------------------------------------------------------------------
// F4 playbooks (ZITN-TECH-017 §10.8). Login required; every row is scoped to the
// caller. Statistics are read-time only. Trades link by the soft
// `positions.playbook_id`, so deleting a playbook never touches a trade.
// ---------------------------------------------------------------------------

type AuthEnv = { Variables: { userId: string; isAdmin: boolean } };

const IdParamSchema = z.object({ id: z.string().uuid() });
// `currency` is REQUIRED: per-setup statistics must never be summed across
// currencies, so there is no meaningful "all currencies" response.
const StatsQuerySchema = z.object({ currency: z.string().min(1).max(8) });

const playbookRouter = new Hono<AuthEnv>();
playbookRouter.use(authMiddleware);

/**
 * @swagger
 * /api/playbooks:
 *   get:
 *     summary: List the caller's playbooks.
 *     tags: [Playbooks]
 *     responses:
 *       200: { description: '{ items: Playbook[] }.' }
 *       401: { description: No valid session. }
 */
playbookRouter.get('/', async (c) => c.json({ items: await listPlaybooks(c.get('userId')) }, 200));

/**
 * @swagger
 * /api/playbooks/stats:
 *   get:
 *     summary: Per-setup statistics, computed at read time.
 *     description: >
 *       Groups the caller's latched flat trades by their soft playbook link and
 *       returns the same completed-trade statistics the performance surface
 *       uses. Trades whose playbook was deleted (or never had one) fold into a
 *       single entry with `playbookId: null`.
 *     tags: [Playbooks]
 *     responses:
 *       200: { description: '{ items: PlaybookSetupStats[] }.' }
 *       401: { description: No valid session. }
 */
playbookRouter.get('/stats', validate('query', StatsQuerySchema), async (c) => {
  const { currency } = c.req.valid('query');
  return c.json({ items: await getPlaybookStats(c.get('userId'), currency) }, 200);
});

/**
 * @swagger
 * /api/playbooks:
 *   post:
 *     summary: Create a playbook.
 *     tags: [Playbooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 120 }
 *               setupRules: { type: string }
 *               entryTrigger: { type: string }
 *               exitCriteria: { type: string }
 *               timeframe: { type: string }
 *               instrument: { type: string }
 *     responses:
 *       201: { description: The created playbook. }
 *       400: { description: VALIDATION_ERROR. }
 *       401: { description: No valid session. }
 */
playbookRouter.post('/', validate('json', CreatePlaybookInputSchema), async (c) => {
  return c.json(await createPlaybook(c.get('userId'), c.req.valid('json')), 201);
});

/**
 * @swagger
 * /api/playbooks/{id}:
 *   get:
 *     summary: Get one playbook.
 *     tags: [Playbooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The playbook. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
playbookRouter.get('/:id', validate('param', IdParamSchema), async (c) => {
  return c.json(await getPlaybook(c.get('userId'), c.req.valid('param').id), 200);
});

/**
 * @swagger
 * /api/playbooks/{id}:
 *   patch:
 *     summary: Update a playbook.
 *     tags: [Playbooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: The updated playbook. }
 *       400: { description: VALIDATION_ERROR. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
playbookRouter.patch(
  '/:id',
  validate('param', IdParamSchema),
  validate('json', UpdatePlaybookInputSchema),
  async (c) => {
    return c.json(
      await updatePlaybook(c.get('userId'), c.req.valid('param').id, c.req.valid('json')),
      200,
    );
  },
);

/**
 * @swagger
 * /api/playbooks/{id}:
 *   delete:
 *     summary: Delete a playbook (soft link — trades are untouched).
 *     tags: [Playbooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
playbookRouter.delete('/:id', validate('param', IdParamSchema), async (c) => {
  await deletePlaybook(c.get('userId'), c.req.valid('param').id);
  return c.body(null, 204);
});

export default playbookRouter;
