#!/usr/bin/env node
/**
 * i18n coverage worksheet (ZITN-TECH-021 §5).
 *
 * Memetakan, per berkas/rute:
 *  (a) kunci kamus yang dipakai (`key → en → id`), dan
 *  (b) literal JSX yang **belum masuk kamus** (kandidat kalimat mentah).
 *
 * Kamus dibaca langsung dari sumber: `packages/shared/src/i18n.ts` (blok `ID_MESSAGES` /
 * `EN_MESSAGES`) + namespace `term.*` dari `packages/shared/src/glossary.ts`. Skrip sengaja
 * tanpa dependensi agar dapat dijalankan `node scripts/i18n-coverage.mjs` di CI.
 *
 * Keluaran berkas **selalu UTF-8 eksplisit** (`{ encoding: 'utf8' }`). Jangan menyimpulkan
 * temuan encoding dari keluaran konsol PowerShell (lihat rubrik §5.5 "Aturan alat").
 *
 * Pemakaian:
 *   node scripts/i18n-coverage.mjs
 *   node scripts/i18n-coverage.mjs --route accounting/tax-summary
 *   node scripts/i18n-coverage.mjs --worksheet '^tax\.' --out apps/web/docs/i18n-coverage-tax.md
 *   node scripts/i18n-coverage.mjs --json --out /tmp/i18n-coverage.json
 *   node scripts/i18n-coverage.mjs --emit-manifest
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_PATH = join(ROOT, 'packages/shared/src/i18n.ts');
const GLOSSARY_PATH = join(ROOT, 'packages/shared/src/glossary.ts');
const MANIFEST_PATH = join(ROOT, 'apps/web/src/i18n-review.manifest.json');

const SCAN_DIRS = [join(ROOT, 'apps/web/src'), join(ROOT, 'apps/api/src')];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', 'coverage', '__tests__']);

/**
 * Nilai contoh untuk placeholder agar lembar kerja menampilkan salinan yang BENAR-BENAR
 * dibaca pengguna (bukan `{rate}` mentah). Nilai numerik memakai pemisah locale sesuai
 * rubrik R13 (`formatNumber`/`formatDate`) — mis. `rate` → "0,1" (id) / "0.1" (en).
 */
const SAMPLE_VARS = {
  rate: { id: '0,1', en: '0.1' },
  date: { id: '31 Des 2026', en: 'Dec 31, 2026' },
  n: { id: '3', en: '3' },
  year: { id: '2026', en: '2026' },
  list: { id: 'USD, SGD', en: 'USD, SGD' },
  currency: { id: 'IDR', en: 'IDR' },
  symbol: { id: 'BBCA', en: 'BBCA' },
  window: { id: '20', en: '20' },
  email: { id: 'budi@contoh.id', en: 'budi@example.com' },
  total: { id: '12', en: '12' },
  amount: { id: '1.250.000,00', en: '1,250,000.00' },
};

function substituteSamples(value, locale) {
  return value.replace(/\{([^}]+)\}/g, (whole, name) => {
    const sample = SAMPLE_VARS[name];
    return sample ? sample[locale] : whole;
  });
}

// ---------------------------------------------------------------------------
// Parsing kamus
// ---------------------------------------------------------------------------

function sliceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`i18n-coverage: penanda awal tidak ditemukan: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`i18n-coverage: penanda akhir tidak ditemukan: ${endMarker}`);
  return source.slice(start, end);
}

const ENTRY_RE = /['"]([^'"\\]+)['"]\s*:\s*(['"])((?:\\.|(?!\2)[\s\S])*?)\2\s*,/g;

function unescapeJs(value) {
  return value.replace(/\\(['"\\])/g, '$1');
}

function parseEntries(block) {
  const out = {};
  for (const match of block.matchAll(ENTRY_RE)) {
    out[match[1]] = unescapeJs(match[3]);
  }
  return out;
}

function parseTermMessages(source) {
  const block = sliceBlock(source, 'export const TERM_MESSAGES = {', '} as const;');
  return parseEntries(block);
}

function loadCatalog() {
  const i18nSource = readFileSync(I18N_PATH, 'utf8');
  const glossarySource = readFileSync(GLOSSARY_PATH, 'utf8');
  const id = parseEntries(sliceBlock(i18nSource, 'const ID_MESSAGES = {', 'export type MessageKey'));
  const en = parseEntries(
    sliceBlock(i18nSource, 'const EN_MESSAGES: Record<MessageKey, string> = {', 'export const MESSAGES'),
  );
  const terms = parseTermMessages(glossarySource);
  for (const [key, value] of Object.entries(terms)) {
    id[key] = value;
    en[key] = value;
  }
  const idKeys = Object.keys(id).sort();
  const enKeys = Object.keys(en).sort();
  if (idKeys.length < 600 || idKeys.length !== enKeys.length) {
    throw new Error(
      `i18n-coverage: parse kamus mencurigakan (id=${idKeys.length}, en=${enKeys.length})`,
    );
  }
  if (idKeys.some((key, index) => key !== enKeys[index])) {
    throw new Error('i18n-coverage: himpunan kunci id/en tidak identik — periksa parser');
  }
  return { id, en, keys: idKeys };
}

// ---------------------------------------------------------------------------
// Pemindaian sumber
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path, out);
    } else if (['.ts', '.tsx'].includes(extname(name)) && !/\.test\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const STRING_RE = /'([^'\\\n]*)'|"([^"\\\n]*)"/g;

function literals(source) {
  const out = [];
  for (const match of source.matchAll(STRING_RE)) {
    const value = match[1] ?? match[2];
    if (value !== undefined) out.push(value);
  }
  return out;
}

function usedKeys(source, validKeys) {
  const found = new Set();
  for (const value of literals(source)) {
    if (validKeys.has(value)) found.add(value);
  }
  return [...found].sort();
}

const PROSE_ATTRS =
  '(title|placeholder|aria-label|alt|label|description|message|heading|header|emptyText|confirmText|tooltip)';

function looksLikeProse(text) {
  const value = text.replace(/\s+/g, ' ').trim();
  if (value.length < 4 || value.length > 200) return false;
  if (!/[A-Za-z\u00c0-\u024f]/.test(value)) return false;
  if (!/\s/.test(value)) return false;
  // Fragmen kode/JSX, bukan salinan.
  if (/[;={}[\]|$~^`<>()?]/.test(value)) return false;
  if (/^\s*[&,:]/.test(value)) return false;
  // Data path SVG (mis. "M-20 540 C140 520 …").
  if (/^[MmCcLlHhVvSsQqTtAaZz][\d\s.,-]/.test(value)) return false;
  if (/^[A-Z][a-z]+-\d/.test(value)) return false;
  // Kelas CSS / slug (huruf kecil, digit, tanda baca teknis) — bukan kalimat.
  if (/^[a-z0-9.:%/()\-\s]+$/.test(value)) return false;
  // URL / jalur impor.
  if (/^(https?:|\/|@\/|\.)/.test(value)) return false;
  // Harus memuat kata alfabetik (bukan deret teknis seperti "px-3 py-1.5").
  if (!/[A-Za-z\u00c0-\u024f]{2,}/.test(value)) return false;
  return true;
}

