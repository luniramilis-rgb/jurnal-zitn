import { CSV_IMPORT_PRESETS } from '@jurnal-zitn/shared';
import type {
  ContractForm,
  DateFormat,
  ExpiryFormat,
  Mapping,
  NumberFormat,
  RowShape,
} from '@jurnal-zitn/shared';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/hooks/useLocale';

import { PRESET_ONLY_LABELS, targetFieldsForShape, type TargetField } from '../lib/fields';

/**
 * Step 3 of the import flow (REQ-12.1/12.2): choose a preset or map columns by
 * hand, plus the per-import row shape, timezone, and date/number formats.
 *
 * The row-shape control is FIRST-CLASS and PRESET-INDEPENDENT (REQ-12.2): the
 * user can set it to `execution` (default) or `round-trip` without selecting any
 * preset, and changing it re-renders the target-field list. Because no shipped
 * preset is `round-trip` (Component 9), this selector is the ONLY path to a
 * round-trip import — so it must NOT be gated behind a preset selection. A preset
 * MAY set the shape, but the user can override it.
 */

const UNMAPPED = '__unmapped__';
const NO_PRESET = '__none__';

// A small, sensible timezone list defaulting to UTC (REQ-7.4). The field accepts
// any IANA tz string; this is the common set surfaced for correction.
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'iso', label: 'ISO date (YYYY-MM-DD)' },
  { value: 'iso-datetime', label: 'ISO datetime (with time)' },
  { value: 'us', label: 'US (MM/DD/YYYY)' },
  { value: 'eu', label: 'EU (DD/MM/YYYY)' },
];

const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: 'us', label: 'US (1,234.56)' },
  { value: 'eu', label: 'EU (1.234,56)' },
];

export interface ColumnMapperValue {
  presetId: string | null;
  rowShape: RowShape;
  mapping: Mapping;
  timezone: string;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
}

interface ColumnMapperProps {
  columns: string[];
  value: ColumnMapperValue;
  onChange: (next: ColumnMapperValue) => void;
}

