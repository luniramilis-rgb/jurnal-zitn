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
 * - `HITUNG_LOT_ENABLED` — the "Hitung Lot" tab on Cek Risiko (see
 *   `features/cek-risiko`). Hidden while its surface is reworked (ZITN-TECH-049);
 *   when false the page leads with "Profil risiko".
 */
export const CHANGELOG_ENABLED = false;
export const DOCS_LINKS_ENABLED = false;
export const HITUNG_LOT_ENABLED = false;
