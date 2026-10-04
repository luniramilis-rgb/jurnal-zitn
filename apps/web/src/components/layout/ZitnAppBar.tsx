import { Link } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

import { ZITN_SITE_URL } from '@/lib/zitn';
import tokens from '@/styles/zitn-tokens.json';

/**
 * ZitnAppBar — Fase G / G2 (A1). The shared ZITN chrome as a compact top strip:
 * the five ZITN surfaces — Beranda · Pemindai · Chart · Jurnal · Akun. Four
 * are absolute ZITN links; "Jurnal" is this app, so it renders as the current
 * surface (the dashboard). This is the journal → ZITN half of the two-way
 * navigation (G3). Cek Risiko is a journal sidebar feature, not the top-level
 * nav (owner correction 2026-10-04).
 *
 * Styled with the shared ZITN tokens (`zitn-tokens.json`, generated from
 * `src/trutova/core/theme.py` by `scripts/export_theme_tokens.py`) — never
 * hand-copied. Button labels are the ZITN brand nav (Indonesian, same on every
 * ZITN surface), so they are not per-locale dictionary entries.
 *
 * The strip is deliberately scoped to the authenticated layout; it sits above
 * the journal's own sidebar, which keeps the feature navigation intact (A1).
 */

interface NavItem {
  key: string;
  label: string;
  href: string;
  external: boolean;
}

const ITEMS: NavItem[] = [
  { key: 'beranda', label: 'Beranda', href: `${ZITN_SITE_URL}/`, external: true },
  { key: 'pemindai', label: 'Pemindai', href: `${ZITN_SITE_URL}/daily/`, external: true },
  { key: 'chart', label: 'Chart', href: `${ZITN_SITE_URL}/daily/chart/`, external: true },
  { key: 'jurnal', label: 'Jurnal', href: '/dashboard', external: false },
  { key: 'akun', label: 'Akun', href: `${ZITN_SITE_URL}/akun/`, external: true },
];

export function ZitnAppBar() {
  const z = tokens.tokens;
  const style = {
    '--z-bg': z.bg,
    '--z-line': z.line,
    '--z-ink': z.ink,
    '--z-muted': z.muted,
    '--z-accent': z.accent,
    fontFamily: tokens.fontStack,
  } as CSSProperties;

  return (
    <nav
      aria-label="Navigasi aplikasi"
      data-testid="zitn-app-bar"
      style={style}
      className="zitn-appbar"
    >
      {ITEMS.map((item) =>
        item.external ? (
          <a key={item.key} href={item.href}>
            {item.label}
          </a>
        ) : (
          <Link key={item.key} to="/dashboard" aria-current="page">
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export default ZitnAppBar;
