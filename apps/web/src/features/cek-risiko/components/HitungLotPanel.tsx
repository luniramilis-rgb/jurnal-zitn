import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { CEK_RISIKO_RISK_PRESETS, hitungLot, verdictRisiko } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { SymbolAutocomplete } from '@/components/SymbolAutocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/hooks/useLocale';

import { RumusDisclosure } from './RumusDisclosure';
import { SimpanCatatanCard } from './SimpanCatatanCard';
import { VerdictBanner } from './VerdictBanner';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/**
 * Prefill dari konteks Pemindai/Chart (P7): kode & harga dibaca dari query
 * (`?symbol=&harga=`) bila ada. Di luar browser atau tanpa parameter → kosong.
 */
function dariQuery(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get(key) ?? '';
  } catch {
    return '';
  }
}

/** Jawaban besar untuk hasil lot — angka pokok permukaan ini. */
function BigAnswer({ lots, rugiMaksimal }: { lots: number; rugiMaksimal: string }) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-4" data-testid="cek-hasil">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('cek.result.heading')}
        </p>
        <p className="mt-1 text-3xl font-semibold" data-testid="cek-lots">
          {t('cek.result.lots', { n: lots })}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('cek.result.rugiMaksimal')}
        </p>
        <p className="mt-1 text-2xl font-semibold text-destructive">
          <Numeric value={rugiMaksimal} kind="money" currency="IDR" direction="none" />
        </p>
      </div>
    </div>
  );
}

/**
 * Mode sizing (dulu "Hitung Lot", D-H1b): modal · risiko (tombol 1/2/3) · kode · harga beli ·
 * harga stop → jawaban besar (lot, rugi maksimal) → rincian → rumus dilipat.
 */
export function HitungLotPanel() {
  const t = useT();
  const [modal, setModal] = useState('');
  const [riskPercent, setRiskPercent] = useState('1');
  const [symbol, setSymbol] = useState(() => dariQuery('symbol').toUpperCase());
  const [hargaBeli, setHargaBeli] = useState(() => dariQuery('harga'));
  const [hargaStop, setHargaStop] = useState('');

  const verdict = verdictRisiko(riskPercent);

  const ready =
    modal.trim() !== '' && hargaBeli.trim() !== '' && hargaStop.trim() !== '' && riskPercent !== '';
  const result = useMemo(
    () => (ready ? hitungLot({ modal, riskPercent, hargaBeli, hargaStop }) : null),
    [ready, modal, riskPercent, hargaBeli, hargaStop],
  );

  const errorKey = (() => {
    if (!result || result.ok) return null;
    switch (result.code) {
      case 'modal-tidak-valid':
        return 'cek.error.modal' as const;
      case 'risiko-tidak-valid':
        return 'cek.error.risiko' as const;
      case 'harga-tidak-valid':
        return 'cek.error.harga' as const;
      case 'stop-tidak-valid':
        return 'cek.error.stop' as const;
      case 'lot-nol':
        return 'cek.error.lotNol' as const;
    }
  })();

  // Bridge to the portfolio layer: `risiko% = w × SL%` (alokasi × jarak stop).
  // Read-only di sini; setelan w/S tinggal di blok Komponen Portofolio.
  const bridge = useMemo(() => {
    if (!result || !result.ok) return null;
    const modalNum = Number(modal);
    const beli = Number(hargaBeli);
    const stop = Number(hargaStop);
    if (
      !Number.isFinite(modalNum) ||
      modalNum <= 0 ||
      !Number.isFinite(beli) ||
      beli <= 0 ||
      !Number.isFinite(stop)
    ) {
      return null;
    }
    return { wImplied: Number(result.nilaiPosisi) / modalNum, stopDist: (beli - stop) / beli };
  }, [result, modal, hargaBeli, hargaStop]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="cek-modal">{t('cek.field.modal')}</Label>{' '}
            <Input
              id="cek-modal"
              data-testid="cek-modal"
              inputMode="decimal"
              value={modal}
              onChange={(e) => setModal(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('cek.field.risk')}</Label>
            <div className="flex gap-2">
              {CEK_RISIKO_RISK_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={riskPercent === preset ? 'default' : 'outline'}
                  className="flex-1 cursor-pointer"
                  onClick={() => setRiskPercent(preset)}
                  data-testid={`cek-risk-${preset}`}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cek-symbol">{t('cek.field.symbol')}</Label>
            <SymbolAutocomplete
              id="cek-symbol"
              value={symbol}
              onChange={setSymbol}
              onQueryChange={(raw) => setSymbol(raw.toUpperCase())}
              placeholder={t('cek.field.symbolPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cek-harga-beli">{t('cek.field.hargaBeli')}</Label>
              <Input
                id="cek-harga-beli"
                data-testid="cek-harga-beli"
                inputMode="decimal"
                value={hargaBeli}
                onChange={(e) => setHargaBeli(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-harga-stop">{t('cek.field.hargaStop')}</Label>
              <Input
                id="cek-harga-stop"
                data-testid="cek-harga-stop"
                inputMode="decimal"
                value={hargaStop}
                onChange={(e) => setHargaStop(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <VerdictBanner verdict={verdict} />

      {result === null ? (
        <p className="text-sm text-muted-foreground">{t('cek.empty')}</p>
      ) : !result.ok ? (
        <p className="text-sm text-destructive" data-testid="cek-error">
          {t(errorKey!)}
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">{t('cek.result.heading')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BigAnswer lots={result.lots} rugiMaksimal={result.rugiMaksimal} />
            <div className="space-y-2 border-t pt-3">
              <Row
                label={t('cek.result.nilaiPosisi')}
                value={
                  <Numeric
                    value={result.nilaiPosisi}
                    kind="money"
                    currency="IDR"
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.result.risikoPerSaham')}
                value={
                  <Numeric
                    value={result.risikoPerSaham}
                    kind="money"
                    currency="IDR"
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.result.anggaranRisiko')}
                value={
                  <Numeric
                    value={result.anggaranRisiko}
                    kind="money"
                    currency="IDR"
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.result.shares')}
                value={<Numeric value={result.shares} kind="integer" direction="none" />}
              />
              <Row
                label={t('cek.result.hargaJualRR2')}
                value={
                  <Numeric
                    value={result.hargaJualRR2}
                    kind="money"
                    currency="IDR"
                    direction="none"
                  />
                }
              />
              {bridge && (
                <>
                  <Row
                    label={t('cek.lot.wImplied')}
                    value={
                      <>
                        <Numeric
                          value={bridge.wImplied * 100}
                          kind="decimal"
                          precision={2}
                          direction="none"
                        />
                        %
                      </>
                    }
                  />
                  <Row
                    label={t('cek.lot.stopDist')}
                    value={
                      <>
                        <Numeric
                          value={bridge.stopDist * 100}
                          kind="decimal"
                          precision={2}
                          direction="none"
                        />
                        %
                      </>
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t('cek.lot.identity')}</p>
                </>
              )}
            </div>

            <RumusDisclosure formulaKey="cek.formula.lot" />

            <div className="border-t pt-3">
              <SimpanCatatanCard symbol={symbol} price={hargaBeli} shares={result.shares} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HitungLotPanel;
