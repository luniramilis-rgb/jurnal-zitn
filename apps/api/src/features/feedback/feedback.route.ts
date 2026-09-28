import { Hono } from 'hono';

import { CreateFeedbackInputSchema } from '@jurnal-zitn/shared';

import { validate } from '@/lib/validation';
import { authMiddleware } from '@/middleware/auth.middleware';

import { submitFeedback } from './feedback.service';

// ---------------------------------------------------------------------------
// In-app feedback (ZITN-TECH-017 §10.4, F0b). The ZITN dashboard's feedback
// posture, reimplemented on our own API: login required, a type + a message +
// the page URL, and one row scoped to the sender. The admin inbox lives on the
// gated /api/admin router.
// ---------------------------------------------------------------------------

type AuthEnv = {
  Variables: {
    userId: string;
    isAdmin: boolean;
  };
};

const feedbackRouter = new Hono<AuthEnv>();

feedbackRouter.use(authMiddleware);

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Submit in-app feedback.
 *     description: >
 *       Authed. Stores one feedback row scoped to the caller. `type` is one of
 *       bug/feature/general/question, `message` is 10–500 characters, `pageUrl`
 *       is the client-supplied page the feedback was sent from, and `source`
 *       defaults to `jurnal` (the daily sheet sends `lembar`). Insert-only;
 *       no telemetry is emitted.
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, message, pageUrl]
 *             properties:
 *               type: { type: string, enum: [bug, feature, general, question] }
 *               message: { type: string, minLength: 10, maxLength: 500 }
 *               pageUrl: { type: string, maxLength: 2048 }
 *               source: { type: string, enum: [jurnal, lembar], default: jurnal }
 *     responses:
 *       201: { description: The created feedback row. }
 *       400: { description: VALIDATION_ERROR — malformed body. }
 *       401: { description: No valid session. }
 */
feedbackRouter.post('/', validate('json', CreateFeedbackInputSchema), async (c) => {
  const userId = c.get('userId');
  const input = c.req.valid('json');
  const row = await submitFeedback(userId, input);
  return c.json(row, 201);
});

export default feedbackRouter;
