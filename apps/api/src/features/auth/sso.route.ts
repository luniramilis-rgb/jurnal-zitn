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

import { safeLocalRedirect } from '@jurnal-zitn/shared';

import { createOrFocusPendingPlan } from '@/features/trade-plans/trade-plan.service';
import { config, isSsoConfigured } from '@/lib/config';
import { sessionCookieOptions } from '@/lib/cookie-policy';

import { ssoRedirectTarget } from './sso-redirect';
import { exchangeSsoToken } from './sso.service';

const sso = new Hono();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TICKER_RE = /^[A-Z0-9.\-]{1,12}$/;

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
 *       - in: query
 *         name: tanggal
 *         required: false
 *         schema: { type: string, format: date }
 *         description: >
 *           Optional lembar date (`YYYY-MM-DD`) carried from the ZITN lembar link; on success the
 *           redirect becomes `/lembar?tanggal=…` so the journal can show "that day's sheet" context.
 *       - in: query
 *         name: add
 *         required: false
 *         schema: { type: string }
 *         description: >
 *           Optional ticker from Pemindai ZITN's "Tambah ke Jurnal" (ZITN-TECH-043). On success the
 *           journal creates (or focuses) an idempotent Pending F4 draft for this symbol+market and
 *           redirects to `/trade-plans?focus=<id>`. Identity only — no levels.
 *       - in: query
 *         name: pasar
 *         required: false
 *         schema: { type: string, enum: [id, us] }
 *         description: Market of the added ticker (`id` default, `us` for S&P 500).
 *     responses:
 *       302: { description: Session started; redirect to `/` (or `/lembar?tanggal=…`, or the draft). }
 *       401: { description: Invalid, expired, or replayed token. }
 *       503: { description: ZITN SSO is not configured on this instance. }
 */
sso.get('/sso', async (c) => {
  const { token, userId } = await exchangeSsoToken(c.req.query('token'));
  setCookie(c, 'session', token, sessionCookieOptions());

  // "Tambah ke Jurnal" (ZITN-TECH-043): identitas saja — buat/fokus draf F4 idempoten.
  const add = (c.req.query('add') || '').trim().toUpperCase();
  if (TICKER_RE.test(add) && userId) {
    const pasar = c.req.query('pasar') === 'us' ? 'us' : 'id';
    const tanggal = (c.req.query('tanggal') || '').trim();
    try {
      const { plan } = await createOrFocusPendingPlan(userId, {
        symbol: add,
        market: pasar,
        signalDate: DATE_RE.test(tanggal) ? tanggal : null,
      });
      return c.redirect(`/trade-plans?focus=${plan.id}`, 302);
    } catch {
      // Jangan gagalkan login karena draf; jatuh ke perilaku redirect biasa.
    }
  }

  return c.redirect(ssoRedirectTarget(c.req.query('tanggal'), c.req.query('redirect')), 302);
});

/**
 * @swagger
 * /api/auth/sso/start:
 *   get:
 *     summary: Begin the ZITN SSO handoff (browser redirect to ZITN).
 *     description: >
 *       Public. The login page's "Continue with ZITN" door points here: it
 *       forwards the browser to ZITN's `/api/journal/sso` bridge, carrying the
 *       sanitized local `redirect` target so the round trip returns there. The
 *       ZITN base URL stays server-side (never published via /api/config).
 *       Fail-closed: 503 when the bridge is unconfigured.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: redirect
 *         required: false
 *         schema: { type: string }
 *         description: Local path to return to after login (defaults to /dashboard). Non-local values are ignored.
 *     responses:
 *       302: { description: Redirect to ZITN's SSO bridge. }
 *       503: { description: ZITN SSO is not configured on this instance. }
 */
sso.get('/sso/start', (c) => {
  if (!isSsoConfigured() || !config.ZITN_BASE_URL) {
    return c.json({ ok: false, error: 'journal_sso_nonaktif' }, 503);
  }
  const redirect = safeLocalRedirect(c.req.query('redirect'));
  const target = new URL('/api/journal/sso', config.ZITN_BASE_URL);
  target.searchParams.set('redirect', redirect);
  return c.redirect(target.toString(), 302);
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
