import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  CEK_RISIKO_RISK_PRESETS,
  hitungPosisi,
  verdictRisiko,
  type SizingMarket,
} from '@jurnal-zitn/shared';

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

type Currency = 'IDR' | 'USD';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/** Money tanpa desimal (Cek Risiko); harga per-saham US boleh 2 desimal. */
function Money({
  value,
  currency,
  dp = 0,
}: {
  value: string | number;
  currency: string;
  dp?: number;
}) {
  return <Numeric value={value} kind="money" currency={currency} precision={dp} direction="none" />;
}

function dariQuery(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get(key) ?? '';
  } catch {
    return '';
  }
}

/**
 * Mode "Dengan SL" sadar-pasar (ZITN-TECH-064): pilih **mata uang IDR (IDX lot) / USD (US saham
 * fraksional ≥ US$1)** → kolom **hitung otomatis** (harga beli/stop/jual, total modal, %rugi modal,
 * risk/lot, jumlah lot/saham) + **konversi USD↔IDR** dari kurs jurnal. Alat hitung dari angka
 * pengguna, bukan saran.
 */
export function HitungLotPanel({ market = 'idx' }: { market?: SizingMarket } = {}) {
  const t = useT();
  const [currency, setCurrency] = useState<Currency>(market === 'us' ? 'USD' : 'IDR');
  const [modal, setModal] = useState('');
  const [riskPercent, setRiskPercent] = useState('1');
  const [symbol, setSymbol] = useState(() => dariQuery('symbol').toUpperCase());
  const [hargaBeli, setHargaBeli] = useState(() => dariQuery('harga'));
  const [hargaStop, setHargaStop] = useState('');
  const [hargaJual, setHargaJual] = useState('');

  const isIdx = currency === 'IDR';
  const verdict = verdictRisiko(riskPercent);
  const ready = modal.trim() !== '' && hargaBeli.trim() !== '' && hargaStop.trim() !== '';

  const result = useMemo(
    () =>
      ready
        ? hitungPosisi({
            market: isIdx ? 'idx' : 'us',
            modal,
            riskPercent,
            hargaBeli,
            hargaStop,
            hargaJual,
          })
        : null,
    [ready, isIdx, modal, riskPercent, hargaBeli, hargaStop, hargaJual],
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
      case 'min-notional':
        return 'cek.error.minNotional' as const;
    }
  })();

  const bridge = useMemo(() => {
    if (!result || !result.ok || !isIdx) return null;
    const modalNum = Number(modal);
    const beli = Number(hargaBeli);
    const stop = Number(hargaStop);
    if (!(modalNum > 0) || !(beli > 0) || !Number.isFinite(stop)) return null;
    return { wImplied: Number(result.nilaiPosisi) / modalNum, stopDist: (beli - stop) / beli };
  }, [result, modal, hargaBeli, hargaStop, isIdx]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>{t('cek.sizing.currency')}</Label>
            <div className="flex gap-2" data-testid="cek-currency">
              <Button
                type="button"
                variant={isIdx ? 'default' : 'outline'}
                className="flex-1 cursor-pointer"
                data-testid="cek-currency-idr"
                onClick={() => setCurrency('IDR')}
              >
                {t('cek.sizing.currency.idr')}
              </Button>
              <Button
                type="button"
                variant={!isIdx ? 'default' : 'outline'}
                className="flex-1 cursor-pointer"
                data-testid="cek-currency-usd"
                onClick={() => setCurrency('USD')}
              >
                {t('cek.sizing.currency.usd')}
              </Button>
            </div>
          </div>

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

          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="cek-harga-jual">{t('cek.sizing.hargaJual')}</Label>
              <Input
                id="cek-harga-jual"
                data-testid="cek-harga-jual"
                inputMode="decimal"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
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
            <CardTitle className="text-sm">{t('cek.sizing.autoTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4" data-testid="cek-hasil">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isIdx ? t('cek.sizing.lotsLabel') : t('cek.sizing.sharesLabel')}
                </p>
                <p className="mt-1 text-3xl font-semibold" data-testid="cek-lots">
                  {isIdx
                    ? t('cek.result.lots', { n: result.lots ?? 0 })
                    : result.shares.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('cek.result.rugiMaksimal')}
                </p>
                <p className="mt-1 text-2xl font-semibold text-destructive">
                  <Money value={result.rugiMaksimal} currency={result.currency} />
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Row
                label={t('cek.field.hargaBeli')}
                value={
                  <Money value={result.hargaBeli} currency={result.currency} dp={isIdx ? 0 : 2} />
                }
              />
              <Row
                label={t('cek.field.hargaStop')}
                value={
                  <Money value={result.hargaStop} currency={result.currency} dp={isIdx ? 0 : 2} />
                }
              />
              <Row
                label={t('cek.sizing.hargaJual')}
                value={
                  <Money value={result.hargaJual} currency={result.currency} dp={isIdx ? 0 : 2} />
                }
              />
              <Row
                label={t('cek.result.nilaiPosisi')}
                value={<Money value={result.nilaiPosisi} currency={result.currency} />}
              />
              <Row
                label={t('cek.sizing.riskPctModal')}
                value={
                  <>
                    <Numeric
                      value={Number(result.riskPctOfModal)}
                      kind="decimal"
                      precision={2}
                      direction="none"
                    />
                    %
                  </>
                }
              />
              <Row
                label={isIdx ? t('cek.sizing.riskPerLot') : t('cek.sizing.riskPerShare')}
                value={
                  <Money
                    value={(isIdx ? result.risikoPerLot : result.risikoPerSaham) ?? '0'}
                    currency={result.currency}
                  />
                }
              />
              <Row
                label={t('cek.profile.rr')}
                value={
                  <Numeric
                    value={Number(result.rr)}
                    kind="decimal"
                    precision={2}
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.sizing.sharesLabel')}
                value={<Numeric value={result.shares} kind="integer" direction="none" />}
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

            <RumusDisclosure formulaKey={isIdx ? 'cek.formula.lot' : 'cek.formula.posisi.us'} />

            <div className="border-t pt-3">
              <SimpanCatatanCard symbol={symbol} price={result.hargaBeli} shares={result.shares} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HitungLotPanel;
