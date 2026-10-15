// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TradePlanChecklist } from '@jurnal-zitn/shared';

import type { SheetPra } from '@/features/journal-context/hooks/useSheetContext';

import { PraTradeChecklist } from './PraTradeChecklist';

const PRA: SheetPra = {
  va30_width_pct: 4.1,
  va30_q30_pct: 5.3,
  basis_poc_vah_pct: 2.8,
  res: [
    { px: 5250, pct: 6.4 },
    { px: 5480, pct: 11.1 },
    { px: 5700, pct: 15.3 },
  ],
  arrows_60: 3,
  volx: 2.1,
  pressure_20: 6,
  regime: 'pullback',
  earnings: { date: '2026-10-30', bars: 10 },
  exec: { limit: 5000, sessions: 1 },
  label: 'observasi · in-sample',
};

afterEach(cleanup);

describe('PraTradeChecklist — Lapis 2 (ZITN-TECH-069)', () => {
  it('auto-isi hanya ambang tegas (pita VA30 & panah ≥ 3); spike 2,1× tidak tercentang', () => {
    render(<PraTradeChecklist pra={PRA} value={null} asOf="2026-10-14" onSave={() => {}} />);

    expect((screen.getByTestId('pra-check-va30') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('pra-check-res') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('pra-check-spike') as HTMLInputElement).checked).toBe(false);
    // "Basis padat" tanpa ambang eksplisit → TIDAK auto (pengguna yang menilai).
    expect((screen.getByTestId('pra-check-basis') as HTMLInputElement).checked).toBe(false);

    // Baris tanpa ambang ditandai `·` (bukan kotak) + angka.
    expect(screen.getByTestId('pra-info-pra.res').textContent).toContain('R1');
    expect(screen.getByTestId('pra-info-pra.regime').textContent).toContain('pullback');
    expect(screen.getByTestId('pra-label').textContent).toContain('in-sample');
  });

  it('auto-isi menyusul setelah `pra` tiba (fetch async) — regresi', () => {
    const { rerender } = render(
      <PraTradeChecklist pra={null} value={null} asOf={null} onSave={() => {}} />,
    );
    // Sebelum data tiba: belum ada angka (pesan "belum terbit").
    expect(screen.getByTestId('pra-empty')).toBeTruthy();

    // `pra` tiba setelah mount → auto-isi ambang tegas harus masuk (bug lama: tidak).
    rerender(<PraTradeChecklist pra={PRA} value={null} asOf="2026-10-14" onSave={() => {}} />);
    expect((screen.getByTestId('pra-check-va30') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('pra-check-res') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('pra-check-spike') as HTMLInputElement).checked).toBe(false);
  });

  it('keputusan tersimpan menang atas auto-isi', () => {
    const saved: TradePlanChecklist = {
      items: { va30: false, basis: false, res: false, spike: false, pressure: false },
      attested: false,
    };
    render(<PraTradeChecklist pra={PRA} value={saved} asOf="2026-10-14" onSave={() => {}} />);
    expect((screen.getByTestId('pra-check-va30') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('pra-check-res') as HTMLInputElement).checked).toBe(false);
  });

  it('menyimpan centang + attestasi + catatan ke rencana', () => {
    const onSave = vi.fn<(c: TradePlanChecklist) => void>();
    render(<PraTradeChecklist pra={PRA} value={null} asOf="2026-10-14" onSave={onSave} />);

    fireEvent.click(screen.getByTestId('pra-check-spike'));
    fireEvent.click(screen.getByTestId('pra-attest-check'));
    fireEvent.change(screen.getByTestId('pra-note'), { target: { value: 'tunggu retest' } });
    fireEvent.click(screen.getByTestId('pra-save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.items.spike).toBe(true);
    expect(saved.items.va30).toBe(true);
    expect(saved.attested).toBe(true);
    expect(saved.note).toBe('tunggu retest');
    expect(saved.asOf).toBe('2026-10-14');
  });

  it('tanpa angka `pra` → pesan "belum terbit" (tanpa kotak centang)', () => {
    render(<PraTradeChecklist pra={null} value={null} asOf={null} onSave={() => {}} />);
    expect(screen.getByTestId('pra-empty')).toBeTruthy();
    expect(screen.queryByTestId('pra-check-va30')).toBeNull();
  });
});
