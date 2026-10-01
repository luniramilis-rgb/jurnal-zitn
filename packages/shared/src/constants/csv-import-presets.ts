import type { CsvPreset } from '../schemas/csv-import';

/**
 * In-repo broker presets (REQ-3). NOT database rows — pure config shipped with
 * the app. Each preset pre-fills a {@link CsvPreset} mapping (Jurnal ZITN field → CSV
 * column) that a user can adopt and then adjust (REQ-3.4). Adding a preset =
 * a config entry here + a committed real-export sample fixture under
 * `__fixtures__/csv-import-samples/` + a test that resolves the mapping against
 * it and asserts the declared row shape (REQ-3.5). No DB migration, no engine
 * change.
 *
 * Row shape: ALL shipped presets are `execution` — the common journaling-tool
 * generic exports (TradeZella, Tradervue) and broker statements (IBKR Flex) are
 * one-row-per-fill, not round-trip (deferral d-b394aea7). `round-trip` is
 * reachable only via the manual row-shape selector (Task 21); no preset ships
 * with that shape.
 *
 * Headers are sourced from real export samples (committed fixtures), never
 * invented:
 *   - interactive-brokers: IBKR Trades Flex Query field codes (Symbol,
 *     Description, UnderlyingSymbol, Strike, Expiry, Put/Call, Multiplier,
 *     AssetClass, Buy/Sell, Open/CloseIndicator, Quantity, TradePrice,
 *     IBCommission, DateTime, Notes/Codes). The preset maps Multiplier and
 *     Notes/Codes; the composed contract columns (UnderlyingSymbol, Strike,
 *     Expiry, Put/Call) sit in the sample unmapped so a user can switch the
 *     contract form in the mapper. A stock row's Multiplier `1` is an inferred
 *     vendor value (the Trades Flex fields page documents no stock multiplier);
 *     it drives no assertion, since the multiplier check is option-only.
 *   - tradezella: TradeZella generic CSV upload template
 *     (Date, Time, Symbol, Buy/Sell, Quantity, Price, Spread, Expiration,
 *     Strike, Call/Put, Commission, Fees).
 *   - tradervue: Tradervue generic import format
 *     (Time, Date, Quantity, Symbol, Side, Price, Option, Commission, …).
 *   - generic-execution: Jurnal ZITN's own canonical one-row-per-fill template.
 *   - generic-idx: **provisional, labels unverified** IDX broker preset, added
 *     under D2 (ZITN-TECH-021) as alias-only mapping help — the server stays the
 *     authoritative parser. The Indonesian alias vocabulary (Tanggal, Jenis
 *     Transaksi, Kode Saham, Jumlah, Harga, Komisi) is NOT verified against real
 *     broker artifacts: the owner's real PT Korea Investment and Sekuritas
 *     Indonesia documents (ZITN-TECH-021 §5.24 Statement of Account, §5.25 Trade
 *     Confirmation) carry ENGLISH headers (STOCK, Amount Buy/Sell, Quantity,
 *     Price, Gross Amount, Commission, VAT, Levy, Stamp Duty, Sales Tax, Trade
 *     Date) — none of the Indonesian aliases appear. Those real artifacts are
 *     PDF, not CSV, so they cannot be uploaded through this path at all.
 *     Real-document numbers are US (comma thousands, dot decimal; e.g.
 *     999,999.99) while dates are EU (DD/MM/YYYY); the preset's
 *     `numberFormat: 'eu'` is therefore an UNVALIDATED assumption (EU dates are
 *     corroborated; the only real samples we have use US numbers). It ships
 *     WITHOUT a committed real-export fixture (REQ-3.5 not met) and is NOT in
 *     `CSV_IMPORT_SAMPLE_FILES`, so the conformance suite never runs a fabricated
 *     sample. `assetType` is left for the user.
 */
