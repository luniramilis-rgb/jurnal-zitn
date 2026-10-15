import { Hono } from 'hono';
import { z } from 'zod';

import {
  CreateTradePlanInputSchema,
  TradePlanStatusSchema,
  UpdateTradePlanDecisionSchema,
  UpdateTradePlanInputSchema,
} from '@jurnal-zitn/shared';

import { validate } from '@/lib/validation';
import { authMiddleware } from '@/middleware/auth.middleware';

import {
  createTradePlan,
  deleteTradePlan,
  getTradePlan,
  listTradePlans,
  setTradePlanDecision,
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
 *         schema: { type: string, enum: [draft, closed] }
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
 *     summary: Create a pre-trade plan (draft).
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
 * /api/trade-plans/{id}/decision:
 *   patch:
 *     summary: Record the plan's decision, closing it (draft to closed).
 *     description: >
 *       Body `{ decision: taken | skipped | no_action }`. A closed plan is final
 *       and refuses another decision.
 *     tags: [Trade Plans]
 *     responses:
 *       200: { description: The updated plan. }
 *       400: { description: VALIDATION_ERROR — plan already closed. }
 *       401: { description: No valid session. }
 *       404: { description: NOT_FOUND. }
 */
tradePlanRouter.patch(
  '/:id/decision',
  validate('param', IdParamSchema),
  validate('json', UpdateTradePlanDecisionSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { decision } = c.req.valid('json');
    return c.json(await setTradePlanDecision(c.get('userId'), id, decision), 200);
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
