import { useMemo, useState } from 'react';

import type { MessageKey, TradePlanChecklist } from '@jurnal-zitn/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SheetPra } from '@/features/journal-context/hooks/useSheetContext';
import { useT } from '@/hooks/useLocale';

/**
 * Ceklis pra-trade Lapis 2 (ZITN-TECH-069) — **Jurnal F4**. Angka `pra` **dibaca** dari ZITN
 * (D12=(ii)); di sini pengguna **memutuskan** (centang/attestasi/catatan) dan menyimpannya.
 *
 * Pagar: warna **netral**, label "observasi · in-sample", **tanpa skor/verdict** (K10). Item tanpa
 * ambang tegas (`·`: resistensi/rezim/earnings) hanya angka. Auto-isi hanya untuk ambang yang
 * **eksplisit** di spec (pita VA30 ≤ q30, panah ≥ 3, spike ≥ 3×); sisanya ditentukan pengguna.
 */

function autoItems(pra: SheetPra | null): Record<string, boolean> {
  if (!pra) return {};
  const va30 =
    pra.va30_width_pct != null &&
    pra.va30_q30_pct != null &&
    pra.va30_width_pct <= pra.va30_q30_pct;
  const arrows = (pra.arrows_60 ?? 0) >= 3;
  const spike = pra.volx != null && pra.volx >= 3;
  return { va30, res: arrows, spike };
}

function fmtPct(x: number | null | undefined): string {
  return x == null ? '—' : `${x > 0 ? '+' : ''}${x}%`;
}

function CheckRow({
  id,
  labelKey,
  hintKey,
  detail,
  checked,
  onToggle,
}: {
  id: string;
  labelKey: MessageKey;
  hintKey: MessageKey;
  detail: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  const t = useT();
  return (
    <label className="flex items-center gap-2 text-sm" data-testid={`pra-item-${id}`}>
      <input
        type="checkbox"
        className="cursor-pointer"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        data-testid={`pra-check-${id}`}
      />
      <span className="flex-1">{t(labelKey)}</span>
      <span className="text-muted-foreground">{detail}</span>
      <span
        title={t(hintKey)}
        aria-label={t(hintKey)}
        className="cursor-help text-muted-foreground"
      >
        ⓘ
      </span>
    </label>
  );
}

function InfoRow({
  labelKey,
  hintKey,
  detail,
}: {
  labelKey: MessageKey;
  hintKey: MessageKey;
  detail: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-sm" data-testid={`pra-info-${labelKey}`}>
      <span className="w-4 text-muted-foreground">·</span>
      <span className="flex-1">{t(labelKey)}</span>
      <span className="text-muted-foreground">{detail}</span>
      <span
        title={t(hintKey)}
        aria-label={t(hintKey)}
        className="cursor-help text-muted-foreground"
      >
        ⓘ
      </span>
    </div>
  );
}

export function PraTradeChecklist({
  pra,
  value,
  asOf,
  onSave,
  saving,
}: {
  pra: SheetPra | null;
  value: TradePlanChecklist | null;
  asOf: string | null;
  onSave: (next: TradePlanChecklist) => void;
  saving?: boolean;
}) {
  const t = useT();
  const auto = useMemo(() => autoItems(pra), [pra]);
  const [items, setItems] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {
      va30: false,
      basis: false,
      res: false,
      spike: false,
      pressure: false,
      ...auto,
    };
    for (const [k, v] of Object.entries(value?.items ?? {})) seed[k] = v === true;
    return seed;
  });
  const [attested, setAttested] = useState<boolean>(value?.attested ?? false);
  const [note, setNote] = useState<string>(value?.note ?? '');

  if (!pra) {
    return (
      <div className="space-y-2" data-testid="pra-checklist">
        <p className="text-sm font-medium">{t('pra.title')}</p>
        <p className="text-sm text-muted-foreground" data-testid="pra-empty">
          {t('pra.noPra')}
        </p>
      </div>
    );
  }

  const res = (pra.res ?? []).map((r, i) => `R${i + 1} ${fmtPct(r.pct)}`).join(' · ') || '—';
  const regime = pra.regime
    ? `${pra.regime} (EMA60 ${pra.regime === 'pullback' ? '>' : '<'} EMA10)`
    : '—';
  const earn = pra.earnings
    ? pra.earnings.bars != null
      ? `≥ ${pra.earnings.bars} bar`
      : pra.earnings.date
    : '—';

  return (
    <div className="space-y-3" data-testid="pra-checklist">
      <div>
        <p className="text-sm font-medium">{t('pra.title')}</p>
        <p className="text-xs text-muted-foreground">{t('pra.autoNote')}</p>
      </div>

      <div className="space-y-2">
        <CheckRow
          id="va30"
          labelKey="pra.va30"
          hintKey="pra.hint.va30"
          checked={!!items.va30}
          detail={`${pra.va30_width_pct ?? '—'} % ≤ ${pra.va30_q30_pct ?? '—'} %`}
          onToggle={(v) => setItems((s) => ({ ...s, va30: v }))}
        />
        <CheckRow
          id="basis"
          labelKey="pra.basis"
          hintKey="pra.hint.basis"
          checked={!!items.basis}
          detail={`POC↔VAH ${fmtPct(pra.basis_poc_vah_pct)}`}
          onToggle={(v) => setItems((s) => ({ ...s, basis: v }))}
        />
        <CheckRow
          id="res"
          labelKey="pra.arrows"
          hintKey="pra.hint.arrows"
          checked={!!items.res}
          detail={`${pra.arrows_60 ?? 0} panah / 60 sesi`}
          onToggle={(v) => setItems((s) => ({ ...s, res: v }))}
        />
        <CheckRow
          id="spike"
          labelKey="pra.spike"
          hintKey="pra.hint.spike"
          checked={!!items.spike}
          detail={`volx ${pra.volx ?? '—'} ×`}
          onToggle={(v) => setItems((s) => ({ ...s, spike: v }))}
        />
        <CheckRow
          id="pressure"
          labelKey="pra.pressure"
          hintKey="pra.hint.pressure"
          checked={!!items.pressure}
          detail={`${pra.pressure_20 ?? 0} / 20 bar`}
          onToggle={(v) => setItems((s) => ({ ...s, pressure: v }))}
        />

        <InfoRow labelKey="pra.res" hintKey="pra.hint.res" detail={res} />
        <InfoRow labelKey="pra.regime" hintKey="pra.hint.regime" detail={regime} />
        <InfoRow labelKey="pra.earnings" hintKey="pra.hint.earnings" detail={earn} />
        <InfoRow
          labelKey="pra.exec"
          hintKey="pra.hint.exec"
          detail={`limit ${pra.exec?.limit ?? '—'} · ${pra.exec?.sessions ?? 1} sesi`}
        />
      </div>

      <label className="flex items-center gap-2 text-sm" data-testid="pra-attest">
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={attested}
          onChange={(e) => setAttested(e.target.checked)}
          data-testid="pra-attest-check"
        />
        <span>{t('pra.attest')}</span>
      </label>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{t('pra.note')}</span>
        <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="pra-note" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground" data-testid="pra-label">
          {t('pra.label')}
        </span>
        <Button
          type="button"
          className="cursor-pointer"
          disabled={saving}
          data-testid="pra-save"
          onClick={() =>
            onSave({
              items: { ...items },
              attested,
              ...(note ? { note } : {}),
              asOf: asOf ?? null,
            })
          }
        >
          {t('pra.save')}
        </Button>
      </div>
    </div>
  );
}
