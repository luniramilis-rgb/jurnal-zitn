import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useSessionPresence } from '@/hooks/useAuth';
import { hardRedirectToLogin } from '@/lib/auth-redirect';

/**
 * `/` — the address people actually type, and the one the route tree never had.
 *
 * Every page in the app lives under a named path: `/login`, `/register`, or one
 * of the `_auth` routes. The bare origin matched none of them, so opening
 * https://app.tradr.cloud fell through to __root's `notFoundComponent` — which
 * dispatches a signed-in user to the dashboard, but tells an anonymous visitor
 * their address is wrong. It wasn't; the front door just had no route behind it.
 *
 * SO THE FRONT DOOR IS A DISPATCHER, NOT A REDIRECT. It cannot simply send
 * everyone to `/dashboard` and let `_auth` sort them out: that layout asks
 * through `useAuth`, whose me-query 401s for a visitor with no session, and
 * lib/api's global interception answers every 401 by navigating to
 * `/login?expired=true`. The 404 page has already been through this (see
 * __root's note) — arriving with no session is not the same as one running out.
 *
 * `useSessionPresence` is the question asked the way this page needs it asked: a
 * 401 is the answer "nobody", not an expiry, so an anonymous visitor reaches
 * /login with nothing announced and the interception's one-shot latch unburnt.
 *
 * The navigations replace rather than push, or Back from /login returns to `/`
 * and is redirected straight out again.
 */
function IndexRoute() {
  const { isLoading, isAuthenticated } = useSessionPresence();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // G1 (D-G1): full-page so production nginx 302s /login to ZITN's SSO.
      hardRedirectToLogin();
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Fase H: the journal's new face is Cek Risiko. Post-SSO landings resolve to
    // `/` (sso-redirect.ts), so signing in now arrives at the calculator rather
    // than the full journal. Full mode remains one tap away (and at `/dashboard`).
    return <Navigate to="/cek-risiko" replace />;
  }

  return null;
}

export const Route = createFileRoute('/')({
  component: IndexRoute,
});