function jsxCandidates(file, source, validKeys) {
  const clean = stripComments(source);
  const candidates = [];
  const lines = clean.split('\n');
  const lineOf = (index) => clean.slice(0, index).split('\n').length;

  // JSX text nodes: >teks<
  for (const match of clean.matchAll(/>([^<>{}]+)</g)) {
    const value = match[1].replace(/\s+/g, ' ').trim();
    if (looksLikeProse(value) && !validKeys.has(value)) {
      candidates.push({ file, line: lineOf(match.index), kind: 'jsx-text', value });
    }
  }

  // Atribut bergaya salinan.
  const attrRe = new RegExp(`${PROSE_ATTRS}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{\\s*'([^']+)'\\s*\\})`, 'g');
  for (const match of clean.matchAll(attrRe)) {
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (looksLikeProse(value) && !validKeys.has(value)) {
      candidates.push({ file, line: lineOf(match.index), kind: 'attr', value });
    }
  }

  // Sapuan tambahan: literal panjang bertitik-titik di baris yang tidak memakai t(...).
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('t(') || line.includes('translate(')) continue;
    for (const match of line.matchAll(/'([^'\\]{18,})'|"([^"\\]{18,})"/g)) {
      const value = match[1] ?? match[2] ?? '';
      if (looksLikeProse(value) && !validKeys.has(value) && !validKeys.has(value.trim())) {
        candidates.push({ file, line: i + 1, kind: 'literal', value });
      }
    }
  }

  // R14: placeholder numerik memakai pemisah desimal EN — di UI ID harus "0,00".
  const numericPlaceholderRe =
    /placeholder\s*=\s*(?:"(\d+\.\d+)"|'(\d+\.\d+)'|\{\s*'(\d+\.\d+)'\s*\})/g;
  for (const match of clean.matchAll(numericPlaceholderRe)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    candidates.push({ file, line: lineOf(match.index), kind: 'r14-placeholder', value });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Manifest tinjau (hash himpunan kunci per rute)
// ---------------------------------------------------------------------------

function hashKeys(keys) {
  // FNV-1a 32-bit, deterministik & tanpa dependensi. Bukan kripto — hanya penanda drift.
  let hash = 0x811c9dc5;
  const joined = [...keys].sort().join('\n');
  for (let i = 0; i < joined.length; i += 1) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function emitManifest(catalog) {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`i18n-coverage: manifest tidak ada: ${MANIFEST_PATH}`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const validKeys = new Set(catalog.keys);
  const base = dirname(MANIFEST_PATH);
  for (const entry of manifest.routes) {
    const keys = new Set();
    for (const file of entry.files) {
      const abs = resolve(base, file);
      if (!existsSync(abs)) throw new Error(`i18n-coverage: berkas rute hilang: ${file}`);
      for (const key of usedKeys(readFileSync(abs, 'utf8'), validKeys)) keys.add(key);
    }
    const sorted = [...keys].sort();
    const hash = hashKeys(sorted);
    if (entry.status === 'sah' && entry.keyHash !== hash) {
      entry.status = 'perlu-ulang';
      entry.notes = [entry.notes, 'hash berubah — tinjau ulang'].filter(Boolean).join('; ');
    }
    entry.keys = sorted;
    entry.keyHash = hash;
  }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { route: null, worksheet: null, out: null, json: false, emitManifest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--route') args.route = argv[++i];
    else if (token === '--worksheet') args.worksheet = argv[++i];
    else if (token === '--out') args.out = argv[++i];
    else if (token === '--json') args.json = true;
    else if (token === '--emit-manifest') args.emitManifest = true;
    else throw new Error(`i18n-coverage: argumen tidak dikenal: ${token}`);
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const catalog = loadCatalog();

  if (args.emitManifest) {
    const manifest = emitManifest(catalog);
    process.stdout.write(`manifest diperbarui: ${relative(ROOT, MANIFEST_PATH)} (${manifest.routes.length} rute)\n`);
    return 0;
  }

  const validKeys = new Set(catalog.keys);
  const files = walk(SCAN_DIRS[0]).concat(walk(SCAN_DIRS[1]));
  const routeFilter = args.route ? args.route.toLowerCase() : null;
  const selected = routeFilter
    ? files.filter((file) =>
        relative(ROOT, file).split(sep).join('/').toLowerCase().includes(routeFilter),
      )
    : files;

  const used = new Map();
  const candidates = [];
  for (const file of selected) {
    const source = readFileSync(file, 'utf8');
    used.set(file, usedKeys(source, validKeys));
    for (const candidate of jsxCandidates(file, source, validKeys)) {
      candidates.push({ ...candidate, file: relative(ROOT, candidate.file).split(sep).join('/') });
    }
  }

  const worksheetKeys = args.worksheet
    ? catalog.keys.filter((key) => new RegExp(args.worksheet).test(key))
    : null;

  const keyCount = [...used.values()].reduce((sum, keys) => sum + keys.length, 0);

  let output;
  if (args.json) {
    output = `${JSON.stringify(
      {
        catalogSize: catalog.keys.length,
        scannedFiles: selected.length,
        usedKeyReferences: keyCount,
        unextracted: candidates,
        worksheet: worksheetKeys
          ? worksheetKeys.map((key) => ({
              key,
              en: catalog.en[key],
              id: catalog.id[key],
              idSubstituted: substituteSamples(catalog.id[key], 'id'),
              enSubstituted: substituteSamples(catalog.en[key], 'en'),
            }))
          : undefined,
      },
      null,
      2,
    )}\n`;
  } else {
    const lines = [];
    lines.push('# i18n coverage — Jurnal ZITN (ZITN-TECH-021 §5)');
    lines.push('');
    lines.push(`- Kunci kamus: **${catalog.keys.length}** (id/en identik)`);
    lines.push(`- Berkas dipindai: **${selected.length}**`);
    lines.push(`- Referensi kunci kamus: **${keyCount}**`);
    lines.push(`- Literal JSX belum-terekstrak (kandidat): **${candidates.length}**`);
    lines.push(
      `  - teks JSX: ${candidates.filter((c) => c.kind === 'jsx-text').length} · atribut: ${
        candidates.filter((c) => c.kind === 'attr').length
      } · literal lain: ${candidates.filter((c) => c.kind === 'literal').length} · placeholder numerik R14: ${
        candidates.filter((c) => c.kind === 'r14-placeholder').length
      }`,
    );
    lines.push('');

    if (worksheetKeys) {
      lines.push(`## Lembar kerja (\`${args.worksheet}\`)`);
      lines.push('');
      lines.push('| Key | en | id | id (substitusi contoh) | en (substitusi contoh) |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const key of worksheetKeys) {
        const idSub = substituteSamples(catalog.id[key], 'id').replace(/\|/g, '\\|');
        const enSub = substituteSamples(catalog.en[key], 'en').replace(/\|/g, '\\|');
        lines.push(`| \`${key}\` | ${catalog.en[key]} | ${catalog.id[key]} | ${idSub} | ${enSub} |`);
      }
      lines.push('');
    }

    lines.push('## Kandidat literal JSX belum-terekstrak');
    lines.push('');
    if (candidates.length === 0) {
      lines.push('Tidak ada kandidat.');
    } else {
      lines.push('| Berkas | Baris | Jenis | Teks |');
      lines.push('| --- | --- | --- | --- |');
      for (const candidate of candidates.slice(0, 400)) {
        const text = candidate.value.replace(/\|/g, '\\|').slice(0, 120);
        lines.push(`| ${candidate.file} | ${candidate.line} | ${candidate.kind} | ${text} |`);
      }
      if (candidates.length > 400) lines.push(`| … | | | +${candidates.length - 400} lagi |`);
    }
    lines.push('');

    const r14 = candidates.filter((candidate) => candidate.kind === 'r14-placeholder');
    if (r14.length > 0) {
      lines.push('## R14 — placeholder numerik (pemisah desimal EN di UI ID)');
      lines.push('');
      lines.push('| Berkas | Baris | Placeholder |');
      lines.push('| --- | --- | --- |');
      for (const candidate of r14) {
        lines.push(`| ${candidate.file} | ${candidate.line} | \`${candidate.value}\` |`);
      }
      lines.push('');
    }
    output = lines.join('\n');
  }

  if (args.out) {
    const outPath = resolve(ROOT, args.out);
    writeFileSync(outPath, output, 'utf8');
    process.stdout.write(`ditulis: ${relative(ROOT, outPath)} (utf8)\n`);
  } else {
    process.stdout.write(output);
  }
  return 0;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.exit(main(process.argv.slice(2)));
}
