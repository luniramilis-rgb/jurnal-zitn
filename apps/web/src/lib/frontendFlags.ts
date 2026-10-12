/**
 * Build-time surface switches for the ZITN rebrand (Oct 2026).
 *
 * These Tradr-era surfaces are intentionally KEPT in the code — not deleted — so
 * they can be restored by flipping a flag and redeploying. `false` hides them
 * from the frontend.
 *
 * - `CHANGELOG_ENABLED` — the release-notes ("Changelog") nav entry, its
 *   new-updates badge, the release fetch behind it, and the `/changelog` route.
 * - `DOCS_LINKS_ENABLED` — the "Docs" nav entry that links out to the external
 *   Tradr documentation host (`docs.tradr.cloud`, see `lib/docs.ts`).
 * - `POSITION_SIZING_ENABLED` — the "Hitung Posisi" tab on Cek Risiko (see
 *   `features/cek-risiko`; formerly "Hitung Lot"). Enabled with the two-mode sizing
 *   surface (ZITN-TECH-063): mode is auto-derived from the plan's SL (with-SL →
 *   risk-based lot sizing; no-SL → weight×slots + tail budget).
 */
export const CHANGELOG_ENABLED = false;
export const DOCS_LINKS_ENABLED = false;
export const POSITION_SIZING_ENABLED = true;
