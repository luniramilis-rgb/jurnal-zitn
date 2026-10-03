/**
 * PWA offline (ZITN-TECH-017 §12 / Fase H). Best-effort service-worker
 * registration, production only. Registration failures are swallowed — offline
 * support is an enhancement, never a blocker for the app loading. No telemetry.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Production (and built preview) only — never in `vite dev` or tests.
  if (import.meta.env.DEV === true) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
