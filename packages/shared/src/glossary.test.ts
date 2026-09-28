import { describe, expect, it } from 'vitest';

import {
  GLOSSARY,
  glossaryTermKeys,
  TERM_MESSAGES,
  type GlossaryEntry,
  type TermMessageKey,
} from './glossary';
import { catalogsComplete, MESSAGES, type MessageKey } from './i18n';

/**
 * Lint glosarium + kamus (ZITN-TECH-021 §4).
 *
 * Menegakkan tiga hal:
 * (a) tiap kunci `id` terisi dan istilah `term.*` sinkron dengan `glossary.ts`;
 * (b) kalimat ≥3 kata tidak boleh `id === en` kecuali istilah yang sudah diputuskan
 *     di glosarium (deteksi salinan yang belum diterjemahkan);
 * (c) istilah `keep-en` tidak muncul dalam bentuk di-Indonesiakan.
 */

const ALL_KEYS = Object.keys(MESSAGES.id) as MessageKey[];

const normalize = (value: string): string => value.replace(/\{[^}]*\}/g, 'X');

const wordCount = (value: string): number =>
  normalize(value).trim().split(/\s+/).filter(Boolean).length;

/**
 * Sebuah nilai `id === en` boleh berupa kalimat ≥3 kata bila:
 * - kuncinya bagian namespace `term.*`, atau
 * - nilainya memuat istilah yang sudah diputuskan di glosarium (mis. "PPh Final", "Risk of ruin").
 * Selain itu dianggap salinan yang belum diterjemahkan.
 */
function isDeclaredIdentical(key: MessageKey, value: string): boolean {
  if (key.startsWith('term.')) return true;
  const hay = normalize(value).toLowerCase();
  return GLOSSARY.some((entry) => {
    const needle = normalize(entry.en).toLowerCase();
    return needle.length > 0 && hay.includes(needle);
  });
}

/**
 * `forbidden` hanya berlaku pada **posisi label** — nilai `id` entri dan nilai `term.*`
 * terkait — bukan kalimat penjelas (disclaimer/deskripsi). Ini mencegah lint gagal pada
 * copy yang sah (mis. `tax.disc.recCA` memuat "laba/rugi realisasi").
 */
function labelViolations(entry: GlossaryEntry): string[] {
  const labels = [entry.id];
  if (entry.termKey !== undefined) {
    labels.push(MESSAGES.id[entry.termKey], MESSAGES.en[entry.termKey]);
  }
  return (entry.forbidden ?? []).filter((forbidden) =>
    labels.some((label) => label.toLowerCase().includes(forbidden.toLowerCase())),
  );
}

describe('glosarium — bentuk entri', () => {
  it('tiap entri punya key/en/id tidak kosong', () => {
    for (const entry of GLOSSARY) {
      expect(entry.key.trim().length, `key kosong: ${JSON.stringify(entry)}`).toBeGreaterThan(0);
      expect(entry.en.trim().length, `en kosong: ${entry.key}`).toBeGreaterThan(0);
      expect(entry.id.trim().length, `id kosong: ${entry.key}`).toBeGreaterThan(0);
    }
  });

  it('key glosarium unik', () => {
    const keys = GLOSSARY.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('istilah keep-en memakai EN apa adanya (id === en)', () => {
    for (const entry of GLOSSARY.filter((e) => e.policy === 'keep-en')) {
      expect(entry.id, `keep-en tidak identik: ${entry.key}`).toBe(entry.en);
    }
  });

  it('istilah translate punya padanan Indonesia (id !== en)', () => {
    for (const entry of GLOSSARY.filter((e) => e.policy === 'translate')) {
      expect(entry.id, `translate tidak diterjemahkan: ${entry.key}`).not.toBe(entry.en);
    }
  });

  it('entri dengan termKey bukan policy translate', () => {
    for (const entry of GLOSSARY.filter((e) => e.termKey !== undefined)) {
      expect(entry.policy, `termKey pada entri translate: ${entry.key}`).not.toBe('translate');
    }
  });

  it('bentuk terlarang hanya diperiksa pada posisi label', () => {
    for (const entry of GLOSSARY) {
      expect(labelViolations(entry), `label "${entry.key}" memuat bentuk terlarang`).toEqual([]);
    }
  });

  it('kalimat penjelas tidak diperiksa forbidden (bukti tax.disc.recCA)', () => {
    const pnl = GLOSSARY.find((entry) => entry.key === 'pnl');
    expect(pnl).toBeDefined();
    // Kalimat penjelas sah memuat "laba/rugi realisasi" — tidak boleh memicu lint label.
    expect(MESSAGES.id['tax.disc.recCA'].toLowerCase()).toContain('laba/rugi');
    expect(labelViolations(pnl as GlossaryEntry)).toEqual([]);
  });
});

describe('namespace term.* sinkron dengan glosarium', () => {
  it('himpunan kunci term.* sama dengan himpunan termKey glosarium', () => {
    const fromGlossary = glossaryTermKeys();
    const fromMessages = (Object.keys(TERM_MESSAGES) as TermMessageKey[]).sort();
    expect(fromMessages).toEqual(fromGlossary);
  });

  it('nilai term.* identik id/en dan sama dengan glosarium', () => {
    for (const termKey of Object.keys(TERM_MESSAGES) as TermMessageKey[]) {
      expect(MESSAGES.id[termKey], `id ${termKey}`).toBe(TERM_MESSAGES[termKey]);
      expect(MESSAGES.en[termKey], `en ${termKey}`).toBe(TERM_MESSAGES[termKey]);
    }
  });

  it('glosarium tanpa termKey tidak punya entri term.*', () => {
    const withTerm = new Set(
      GLOSSARY.filter((entry) => entry.termKey !== undefined).map((entry) => entry.termKey),
    );
    for (const termKey of Object.keys(TERM_MESSAGES) as TermMessageKey[]) {
      expect(withTerm.has(termKey), `term.* tanpa entri glosarium: ${termKey}`).toBe(true);
    }
  });
});

describe('lint kamus — kalimat yang belum diterjemahkan', () => {
  it('kalimat ≥3 kata hanya boleh id === en bila sudah diputuskan di glosarium', () => {
    const offenders: string[] = [];
    for (const key of ALL_KEYS) {
      const id = MESSAGES.id[key];
      if (id !== MESSAGES.en[key]) continue;
      if (wordCount(id) < 3) continue;
      if (isDeclaredIdentical(key, id)) continue;
      offenders.push(`${key} :: ${id}`);
    }
    expect(offenders, `kunci id === en belum diterjemahkan:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('kedua kamus memuat himpunan kunci yang sama', () => {
    expect(catalogsComplete()).toBe(true);
  });

  it('setiap termKey ada di kedua kamus', () => {
    for (const entry of GLOSSARY.filter((e) => e.termKey !== undefined)) {
      const termKey = entry.termKey as TermMessageKey;
      expect(MESSAGES.id[termKey], `id ${termKey}`).toBeDefined();
      expect(MESSAGES.en[termKey], `en ${termKey}`).toBeDefined();
    }
  });
});
