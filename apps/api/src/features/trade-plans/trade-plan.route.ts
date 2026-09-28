import { Hono } from 'hono';
import { z } from 'zod';

import {
  CreateTradePlanInputSchema,
  LinkTradePlanInputSchema,
  TradePlanStatusSchema,
  UpdateTradePlanInputSchema,
  UpdateTradePlanStatusSchema,
} from '@jurnal-zitn/shared';

import { validate } from '@/lib/validation';
import { authMiddleware } from '@/middleware/auth.middleware';

import {
  createTradePlan,
  deleteTradePlan,
  getTradePlan,
  linkTradePlan,
  listTradePlans,
  setTradePlanStatus,
  updateTradePlan,
} from './trade-plan.service';

// ---------------------------------------------------------------------------
// F4 pre-trade plans (ZITN-TECH-017 §10.8). Login required; caller-scoped.
// ---------------------------------------------------------------------------

type AuthEnv = { Variables: { userId: string; isAdmin: boolean } };

const IdParamSchema = z.object({ id: z.string().uuid() });
const ListQuerySchema = z.object({ status: TradePlanStatusSchema.optional() });

const tradePlanRouter = new Hono<AuthEnv>();
tradePlanRouter.use(authMiddleware);

/**
 * @swagger
 * /api/trade-plans:
 *   get:
 *     summary: List the caller's pre-trade plans (optionally by status).
 *     tags: [Trade Plans]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, executed, missed, cancelled] }
 *     responses:
 *       200: { description: '{ items: TradePlan[] }.' }
 *       401: { description: No valid session. }
 */
tradePlanRouter.get('/', validate('query', ListQuerySchema), async (c) => {
  const { status } = c.req.valid('query');
  return c.json({ items: await listTradePlans(c.get('userId'), status) }, 200);
});

/**
 * @swagger
 * /api/trade-plans:
 *   post:
 *     summary: Create a pre-trade plan (Pending).
 *     tags: [Trade Plans]
 *     responses:
 *       201: { description: The created plan. }
 *       400: { description: VALIDATION_ERROR. }
 *       401: { description: No valid session. }
 */
tradePlanRouter.post('/', validate('json', CreateTradePlanInputSchema), async (c) => {
  return c.json(await createTradePlan(c.get('userId'), c.req.valid('json')), 201);
});

/**
 * @swagger
 * /api/trade-plans/{id}:
 *   get:
 *     summary: Get one pre-trade plan.
 *     tags: [Trade Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: The plan. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
tradePlanRouter.get('/:id', validate('param', IdParamSchema), async (c) => {
  return c.json(await getTradePlan(c.get('userId'), c.req.valid('param').id), 200);
});

/**
 * @swagger
 * /api/trade-plans/{id}:
 *   patch:
 *     summary: Update a pre-trade plan's fields.
 *     tags: [Trade Plans]
 *     responses:
 *       200: { description: The updated plan. }
 *       400: { description: VALIDATION_ERROR. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
tradePlanRouter.patch(
  '/:id',
  validate('param', IdParamSchema),
  validate('json', UpdateTradePlanInputSchema),
  async (c) => {
    return c.json(
      await updateTradePlan(c.get('userId'), c.req.valid('param').id, c.req.valid('json')),
      200,
    );
  },
);

/**
 * @swagger
 * /api/trade-plans/{id}/status:
 *   patch:
 *     summary: Move a plan through its lifecycle.
 *     description: Pending → executed / missed / cancelled. Repeating a terminal
 *       state is idempotent; moving between terminal states is a 400.
 *     tags: [Trade Plans]
 *     responses:
 *       200: { description: The updated plan. }
 *       400: { description: VALIDATION_ERROR — illegal transition. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
tradePlanRouter.patch(
  '/:id/status',
  validate('param', IdParamSchema),
  validate('json', UpdateTradePlanStatusSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { status } = c.req.valid('json');
    return c.json(await setTradePlanStatus(c.get('userId'), id, status), 200);
  },
);

/**
 * @swagger
 * /api/trade-plans/{id}/link:
 *   patch:
 *     summary: Attach a plan to the trade it produced (1:1), or detach.
 *     description: >
 *       Body `{ positionId: uuid | null }`. The position must be the caller's and
 *       must not already be linked to another plan. Attaching a Pending plan marks
 *       it Executed; detaching an Executed plan returns it to Pending. PATCH (never
 *       GET) per the CSRF posture. Soft link — deleting the trade leaves the plan.
 *     tags: [Trade Plans]
 *     responses:
 *       200: { description: The updated plan. }
 *       400: { description: VALIDATION_ERROR — bad body or an already-linked trade. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND — no such plan or position. }
 */
tradePlanRouter.patch(
  '/:id/link',
  validate('param', IdParamSchema),
  validate('json', LinkTradePlanInputSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { positionId } = c.req.valid('json');
    return c.json(await linkTradePlan(c.get('userId'), id, positionId), 200);
  },
);

/**
 * @swagger
 * /api/trade-plans/{id}:
 *   delete:
 *     summary: Delete a pre-trade plan.
 *     tags: [Trade Plans]
 *     responses:
 *       204: { description: Deleted. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
tradePlanRouter.delete('/:id', validate('param', IdParamSchema), async (c) => {
  await deleteTradePlan(c.get('userId'), c.req.valid('param').id);
  return c.body(null, 204);
});

export default tradePlanRouter;