export const CSV_IMPORT_PRESETS: CsvPreset[] = [
  {
    id: 'generic-manual',
    label: 'Generic / manual mapping',
    rowShape: 'execution',
    dateFormat: 'iso',
    numberFormat: 'us',
    mapping: {
      rowShape: 'execution',
      // No pre-filled mapping — the user maps every column by hand (REQ-3.2).
      columns: {},
    },
  },
  {
    id: 'interactive-brokers',
    label: 'Interactive Brokers (Flex Query — Trades)',
    rowShape: 'execution',
    dateFormat: 'iso-datetime',
    numberFormat: 'us',
    mapping: {
      rowShape: 'execution',
      contractForm: 'occ-symbol',
      // Flex signs Quantity (negative = sold) and IBCommission (negative =
      // paid); the magnitude is stored either way (REQ-3.1).
      signedQuantity: true,
      signedFees: true,
      columns: {
        symbol: 'Symbol',
        assetType: 'AssetClass',
        action: 'Buy/Sell',
        quantity: 'Quantity',
        price: 'TradePrice',
        filledAt: 'DateTime',
        fees: 'IBCommission',
        multiplier: 'Multiplier',
        eventCode: 'Notes/Codes',
      },
    },
  },
  {
    id: 'tradezella',
    label: 'TradeZella (generic CSV)',
    rowShape: 'execution',
    dateFormat: 'us',
    numberFormat: 'us',
    mapping: {
      rowShape: 'execution',
      contractForm: 'composed',
      expiryFormat: 'dd-mon-yy',
      // The `Spread` column carries the asset type; `Single` is TradeZella's
      // label for a single-leg option (REQ-3.4). `Stock` is canonical stock;
      // Future/Forex/Crypto stay unmatched (unrepresentable). The synonym lives
      // in `mapping.transforms`, the path `applyPreset` forwards.
      transforms: { assetType: { Single: 'option' } },
      columns: {
        symbol: 'Symbol',
        assetType: 'Spread',
        action: 'Buy/Sell',
        quantity: 'Quantity',
        price: 'Price',
        filledAt: 'Date',
        fees: 'Commission',
        expiry: 'Expiration',
        strike: 'Strike',
        right: 'Call/Put',
      },
    },
  },
  {
    id: 'tradervue',
    label: 'Tradervue (generic import)',
    rowShape: 'execution',
    dateFormat: 'us',
    numberFormat: 'us',
    mapping: {
      rowShape: 'execution',
      contractForm: 'descriptor',
      // Tradervue's `Option` column carries a per-row option descriptor
      // (e.g. `JAN 12 125 CALL`) that supplies the asset type, so `assetType`
      // stays unmapped by design (REQ-2.8).
      columns: {
        symbol: 'Symbol',
        action: 'Side',
        quantity: 'Quantity',
        price: 'Price',
        filledAt: 'Date',
        fees: 'Commission',
        descriptor: 'Option',
      },
    },
  },
  {
    id: 'generic-execution',
    label: 'Generic execution (one row per fill)',
    rowShape: 'execution',
    dateFormat: 'iso-datetime',
    numberFormat: 'us',
    mapping: {
      rowShape: 'execution',
      contractForm: 'occ-symbol',
      columns: {
        symbol: 'Symbol',
        assetType: 'AssetType',
        action: 'Action',
        quantity: 'Quantity',
        price: 'Price',
        filledAt: 'FilledAt',
        fees: 'Fees',
      },
    },
  },
  {
    id: 'generic-idx',
    label: 'IDX broker statement (generic, unverified labels)',
    rowShape: 'execution',
    // EU dates (DD/MM/YYYY) are corroborated by the real trade confirmations.
    // `eu` numbers (`.` thousands, `,` decimal) are an UNVALIDATED assumption:
    // the only real samples record numbers in US format (§5.24/§5.25), and the
    // alias headers themselves are unverified. Declared, never guessed — the
    // normalizer honors the declared format exactly (REQ-5.3/5.4).
    dateFormat: 'eu',
    numberFormat: 'eu',
    mapping: {
      rowShape: 'execution',
      contractForm: 'occ-symbol',
      // IDX statement quantities are quoted in LOTS (1 lot = 100 shares), the
      // existing `quantityUnit` option (Fase 2b-2) — not new parsing logic.
      quantityUnit: 'lots',
      delimiter: ',',
      // `Jenis Transaksi` carries Beli/Jual; the canonical `action` map only has
      // BUY/SELL, so the Indonesian synonyms are declared here (REQ-2.3) — the
      // same `mapping.transforms` path `applyPreset` forwards.
      transforms: { action: { Beli: 'buy', Jual: 'sell' } },
      // Column aliases (UNVERIFIED — see the module doc comment: real artifacts
      // carry English headers). `Nilai` (gross value) and `Pajak` (tax) sit
      // unmapped: Jurnal ZITN derives value from quantity×price and has no tax
      // field on a fill. `assetType` is deliberately unmapped — an IDX stock
      // statement has no asset-type column, and setting a constant default is an
      // engine change (out of scope for a language wave), so the user completes it
      // in the mapper (REQ-3.4 manual fallback).
      columns: {
        symbol: 'Kode Saham',
        action: 'Jenis Transaksi',
        quantity: 'Jumlah',
        price: 'Harga',
        filledAt: 'Tanggal',
        fees: 'Komisi',
      },
    },
  },
];
