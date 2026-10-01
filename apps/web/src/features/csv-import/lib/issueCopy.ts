import type { MessageKey } from '@jurnal-zitn/shared';

/**
 * Salinan galat/peringatan impor CSV dipilih lewat KODE, bukan pesan server mentah
 * (ZITN-TECH-021 §5.14 butir 5: "galat mapper/IssueList bicara sebagai penjelasan ID,
 * bukan pesan mentah"). Server tetap parser otoritatif dan tetap mengirim `message`
 * berbahasa Inggris; peta ini yang memilih kalimat ID dari kamus. Kode yang belum
 * dikenal jatuh ke salinan generik — bukan `message` mentah.
 */

/** Kode galat baris/sel dari pipeline impor (csv-mapping/normalize/contract/pipeline). */
export const ISSUE_ERROR_KEYS: Record<string, MessageKey> = {
  MAPPING_FIELD_MISSING: 'import.err.mappingFieldMissing',
  MAPPING_TYPE_OR_ACTION_REQUIRED: 'import.err.mappingTypeOrActionRequired',
  MAPPING_TYPE_OR_ACTION_EXCLUSIVE: 'import.err.mappingTypeOrActionExclusive',
  MAPPING_EXPIRY_FORMAT_MISSING: 'import.err.mappingExpiryFormatMissing',
  MAPPING_COLUMN_ABSENT: 'import.err.mappingColumnAbsent',
  TRANSFORM_NO_MATCH: 'import.err.transformNoMatch',
  ROW_MISSING_REQUIRED_FIELD: 'import.err.rowMissingRequired',
  ROW_MISSING_TYPE_OR_ACTION: 'import.err.rowMissingTypeOrAction',
  FIELD_INVALID: 'import.err.fieldInvalid',
  NUMBER_UNPARSEABLE: 'import.err.numberUnparseable',
  NUMBER_EMPTY: 'import.err.numberEmpty',
  NUMBER_MAGNITUDE_TOO_LARGE: 'import.err.numberMagnitudeTooLarge',
  DATE_UNPARSEABLE: 'import.err.dateUnparseable',
  DATE_FORMAT_MISMATCH: 'import.err.dateFormatMismatch',
  DATE_INVALID: 'import.err.dateInvalid',
  INVALID_TIMEZONE: 'import.err.invalidTimezone',
  QUANTITY_SIGN_CONTRADICTION: 'import.err.quantitySignContradiction',
  TRUNCATED: 'import.err.truncated',
  CONTRACT_FIELD_ON_STOCK: 'import.err.contractFieldOnStock',
  CONTRACT_FORM_MISSING: 'import.err.contractFormMissing',
  CONTRACT_FIELD_MISSING: 'import.err.contractFieldMissing',
  OPTION_MULTIPLIER_UNSUPPORTED: 'import.err.optionMultiplierUnsupported',
  OPTION_EVENT_NOT_SUPPORTED: 'import.err.optionEventNotSupported',
  OPTION_FRACTIONAL_QUANTITY: 'import.err.optionFractionalQuantity',
  CONTRACT_DESCRIPTOR_UNPARSEABLE: 'import.err.descriptorUnparseable',
  OCC_NO_FORM_MATCH: 'import.err.occNoFormMatch',
  OCC_TOO_LONG: 'import.err.occTooLong',
  OCC_BAD_CHARSET: 'import.err.occBadCharset',
  OCC_CANONICAL_LENGTH: 'import.err.occCanonicalLength',
  OCC_PRE_2000: 'import.err.occPre2000',
  OCC_BAD_DATE: 'import.err.occBadDate',
  OCC_STRIKE_ZERO: 'import.err.occStrikeZero',
  OCC_STRIKE_RANGE: 'import.err.occStrikeRange',
  OCC_STRIKE_PRECISION: 'import.err.occStrikePrecision',
  OCC_DATE_RANGE: 'import.err.occDateRange',
  OCC_BAD_UNDERLYING: 'import.err.occBadUnderlying',
  OCC_COMPACT_TOO_LONG: 'import.err.occCompactTooLong',
  OCC_STRIKE_NOT_REPRESENTABLE: 'import.err.occStrikeNotRepresentable',
  SEGMENT_CROSSES_FLAT: 'import.err.segmentCrossesFlat',
  SEGMENT_TYPE_CONTRADICTION: 'import.err.segmentTypeContradiction',
  SEGMENT_SIDE_CONTRADICTION: 'import.err.segmentSideContradiction',
  EXIT_BEFORE_ENTRY: 'import.err.exitBeforeEntry',
  EXIT_EXCEEDS_ENTRY: 'import.err.exitExceedsEntry',
  SEGMENT_NOT_RECONCILED: 'import.err.segmentNotReconciled',
  CLOSE_BEFORE_OPEN: 'import.err.closeBeforeOpen',
};

