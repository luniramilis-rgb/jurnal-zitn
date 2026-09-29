import { t } from './i18n';
import { getAppLocale } from './locale';

/** U+2014 EM DASH. The canonical "absent value" marker across formatters. */
export const EM_DASH = '—';

/** Display string for missing numeric stats. */
export const NULL_PLACEHOLDER = EM_DASH;

const NUMBER_FORMAT_CACHE = new Map<string, Intl.NumberFormat>();
const DATE_TIME_FORMAT_CACHE = new Map<string, Intl.DateTimeFormat>();

/**
 * Reuse one `Intl` formatter per `locale + options` instead of constructing a new one for
 * every cell — the csv-import preview formats up to `CSV_IMPORT_MAX_ROWS` rows in one render
 * (ZITN-TECH-025 review, performance track). Keyed by locale so a locale switch is honoured.
 */
function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = getAppLocale();
  const cacheKey = `${locale}|${JSON.stringify(options)}`;
  let formatter = NUMBER_FORMAT_CACHE.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    NUMBER_FORMAT_CACHE.set(cacheKey, formatter);
  }
  return formatter;
}

function dateTimeFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = getAppLocale();
  const cacheKey = `${locale}|${JSON.stringify(options)}`;
  let formatter = DATE_TIME_FORMAT_CACHE.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    DATE_TIME_FORMAT_CACHE.set(cacheKey, formatter);
  }
  return formatter;
}

/**
 * Canonical on-screen money rendering. SUFFIX-LESS: a USD amount renders as
 * `$1,234.50` — the trailing ` USD` code suffix was dropped so every caller
 * (P&L surfaces, expenses, fees, tax, billing) renders one canonical way.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  return numberFormat({ style: 'currency', currency: currencyCode }).format(amount);
}

export function formatMoney(decimalString: string, currencyCode: string): string {
  return numberFormat({ style: 'currency', currency: currencyCode }).format(Number(decimalString));
}

/**
 * Format a number with an always-on leading sign (`+`/`−`) for non-zero
 * values; zero gets no sign. This is the always-on, non-color signal channel
 * so direction survives greyscale / colorblind rendering. `opts` is forwarded
 * to `Intl.NumberFormat` (e.g. `style: 'currency'`, `minimumFractionDigits`).
 */
export function formatSigned(value: number, opts: Intl.NumberFormatOptions = {}): string {
  return numberFormat({ ...opts, signDisplay: 'exceptZero' }).format(value);
}

/**
 * Accounting-register currency formatting: negatives render parenthesized
 * (`(1,240.00)`) instead of with a minus, gains keep a leading `+`, and zero
 * keeps its bare marker. All three directions survive greyscale because the
 * sign channel (parens vs `+` vs none) is independent of color.
 *
 * Built + unit-tested now; its APPLICATION to a print/export surface is
 * DEFERRED (d-cc56d2ab). Do NOT bind it to any surface here.
 */
export function formatAccounting(value: number, currency: string): string {
  return numberFormat({
    style: 'currency',
    currency,
    currencySign: 'accounting',
    signDisplay: 'exceptZero',
  }).format(value);
}

/**
 * Single direction classifier shared by the money primitive and the chart
 * formatter. `null` is the only `'absent'` case; `0` is `'flat'`; positive is
 * `'gain'`, negative is `'loss'`.
 */
export function moneyDirection(value: number | null): 'gain' | 'loss' | 'flat' | 'absent' {
  if (value === null) return 'absent';
  if (value === 0) return 'flat';
  return value > 0 ? 'gain' : 'loss';
}

/**
 * Format a percent number (0..100, up to 1 decimal place per REQ-4.3) for
 * display. Callers must pass `null` for the not-applicable case (e.g. zero
 * winning + losing positions); the placeholder is the responsibility of the
 * caller, NOT this function — keeping this pure makes it easy to swap the
 * placeholder in StatsPanel rendering.
 *
 * Returns the placeholder em-dash for `null` so it can be inlined in JSX.
 */
export function formatPercent(value: number | null): string {
  if (value === null) return NULL_PLACEHOLDER;
  return `${value.toFixed(1)}%`;
}

/**
 * Format the profit factor stat. The frontend disambiguates the two `null`
 * cases by inspecting `hasWins` and `hasLosses` (REQ-4.7, REQ-4.11):
 *
 *   - `pf` is a finite number → render with 2 decimals.
 *   - `pf === null && hasWins && !hasLosses` → ∞ (only this combination).
 *   - any other null → em dash.
 *
 * The 2-decimal contract is set by the API schema (`profitFactorRefinement`),
 * so we always have at most 2 decimals on input; using `toFixed(2)` here is
 * canonicalization, not rounding (matches `formatPercent`'s shape).
 */
export function formatProfitFactor(
  pf: number | null,
  hasWins: boolean,
  hasLosses: boolean,
): string {
  if (pf !== null) return pf.toFixed(2);
  if (hasWins && !hasLosses) return '∞'; // ∞
  return NULL_PLACEHOLDER;
}

/**
 * Locale-aware date+time for an INSTANT (ledger `occurredAt` stamps). Unlike
 * `formatDate` in `@jurnal-zitn/shared` (which pins UTC for date-only values),
 * this renders in the viewer's local zone — the same behavior the old
 * `new Date(iso).toLocaleString()` had, but pinned to the app locale (R13-b).
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFormat({ dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  if (iso === '') return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const diffSec = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));

  if (diffSec < 60) return t('time.justNow');
  if (diffSec < 3600) return t('time.minutesAgo', { n: Math.floor(diffSec / 60) });
  if (diffSec < 86_400) return t('time.hoursAgo', { n: Math.floor(diffSec / 3600) });
  if (diffSec < 172_800) return t('time.yesterday');
  if (diffSec < 604_800) return t('time.daysAgo', { n: Math.floor(diffSec / 86_400) });
  return then.toLocaleDateString(getAppLocale(), { month: 'short', day: 'numeric' });
}
