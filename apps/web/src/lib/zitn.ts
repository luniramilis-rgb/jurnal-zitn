/**
 * ZITN deep-links (Fase G, D-G3/D-G4).
 *
 * The journal is read-only against ZITN and no longer renders its own chart or
 * sheet routes: it carries the context and hands the emitters off to ZITN in a
 * new tab.
 */

/** The public ZITN origin. */
export const ZITN_SITE_URL = 'https://zeninthenoise.com';

/** The ZITN daily sheet — the surface the removed `/lembar` pointed at. */
export const ZITN_DAILY_URL = `${ZITN_SITE_URL}/daily/`;

/** Deep-link to the ZITN chart for an emitter (`pasar=us` for US instruments). */
export function zitnChartUrl(ticker: string, isUs: boolean): string {
  const symbol = encodeURIComponent(ticker.trim().toUpperCase());
  return `${ZITN_SITE_URL}/daily/chart/?symbol=${symbol}&tf=1Y${isUs ? '&pasar=us' : ''}`;
}