export function ColumnMapper({ columns, value, onChange }: ColumnMapperProps) {
  const t = useT();
  const contractForm = value.mapping.contractForm ?? 'occ-symbol';
  // The shape's fields for the chosen contract form, plus a row for each
  // preset-only key already in the mapping so a preset-mapped Multiplier /
  // Notes-Codes / Option column can be re-pointed or unmapped — never offered
  // fresh (REQ-4.1, REQ-5.4). Dedupe against the shape list, which already
  // carries `descriptor` under the descriptor form.
  const shapeFields = targetFieldsForShape(value.rowShape, contractForm);
  const shapeFieldKeys = new Set(shapeFields.map((f) => f.field));
  const presetOnlyFields: TargetField[] = Object.keys(PRESET_ONLY_LABELS)
    .filter((key) => key in value.mapping.columns && !shapeFieldKeys.has(key))
    .map((key) => ({ field: key, label: PRESET_ONLY_LABELS[key], required: false }));
  const fields = [...shapeFields, ...presetOnlyFields];

  function applyPreset(presetId: string) {
    if (presetId === NO_PRESET) {
      onChange({ ...value, presetId: null });
      return;
    }
    const preset = CSV_IMPORT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    // Preset auto-fills shape, formats, and mapping; the user can then adjust
    // anything — including overriding the row shape (REQ-12.2). The mapping
    // always declares a contract form and expiry format so the preview request
    // carries both (Component 10).
    onChange({
      ...value,
      presetId,
      rowShape: preset.rowShape,
      dateFormat: preset.dateFormat,
      numberFormat: preset.numberFormat,
      mapping: {
        ...preset.mapping,
        rowShape: preset.rowShape,
        contractForm: preset.mapping.contractForm ?? 'occ-symbol',
        expiryFormat: preset.mapping.expiryFormat ?? 'iso',
      },
    });
  }

  function setContractForm(next: ContractForm) {
    onChange({ ...value, mapping: { ...value.mapping, contractForm: next } });
  }

  // IDX (A8): a statement that quotes lots must be stored as shares, so the
  // quantity column needs to declare its unit (1 lot = 100 shares).
  function setQuantityUnit(next: 'shares' | 'lots') {
    onChange({ ...value, mapping: { ...value.mapping, quantityUnit: next } });
  }

  function setExpiryFormat(next: ExpiryFormat) {
    onChange({ ...value, mapping: { ...value.mapping, expiryFormat: next } });
  }

  function setRowShape(rowShape: RowShape) {
    // Preset-independent: changing the shape re-renders the field list and
    // carries the shape into the mapping. We keep existing column picks; fields
    // not in the new shape are simply not rendered.
    onChange({
      ...value,
      rowShape,
      mapping: { ...value.mapping, rowShape },
    });
  }

  function setColumn(field: string, column: string) {
    const nextColumns = { ...value.mapping.columns };
    if (column === UNMAPPED) {
      delete nextColumns[field];
    } else {
      nextColumns[field] = column;
    }
    onChange({ ...value, mapping: { ...value.mapping, columns: nextColumns } });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="import-preset">{t('import.mapper.preset')}</Label>
          <Select value={value.presetId ?? NO_PRESET} onValueChange={applyPreset}>
            <SelectTrigger id="import-preset" className="w-full">
              <SelectValue placeholder={t('import.mapper.noPreset')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PRESET}>{t('import.mapper.noPresetManual')}</SelectItem>
              {CSV_IMPORT_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-row-shape">{t('import.mapper.rowShape')}</Label>
          <Select value={value.rowShape} onValueChange={(v) => setRowShape(v as RowShape)}>
            <SelectTrigger id="import-row-shape" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="execution">{t('import.mapper.execution')}</SelectItem>
              <SelectItem value="round-trip">{t('import.mapper.roundTrip')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('import.mapper.rowShapeNote')}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="import-timezone">{t('import.mapper.timezone')}</Label>
          <Select
            value={value.timezone}
            onValueChange={(tz) => onChange({ ...value, timezone: tz })}
          >
            <SelectTrigger id="import-timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-date-format">{t('import.mapper.dateFormat')}</Label>
          <Select
            value={value.dateFormat}
            onValueChange={(v) => onChange({ ...value, dateFormat: v as DateFormat })}
          >
            <SelectTrigger id="import-date-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-number-format">{t('import.mapper.numberFormat')}</Label>
          <Select
            value={value.numberFormat}
            onValueChange={(v) => onChange({ ...value, numberFormat: v as NumberFormat })}
          >
            <SelectTrigger id="import-number-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NUMBER_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-quantity-unit">{t('import.mapper.quantityUnit')}</Label>
          <Select
            value={value.mapping.quantityUnit ?? 'shares'}
            onValueChange={(v) => setQuantityUnit(v as 'shares' | 'lots')}
          >
            <SelectTrigger id="import-quantity-unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shares">{t('import.mapper.shares')}</SelectItem>
              <SelectItem value="lots">{t('import.mapper.lots')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-contract-form">{t('import.mapper.contractForm')}</Label>
          <Select value={contractForm} onValueChange={(v) => setContractForm(v as ContractForm)}>
            <SelectTrigger id="import-contract-form" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="occ-symbol">{t('import.mapper.contractOcc')}</SelectItem>
              <SelectItem value="composed">{t('import.mapper.contractComposed')}</SelectItem>
              {contractForm === 'descriptor' && (
                <SelectItem value="descriptor" disabled>
                  {t('import.mapper.contractDescriptor')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {contractForm === 'occ-symbol' && (
            <p className="text-xs text-muted-foreground">{t('import.mapper.occNote')}</p>
          )}
        </div>

        {contractForm === 'composed' && (
          <div className="space-y-2">
            <Label htmlFor="import-expiry-format">{t('import.mapper.expiryFormat')}</Label>
            <Select
              value={value.mapping.expiryFormat ?? 'iso'}
              onValueChange={(v) => setExpiryFormat(v as ExpiryFormat)}
            >
              <SelectTrigger id="import-expiry-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                <SelectItem value="yyyymmdd">Flex (YYYYMMDD)</SelectItem>
                <SelectItem value="dd-mon-yy">DD Mon YY (28 Oct 22)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>{t('import.mapper.mapColumns')}</Label>
        <div className="space-y-2">
          {fields.map((target) => {
            const mapped = value.mapping.columns[target.field] ?? UNMAPPED;
            return (
              <div key={target.field} className="grid grid-cols-[1fr_1fr] items-center gap-3">
                <span className="text-sm">
                  {target.label}
                  {target.required && <span className="ml-1 text-destructive">*</span>}
                </span>
                <Select
                  value={columns.includes(mapped) ? mapped : UNMAPPED}
                  onValueChange={(col) => setColumn(target.field, col)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('import.mapper.notMapped')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>{t('import.mapper.notMapped')}</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> {t('import.mapper.requiredNote')}
        </p>
      </div>
    </div>
  );
}
