/**
 * ZITN SSO route (ZITN-TECH-017, runtime A). Mounted at `/api/auth` next to the other
 * auth routers, so the endpoints are `/api/auth/sso`.
 *
 * Flow: ZITN redirects the browser to `${JOURNAL_SSO_URL}/sso?token=<one-time>`. Point
 * `JOURNAL_SSO_URL` at this API's `/api/auth` base so the GET below sets the journal
 * `session` cookie on the app origin and redirects to `/`. A JSON `POST` variant exists
 * for an SPA that prefers to exchange the token itself.
 *
 * Never opens from a rule/result event; only from an explicit ZITN redirect carrying a
 * valid token.
 */

import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';

import { sessionCookieOptions } from '@/lib/cookie-policy';

import { exchangeSsoToken } from './sso.service';

const sso = new Hono();

/**
 * @swagger
 * /api/auth/sso:
 *   get:
 *     summary: Exchange a ZITN SSO token and start a session (browser redirect).
 *     description: >
 *       Public. Verifies the single-use token minted by ZITN, consumes its nonce, and on
 *       success sets the `session` cookie and redirects to `/`. Fail-closed when the
 *       instance has no `JOURNAL_SSO_SECRET`.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       302: { description: Session started; redirect to `/`. }
 *       401: { description: Invalid, expired, or replayed token. }
 *       503: { description: ZITN SSO is not configured on this instance. }
 */
sso.get('/sso', async (c) => {
  const { token } = await exchangeSsoToken(c.req.query('token'));
  setCookie(c, 'session', token, sessionCookieOptions());
  return c.redirect('/', 302);
});

/**
 * @swagger
 * /api/auth/sso:
 *   post:
 *     summary: Exchange a ZITN SSO token and start a session (JSON).
 *     description: >
 *       Public. Same verification and single-use nonce as the GET; returns the user id
 *       and sets the `session` cookie instead of redirecting. For SPAs.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: 'Session started: `{ ok: true, userId }`.' }
 *       401: { description: Invalid, expired, or replayed token. }
 *       503: { description: ZITN SSO is not configured on this instance. }
 */
sso.post('/sso', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { token?: unknown };
  const { token, userId } = await exchangeSsoToken(body?.token);
  setCookie(c, 'session', token, sessionCookieOptions());
  return c.json({ ok: true, userId }, 200);
});

export default sso;
