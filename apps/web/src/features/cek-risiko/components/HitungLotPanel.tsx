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
import { useExchangeRates } from '@/features/accounting/hooks/useExchangeRates';
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

function dariQuery(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get(key) ?? '';
  } catch {
    return '';
  }
}

interface RateRow {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveDate: string;
}

/**
 * Kurs USD→IDR dari daftar jurnal (langsung, atau dibalik dari IDR→USD); pilih
 * `effectiveDate` terbaru. `null` bila tak ada (perangkat tidak mengarang kurs).
 */
function usdIdrRate(rates: readonly RateRow[]): { rate: number; asof: string } | null {
  const pick = (base: string, quote: string) => {
    const rows = rates.filter((r) => r.baseCurrency === base && r.quoteCurrency === quote);
    if (rows.length === 0) return null;
    return rows.reduce((a, b) => (b.effectiveDate > a.effectiveDate ? b : a));
  };
  const direct = pick('USD', 'IDR');
  if (direct && Number(direct.rate) > 0) {
    return { rate: Number(direct.rate), asof: direct.effectiveDate };
  }
  const inv = pick('IDR', 'USD');
  if (inv && Number(inv.rate) > 0) {
    return { rate: 1 / Number(inv.rate), asof: inv.effectiveDate };
  }
  return null;
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

  // FX: konversi nilai ke mata uang lain (dari kurs jurnal).
  const rates = useExchangeRates().data ?? [];
  const fx = useMemo(() => usdIdrRate(rates), [rates]);

  const bridge = useMemo(() => {
    if (!result || !result.ok || !isIdx) return null;
    const modalNum = Number(modal);
    const beli = Number(hargaBeli);
    const stop = Number(hargaStop);
    if (!(modalNum > 0) || !(beli > 0) || !Number.isFinite(stop)) return null;
    return { wImplied: Number(result.nilaiPosisi) / modalNum, stopDist: (beli - stop) / beli };
  }, [result, modal, hargaBeli, hargaStop, isIdx]);

  const conv = useMemo(() => {
    if (!result || !result.ok || !fx) return null;
    const value = Number(result.nilaiPosisi);
    return isIdx
      ? { other: 'USD' as const, value: value / fx.rate }
      : { other: 'IDR' as const, value: value * fx.rate };
  }, [result, fx, isIdx]);

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
                  <Numeric
                    value={result.rugiMaksimal}
                    kind="money"
                    currency={result.currency}
                    direction="none"
                  />
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Row
                label={t('cek.field.hargaBeli')}
                value={
                  <Numeric
                    value={result.hargaBeli}
                    kind="money"
                    currency={result.currency}
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.field.hargaStop')}
                value={
                  <Numeric
                    value={result.hargaStop}
                    kind="money"
                    currency={result.currency}
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.sizing.hargaJual')}
                value={
                  <Numeric
                    value={result.hargaJual}
                    kind="money"
                    currency={result.currency}
                    direction="none"
                  />
                }
              />
              <Row
                label={t('cek.result.nilaiPosisi')}
                value={
                  <Numeric
                    value={result.nilaiPosisi}
                    kind="money"
                    currency={result.currency}
                    direction="none"
                  />
                }
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
                  <Numeric
                    value={isIdx ? result.risikoPerLot : result.risikoPerSaham}
                    kind="money"
                    currency={result.currency}
                    direction="none"
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

              <div className="flex items-center justify-between text-sm" data-testid="cek-fx">
                <span className="text-muted-foreground">{t('cek.sizing.convUsdIdr')}</span>
                <span className="text-right font-medium">
                  {conv && fx ? (
                    <>
                      <Numeric
                        value={conv.value}
                        kind="money"
                        currency={conv.other}
                        direction="none"
                      />
                      <span className="block text-xs text-muted-foreground">
                        {t('cek.sizing.fxRate', {
                          rate: fx.rate.toFixed(2),
                          source: 'jurnal',
                          asof: fx.asof,
                        })}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('cek.sizing.fxMissing')}
                    </span>
                  )}
                </span>
              </div>

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
              <SimpanCatatanCard symbol={symbol} price={result.hargaBeli} shares={result.shares} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HitungLotPanel;
