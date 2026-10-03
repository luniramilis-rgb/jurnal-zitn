import { describe, expect, it } from 'vitest';

import {
  hitungAraArb,
  hitungBiayaPajak,
  hitungHargaRataRata,
  hitungLot,
  verdictRisiko,
} from './cek-risiko';

/**
 * Golden test mesin Cek Risiko (ZITN-TECH-017 §12 / Fase H).
 *
 * Angka dihitung tangan memakai aturan IDX kanonik: lot = 100 saham, PPh final
 * 0,1%, fee platform persen per sisi.
 */

describe('hitungLot — aturan IDX lot 100', () => {
  it('modal 10 jt, risiko 2%, beli 4.520, stop 4.300 → 9 lot', () => {
    const r = hitungLot({
      modal: '10000000',
      riskPercent: '2',
      hargaBeli: '4520',
      hargaStop: '4300',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // anggaran 200.000; risiko/saham 220; 200.000/220 = 909 → 9 lot (900 saham)
    expect(r.anggaranRisiko).toBe('200000.00');
    expect(r.risikoPerSaham).toBe('220.00');
    expect(r.lots).toBe(9);
    expect(r.shares).toBe(900);
    expect(r.rugiMaksimal).toBe('198000.00');
    expect(r.nilaiPosisi).toBe('4068000.00');
    // 4.520 + 2×220 = 4.960 (tick 10, tepat)
    expect(r.hargaJualRR2).toBe('4960');
    expect(r.verdict.level).toBe('kuning');
  });

  it('selalu melaporkan jumlah lot utuh (tidak membulatkan ke atas)', () => {
    const r = hitungLot({
      modal: '1000000',
      riskPercent: '1',
      hargaBeli: '250',
      hargaStop: '245',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // anggaran 10.000; risiko/saham 5 → 2.000 saham = 20 lot
    expect(r.lots).toBe(20);
    expect(r.shares).toBe(2000);
    expect(r.rugiMaksimal).toBe('10000.00');
  });

  it('stop di atas harga beli ditolak', () => {
    const r = hitungLot({
      modal: '10000000',
      riskPercent: '2',
      hargaBeli: '4300',
      hargaStop: '4520',
    });
    expect(r).toEqual({ ok: false, code: 'stop-tidak-valid' });
  });

  it('anggaran lebih kecil dari risiko satu lot → lot nol', () => {
    const r = hitungLot({
      modal: '100000',
      riskPercent: '1',
      hargaBeli: '5000',
      hargaStop: '4900',
    });
    expect(r).toEqual({ ok: false, code: 'lot-nol' });
  });
});

describe('verdictRisiko — ambang 1%/2%/3% (D-H2)', () => {
  it('1% aman, 2% kuning, 3% tinggi', () => {
    expect(verdictRisiko('1').level).toBe('aman');
    expect(verdictRisiko('2').level).toBe('kuning');
    expect(verdictRisiko('3').level).toBe('tinggi');
  });

  it('batas tepat pada ambang', () => {
    expect(verdictRisiko(1).level).toBe('aman');
    expect(verdictRisiko(1.01).level).toBe('kuning');
    expect(verdictRisiko(2).level).toBe('kuning');
    expect(verdictRisiko(2.01).level).toBe('tinggi');
  });
});

describe('hitungBiayaPajak — fee per platform + PPh final', () => {
  it('9 lot, beli 4.520 / jual 4.960, fee 0,15%/0,25%', () => {
    const r = hitungBiayaPajak({
      hargaBeli: '4520',
      lots: '9',
      hargaJual: '4960',
      percentBuy: '0.15',
      percentSell: '0.25',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shares).toBe(900);
    expect(r.nilaiBeli).toBe('4068000.00');
    expect(r.biayaBeli).toBe('6102.00');
    expect(r.nilaiJual).toBe('4464000.00');
    expect(r.biayaJual).toBe('11160.00');
    // PPh final 0,1% × 4.464.000 = 4.464
    expect(r.pphFinal).toBe('4464.00');
    expect(r.nilaiBersih).toBe('4448376.00');
    expect(r.totalBiaya).toBe('21726.00');
    expect(r.untungRugi).toBe('374274.00');
  });

  it('PPh final memakai tarif kanonik 0,1%', () => {
    const r = hitungBiayaPajak({
      hargaBeli: '1000',
      lots: '10',
      hargaJual: '1000',
      percentBuy: '0',
      percentSell: '0',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shares).toBe(1000);
    expect(r.nilaiJual).toBe('1000000.00');
    expect(r.pphFinal).toBe('1000.00');
    expect(r.nilaiBersih).toBe('999000.00');
  });
});

describe('hitungHargaRataRata — average down', () => {
  it('10 lot @5.000 + 10 lot @4.000 → 20 lot @4.500', () => {
    const r = hitungHargaRataRata({
      lotsAwal: '10',
      hargaAwal: '5000',
      lotsTambah: '10',
      hargaTambah: '4000',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lotsTotal).toBe(20);
    expect(r.hargaRataRata).toBe('4500.00');
    expect(r.nilaiTotal).toBe('90000.00');
  });
});

describe('hitungAraArb — batas auto rejection', () => {
  it('harga acuan 1.000 → ARA 25% (1.250), ARB 15% (850)', () => {
    expect(hitungAraArb('1000')).toEqual({
      ara: '1250',
      arb: '850',
      persenAra: '25',
      persenArb: '15',
    });
  });

  it('pita bawah dan atas', () => {
    expect(hitungAraArb('100')?.persenAra).toBe('35');
    expect(hitungAraArb('6000')?.persenAra).toBe('20');
    expect(hitungAraArb('6000')?.ara).toBe('7200');
    expect(hitungAraArb('6000')?.arb).toBe('5100');
  });

  it('harga tidak valid → null', () => {
    expect(hitungAraArb('0')).toBeNull();
    expect(hitungAraArb('-5')).toBeNull();
  });
});

describe('masukan non-numerik ditolak, tidak melempar', () => {
  it('hitungLot menolak desimal berkoma', () => {
    const r = hitungLot({
      modal: '10000000',
      riskPercent: '2',
      hargaBeli: '1,5',
      hargaStop: '1',
    });
    expect(r).toEqual({ ok: false, code: 'harga-tidak-valid' });
  });

  it('hitungBiayaPajak menolak nilai non-numerik', () => {
    const r = hitungBiayaPajak({
      hargaBeli: 'abc',
      lots: '9',
      hargaJual: '4960',
      percentBuy: '0.15',
      percentSell: '0.25',
    });
    expect(r).toEqual({ ok: false, code: 'harga-tidak-valid' });
  });

  it('hitungHargaRataRata menolak nilai non-numerik', () => {
    const r = hitungHargaRataRata({
      lotsAwal: 'sepuluh',
      hargaAwal: '5000',
      lotsTambah: '10',
      hargaTambah: '4000',
    });
    expect(r).toEqual({ ok: false, code: 'input-tidak-valid' });
  });

  it('hitungAraArb menolak nilai non-numerik', () => {
    expect(hitungAraArb('seribu')).toBeNull();
  });
});
