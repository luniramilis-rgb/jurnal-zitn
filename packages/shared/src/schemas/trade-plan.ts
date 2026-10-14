import { z } from 'zod';

// F4 — pre-trade plans (ZITN-TECH-017 §10.8). ZITN-TECH-070 §3b reshaped the
// record: RPT is now standalone (no position link), one entry price (no zone),
// one note (no thesis), plus the decision/sizing/praSnapshot/outcome snapshots.
export const TRADE_PLAN_STATUSES = ['pending', 'executed', 'missed', 'cancelled'] as const;
export const TradePlanStatusSchema = z.enum(TRADE_PLAN_STATUSES);
export type TradePlanStatus = z.infer<typeof TradePlanStatusSchema>;

// Keputusan pengguna (ZITN-TECH-070 §3b), terpisah dari lifecycle `status`.
export const TRADE_PLAN_DECISIONS = ['taken', 'skipped', 'no_action'] as const;
export const TradePlanDecisionSchema = z.enum(TRADE_PLAN_DECISIONS);
export type TradePlanDecision = z.infer<typeof TradePlanDecisionSchema>;

export const TRADE_PLAN_SIDES = ['long', 'short'] as const;
export const TradePlanSideSchema = z.enum(TRADE_PLAN_SIDES);

// Market asal draf (prefill dari Pemindai ZITN, ZITN-TECH-043): IDX atau S&P 500.
export const TRADE_PLAN_MARKETS = ['id', 'us'] as const;
export const TradePlanMarketSchema = z.enum(TRADE_PLAN_MARKETS);
export type TradePlanMarket = z.infer<typeof TradePlanMarketSchema>;

// Asal draf (ZITN-TECH-070 §3b).
export const TRADE_PLAN_SOURCES = ['pemindai', 'chart', 'manual'] as const;
export const TradePlanSourceSchema = z.enum(TRADE_PLAN_SOURCES);
export type TradePlanSource = z.infer<typeof TradePlanSourceSchema>;

// Prices cross the wire as decimal strings, like positions.
const priceString = z
  .string()
  .max(32)
  .regex(/^\d+(\.\d+)?$/, 'Must be a non-negative decimal string');

// Tanggal asal sinyal/lembar (YYYY-MM-DD).
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// Ceklis pra-trade tersimpan (ZITN-TECH-069 Lapis 2): centang/jawaban + attestasi + catatan.
// Angka `pra` sendiri TIDAK di sini — dibaca dari konteks lembar (D12=(ii)).
export const TradePlanChecklistSchema = z
  .object({
    items: z.record(z.string(), z.union([z.boolean(), z.string()])),
    attested: z.boolean(),
    note: z.string().max(4000).optional(),
    /** Tanggal konteks `pra` yang disetujui (jejak audit ringan). */
    asOf: z.string().max(32).nullable().optional(),
  })
  .strict();
export type TradePlanChecklist = z.infer<typeof TradePlanChecklistSchema>;

// Snapshot sizing dari Hitung Posisi (ZITN-TECH-070 §3b): apa yang dipakai saat rencana dibuat.
export const TradePlanSizingSchema = z
  .object({
    capital: z.number().optional(),
    riskPct: z.number().optional(),
    /** `lot` untuk IDX, `share` untuk US (fraksional). */
    unit: z.enum(['lot', 'share']).optional(),
    qty: z.number().optional(),
    riskBudget: z.number().optional(),
    maxLoss: z.number().optional(),
    currency: z.string().max(8).optional(),
  })
  .strict();
export type TradePlanSizing = z.infer<typeof TradePlanSizingSchema>;

// Snapshot angka Lapis 1 + `asOf` (ZITN-TECH-070 §3b): artefak bisa berubah, jadi
// angka yang dilihat saat menulis rencana disimpan. Bentuk bebas (kunci D1–D11).
export const TradePlanPraSnapshotSchema = z
  .object({ asOf: z.string().max(32).nullable().optional() })
  .catchall(z.unknown());
export type TradePlanPraSnapshot = z.infer<typeof TradePlanPraSnapshotSchema>;

// Hasil (minimal) setelah rencana berjalan (ZITN-TECH-070 §3b).
export const TradePlanOutcomeSchema = z
  .object({
    result: z.enum(['tp', 'no_tp', 'void']),
    exitPrice: priceString.optional(),
    exitDate: dateString.optional(),
    sessions: z.number().int().nonnegative().optional(),
    realizedR: z.number().optional(),
    mae: z.number().optional(),
    followedLimit: z.boolean().optional(),
  })
  .strict();
export type TradePlanOutcome = z.infer<typeof TradePlanOutcomeSchema>;

export const TradePlanSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  side: TradePlanSideSchema,
  market: TradePlanMarketSchema,
  signalDate: z.string().nullable(),
  rule: z.string().nullable(),
  source: TradePlanSourceSchema.nullable(),
  entryPrice: z.string().nullable(),
  stopLoss: z.string().nullable(),
  targetPrice: z.string().nullable(),
  note: z.string().nullable(),
  decision: TradePlanDecisionSchema.nullable(),
  playbookId: z.string().uuid().nullable(),
  status: TradePlanStatusSchema,
  sizing: TradePlanSizingSchema.nullable(),
  praSnapshot: TradePlanPraSnapshotSchema.nullable(),
  outcome: TradePlanOutcomeSchema.nullable(),
  checklist: TradePlanChecklistSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TradePlan = z.infer<typeof TradePlanSchema>;

export const CreateTradePlanInputSchema = z
  .object({
    symbol: z.string().trim().min(1).max(32),
    side: TradePlanSideSchema,
    market: TradePlanMarketSchema.optional(),
    signalDate: dateString.optional(),
    rule: z.string().max(32).optional(),
    source: TradePlanSourceSchema.optional(),
    entryPrice: priceString.optional(),
    stopLoss: priceString.optional(),
    targetPrice: priceString.optional(),
    note: z.string().max(4000).optional(),
    decision: TradePlanDecisionSchema.optional(),
    playbookId: z.string().uuid().optional(),
    sizing: TradePlanSizingSchema.optional(),
    praSnapshot: TradePlanPraSnapshotSchema.optional(),
    outcome: TradePlanOutcomeSchema.optional(),
    checklist: TradePlanChecklistSchema.optional(),
  })
  .strict();
export type CreateTradePlanInput = z.infer<typeof CreateTradePlanInputSchema>;

export const UpdateTradePlanInputSchema = CreateTradePlanInputSchema.partial();
export type UpdateTradePlanInput = z.infer<typeof UpdateTradePlanInputSchema>;

/** The lifecycle write. Only these four states exist. */
export const UpdateTradePlanStatusSchema = z.object({ status: TradePlanStatusSchema }).strict();
export type UpdateTradePlanStatusInput = z.infer<typeof UpdateTradePlanStatusSchema>;

export const TradePlanListResponseSchema = z.object({ items: z.array(TradePlanSchema) });
export type TradePlanListResponse = z.infer<typeof TradePlanListResponseSchema>;