/** `LocatedWarning.kind` dari server → kalimat ID. */
export const ISSUE_WARNING_KEYS: Record<string, MessageKey> = {
  rounded: 'import.warn.rounded',
  no_fees_column: 'import.warn.noFeesColumn',
  currency_hint_mismatch: 'import.warn.currencyMismatch',
  within_file_duplicate: 'import.warn.withinFileDuplicate',
  partial_duplicate: 'import.warn.partialDuplicate',
  direction_inferred: 'import.warn.directionInferred',
  derived_expiry: 'import.warn.derivedExpiry',
};

/** Kode galat COMMIT (amplop API) → kalimat ID. `TIER_LIMIT_CSV_IMPORTS` punya
 * salinan panjangnya sendiri di `import.commit.tierLimit`. */
export const COMMIT_ERROR_KEYS: Record<string, MessageKey> = {
  CSV_IMPORT_SUPERSEDED: 'import.commit.superseded',
  CSV_IMPORT_EXPIRED: 'import.commit.err.expired',
  CSV_IMPORT_IN_PROGRESS: 'import.commit.err.inProgress',
  CSV_IMPORT_BLOCKED: 'import.commit.err.blocked',
  CSV_IMPORT_DUPLICATES_UNCONFIRMED: 'import.commit.err.duplicates',
  TIER_LIMIT_CSV_IMPORTS: 'import.commit.err.tierImports',
  TIER_ACCOUNT_NOT_WRITABLE: 'import.commit.err.tierAccount',
  TIER_LIMIT_POSITIONS: 'import.commit.err.tierPositions',
};

/** Kode galat PREVIEW (amplop API, termasuk galat unggah) → kalimat ID. */
export const PREVIEW_ERROR_KEYS: Record<string, MessageKey> = {
  CSV_NO_ROWS: 'import.preview.err.noRows',
  CSV_IMPORT_TOO_MANY_ROWS: 'import.preview.err.tooManyRows',
  CSV_IMPORT_RESULT_TOO_LARGE: 'import.preview.err.resultTooLarge',
  CSV_IMPORT_IN_PROGRESS: 'import.preview.err.inProgress',
  PAYLOAD_TOO_LARGE: 'import.preview.err.payloadTooLarge',
  CSV_IMPORT_REQUEST_TOO_LARGE: 'import.preview.err.requestTooLarge',
  CSV_NOT_UTF8: 'import.preview.err.notUtf8',
  VALIDATION_ERROR: 'import.preview.err.invalidRequest',
};

export function issueErrorKey(code: string | undefined): MessageKey {
  return (code && ISSUE_ERROR_KEYS[code]) || 'import.err.unknown';
}

export function issueWarningKey(kind: string | undefined): MessageKey {
  return (kind && ISSUE_WARNING_KEYS[kind]) || 'import.warn.unknown';
}

export function commitErrorKey(code: string | undefined): MessageKey {
  return (code && COMMIT_ERROR_KEYS[code]) || 'import.commit.err.failed';
}

export function previewErrorKey(code: string | undefined): MessageKey {
  return (code && PREVIEW_ERROR_KEYS[code]) || 'import.preview.failed';
}
