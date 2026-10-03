import { z } from 'zod';

// F4 — pre-trade plans (ZITN-TECH-017 §10.8).
export const TRADE_PLAN_STATUSES = ['pending', 'executed', 'missed', 'cancelled'] as const;
export const TradePlanStatusSchema = z.enum(TRADE_PLAN_STATUSES);
export type TradePlanStatus = z.infer<typeof TradePlanStatusSchema>;

export const TRADE_PLAN_SIDES = ['long', 'short'] as const;
export const TradePlanSideSchema = z.enum(TRADE_PLAN_SIDES);

// Market asal draf (prefill dari Pemindai ZITN, ZITN-TECH-043): IDX atau S&P 500.
export const TRADE_PLAN_MARKETS = ['id', 'us'] as const;
export const TradePlanMarketSchema = z.enum(TRADE_PLAN_MARKETS);
export type TradePlanMarket = z.infer<typeof TradePlanMarketSchema>;

// Prices/zone bounds cross the wire as decimal strings, like positions.
const priceString = z
  .string()
  .max(32)
  .regex(/^\d+(\.\d+)?$/, 'Must be a non-negative decimal string');

// Tanggal asal sinyal/lembar (YYYY-MM-DD).
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const TradePlanSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string(),
  side: TradePlanSideSchema,
  market: TradePlanMarketSchema,
  signalDate: z.string().nullable(),
  thesis: z.string().nullable(),
  playbookId: z.string().uuid().nullable(),
  entryZoneLow: z.string().nullable(),
  entryZoneHigh: z.string().nullable(),
  stopLoss: z.string().nullable(),
  targetPrice: z.string().nullable(),
  status: TradePlanStatusSchema,
  positionId: z.string().uuid().nullable(),
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
    thesis: z.string().max(4000).optional(),
    playbookId: z.string().uuid().optional(),
    entryZoneLow: priceString.optional(),
    entryZoneHigh: priceString.optional(),
    stopLoss: priceString.optional(),
    targetPrice: priceString.optional(),
  })
  .strict();
export type CreateTradePlanInput = z.infer<typeof CreateTradePlanInputSchema>;

export const UpdateTradePlanInputSchema = CreateTradePlanInputSchema.partial();
export type UpdateTradePlanInput = z.infer<typeof UpdateTradePlanInputSchema>;

/** The lifecycle write. Only these four states exist. */
export const UpdateTradePlanStatusSchema = z.object({ status: TradePlanStatusSchema }).strict();
export type UpdateTradePlanStatusInput = z.infer<typeof UpdateTradePlanStatusSchema>;

/** F4 — attach a plan to a trade (1:1), or detach with `null`. */
export const LinkTradePlanInputSchema = z
  .object({ positionId: z.string().uuid().nullable() })
  .strict();
export type LinkTradePlanInput = z.infer<typeof LinkTradePlanInputSchema>;

export const TradePlanListResponseSchema = z.object({ items: z.array(TradePlanSchema) });
export type TradePlanListResponse = z.infer<typeof TradePlanListResponseSchema>;
