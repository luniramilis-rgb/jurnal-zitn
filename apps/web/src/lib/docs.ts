/**
 * Links from the app to the documentation.
 *
 * One place, so the host appears once. There were previously ZERO links from
 * this app to the docs: a user who needed an explanation had to already know the
 * site existed and go looking for it, which is most of the reason documentation
 * goes unread.
 *
 * External links deliberately open in a new tab — a reader following a "how does
 * this work" link is mid-task, and replacing the app they were working in loses
 * their place.
 */
import { DOCS_LINKS_ENABLED } from './frontendFlags';

export const DOCS_BASE_URL = 'https://docs.tradr.cloud';

/** Named pages, so a rename is one edit rather than a grep. */
export const DOCS = {
  home: '/',
  gettingStarted: '/user-guide/getting-started/',
  positions: '/user-guide/positions/',
  accountDeletion: '/user-guide/account-deletion/',
  importHistory: '/user-guide/import-history/',
  metricsGlossary: '/user-guide/reference/metrics-glossary/',
  accounts: '/user-guide/accounts/',
  optionsTools: '/user-guide/options-tools/',
  selfHosting: '/self-hosting/docker-compose/',
  envVars: '/self-hosting/reference/env-vars/',
  backupRestore: '/self-hosting/backup-restore/',
} as const;

export type DocsPage = keyof typeof DOCS;

/** Absolute URL for a named documentation page. */
export function docsUrl(page: DocsPage): string {
  return `${DOCS_BASE_URL}${DOCS[page]}`;
}

/**
 * `docsUrl(page)` while the documentation surface is enabled, else `null`.
 *
 * Callers render a link only when this is non-null. During the ZITN rebrand the
 * external Tradr docs host is hidden (`frontendFlags.DOCS_LINKS_ENABLED = false`),
 * so no in-app link points at it. The mapping is kept, not deleted — flipping the
 * flag restores every link at once.
 */
export function docsHref(page: DocsPage): string | null {
  return DOCS_LINKS_ENABLED ? docsUrl(page) : null;
}
