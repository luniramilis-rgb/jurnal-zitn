/**
 * G1 (ZITN-TECH-017 §11, D-G1): a FULL-PAGE reload of `/login`.
 *
 * In production nginx answers `/login` with a 302 into ZITN's SSO entry, so a
 * real navigation is required (client-side routing would show the SPA's fallback
 * form instead). In dev/e2e the SPA serves that fallback form at `/login`.
 *
 * A module seam so unit tests can assert the redirect without jsdom trying to
 * navigate (its `location.replace` is non-configurable).
 */
export function hardRedirectToLogin(): void {
  window.location.replace('/login');
}
