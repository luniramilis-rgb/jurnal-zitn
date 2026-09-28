import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { MESSAGES } from '@jurnal-zitn/shared';

import manifestJson from './i18n-review.manifest.json';

/**
 * Penegak tinjauan manual per halaman (ZITN-TECH-021 §4/§5.6, anti-busuk).
 *
 * `i18n-review.manifest.json` menyimpan, per rute, himpunan kunci kamus yang dipakai
 * (`keyHash`). Bila kunci berubah pada rute yang sudah ditinjau (`sah`) — atau pada rute
 * Lapis 1 — status harus turun ke `perlu-ulang` dan CI gagal sampai ditinjau ulang.
 * Regenerasi hash: `node scripts/i18n-coverage.mjs --emit-manifest`.
 */

type ReviewStatus = 'belum' | 'sedang' | 'perlu-ulang' | 'sah';

interface ReviewRoute {
  route: string;
  layer: number;
  files: string[];
  status: ReviewStatus;
  reviewer: string | null;
  date: string | null;
  commit: string | null;
  keys: string[];
  keyHash: string;
  notes: string;
}

interface ReviewManifest {
  version: number;
  routes: ReviewRoute[];
}

const MANIFEST = manifestJson as unknown as ReviewManifest;
const BASE_DIR = dirname(fileURLToPath(import.meta.url));

const VALID_KEYS = new Set(Object.keys(MESSAGES.id));

const STRING_RE = /'([^'\\\n]*)'|"([^"\\\n]*)"/g;

function usedKeys(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(STRING_RE)) {
    const value = match[1] ?? match[2];
    if (value !== undefined && VALID_KEYS.has(value)) found.add(value);
  }
  return [...found].sort();
}

/** FNV-1a 32-bit — harus sama dengan `scripts/i18n-coverage.mjs`. */
function hashKeys(keys: string[]): string {
  let hash = 0x811c9dc5;
  const joined = [...keys].sort().join('\n');
  for (let i = 0; i < joined.length; i += 1) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function routeKeys(route: ReviewRoute): string[] {
  const keys = new Set<string>();
  for (const file of route.files) {
    const abs = resolve(BASE_DIR, file);
    const source = readFileSync(abs, 'utf8');
    for (const key of usedKeys(source)) keys.add(key);
  }
  return [...keys].sort();
}

describe('ledger tinjauan i18n (ZITN-TECH-021)', () => {
  it('manifest berbentuk sah', () => {
    expect(MANIFEST.version).toBe(1);
    expect(Array.isArray(MANIFEST.routes)).toBe(true);
    expect(MANIFEST.routes.length).toBeGreaterThan(0);
    for (const route of MANIFEST.routes) {
      expect(typeof route.route).toBe('string');
      expect([1, 2, 3]).toContain(route.layer);
      expect(['belum', 'sedang', 'perlu-ulang', 'sah']).toContain(route.status);
      expect(route.files.length).toBeGreaterThan(0);
    }
  });

  it('rute Lapis 1 tidak berstatus perlu-ulang', () => {
    const stale = MANIFEST.routes.filter(
      (route) => route.layer === 1 && route.status === 'perlu-ulang',
    );
    expect(stale.map((route) => route.route)).toEqual([]);
  });

  it('status sah wajib punya peninjau, tanggal, dan commit', () => {
    for (const route of MANIFEST.routes.filter((r) => r.status === 'sah')) {
      expect(route.reviewer, `${route.route}: reviewer`).toBeTruthy();
      expect(route.date, `${route.route}: date`).toBeTruthy();
      expect(route.commit, `${route.route}: commit`).toBeTruthy();
    }
  });

  it('hash himpunan kunci cocok pada rute sah dan Lapis 1', () => {
    const drifted: string[] = [];
    const staleNonPriority: string[] = [];
    for (const route of MANIFEST.routes) {
      let keys: string[];
      try {
        keys = routeKeys(route);
      } catch (error) {
        throw new Error(`rute ${route.route}: gagal membaca berkas — ${String(error)}`);
      }
      const hash = hashKeys(keys);
      if (hash === route.keyHash) continue;
      if (route.status === 'sah' || route.layer === 1) drifted.push(route.route);
      else staleNonPriority.push(route.route);
    }
    if (staleNonPriority.length > 0) {
      // Lapis 2–3 yang belum ditinjau boleh drift; regenerasi saat mulai dikerjakan.
      console.warn(`i18n-review: hash drift (belum prioritas): ${staleNonPriority.join(', ')}`);
    }
    expect(
      drifted,
      `hash berubah — setel status ke \`perlu-ulang\` lalu tinjau ulang:\n${drifted.join('\n')}`,
    ).toEqual([]);
  });

  it('setiap kunci yang tersimpan ada di kamus', () => {
    for (const route of MANIFEST.routes) {
      for (const key of route.keys) {
        expect(VALID_KEYS.has(key), `${route.route}: kunci tak dikenal ${key}`).toBe(true);
      }
    }
  });
});
