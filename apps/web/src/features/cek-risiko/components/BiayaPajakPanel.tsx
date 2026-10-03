import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { hitungAraArb, hitungBiayaPajak, hitungHargaRataRata } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IDX_BROKER_PRESETS } from '@/features/brokerages/lib/idxBrokerPresets';
import { useT } from '@/hooks/useLocale';

import { RumusDisclosure } from './RumusDisclosure';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Money({ value, direction = 'none' }: { value: string; direction?: 'auto' | 'none' }) {
  return <Numeric value={value} kind="money" currency="IDR" direction={direction} />;
}

/**
 * Platform yang ditampilkan di Cek Risiko. Nilai fee **tidak diketik ulang** —
 * diambil dari preset broker IDX kanonik (`idxBrokerPresets.ts`) supaya satu
 * sumber angka dengan dialog broker.
 */
const PLATFORMS = [
  { id: 'ipot', label: 'IPOT', presetId: 'indopremier' },
  { id: 'stockbit', label: 'Stockbit', presetId: 'stockbit' },
  { id: 'bni', label: 'BNI', presetId: 'bni' },
  { id: 'mirae', label: 'Mirae', presetId: 'mirae' },
] as const;

/** Mode "Biaya & Pajak" (D-H1b). */
export function BiayaPajakPanel() {
  const t = useT();

  const [platformId, setPlatformId] = useState<string>(PLATFORMS[0].id);
  const [hargaBeli, setHargaBeli] = useState('');
  const [lots, setLots] = useState('');
  const [hargaJual, setHargaJual] = useState('');

  const [hargaAcuan, setHargaAcuan] = useState('');

  const [lotsAwal, setLotsAwal] = useState('');
  const [hargaAwal, setHargaAwal] = useState('');
  const [lotsTambah, setLotsTambah] = useState('');
  const [hargaTambah, setHargaTambah] = useState('');

  const preset =
    IDX_BROKER_PRESETS.find((p) => p.id === PLATFORMS.find((x) => x.id === platformId)?.presetId) ??
    IDX_BROKER_PRESETS[0];

  const ready =
    hargaBeli.trim() !== '' &&
    lots.trim() !== '' &&
    hargaJual.trim() !== '' &&
    preset !== undefined;
  const result = useMemo(
    () =>
      ready
        ? hitungBiayaPajak({
            hargaBeli,
            lots,
            hargaJual,
            percentBuy: preset.percentBuy,
            percentSell: preset.percentSell,
          })
        : null,
    [ready, hargaBeli, lots, hargaJual, preset],
  );

  const araArb = hargaAcuan.trim() !== '' ? hitungAraArb(hargaAcuan) : null;

  const avgReady =
    lotsAwal.trim() !== '' &&
    hargaAwal.trim() !== '' &&
    lotsTambah.trim() !== '' &&
    hargaTambah.trim() !== '';
  const avg = useMemo(
    () => (avgReady ? hitungHargaRataRata({ lotsAwal, hargaAwal, lotsTambah, hargaTambah }) : null),
    [avgReady, lotsAwal, hargaAwal, lotsTambah, hargaTambah],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="cek-platform">{t('cek.field.platform')}</Label>
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger id="cek-platform" data-testid="cek-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cek-biaya-beli">{t('cek.field.hargaBeli')}</Label>
              <Input
                id="cek-biaya-beli"
                inputMode="decimal"
                value={hargaBeli}
                onChange={(e) => setHargaBeli(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-biaya-lots">{t('cek.field.lots')}</Label>
              <Input
                id="cek-biaya-lots"
                inputMode="decimal"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cek-biaya-jual">{t('cek.field.hargaJual')}</Label>
            <Input
              id="cek-biaya-jual"
              inputMode="decimal"
              value={hargaJual}
              onChange={(e) => setHargaJual(e.target.value)}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {result !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('cek.mode.biaya')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.ok ? (
              <>
                <Row label={t('cek.result.nilaiBeli')} value={<Money value={result.nilaiBeli} />} />
                <Row label={t('cek.result.biayaBeli')} value={<Money value={result.biayaBeli} />} />
                <Row label={t('cek.result.nilaiJual')} value={<Money value={result.nilaiJual} />} />
                <Row label={t('cek.result.biayaJual')} value={<Money value={result.biayaJual} />} />
                <Row label={t('cek.result.pphFinal')} value={<Money value={result.pphFinal} />} />
                <Row
                  label={t('cek.result.nilaiBersih')}
                  value={<Money value={result.nilaiBersih} />}
                />
                <Row
                  label={t('cek.result.totalBiaya')}
                  value={<Money value={result.totalBiaya} />}
                />
                <Row
                  label={t('cek.result.untungRugi')}
                  value={<Money value={result.untungRugi} direction="auto" />}
                />
              </>
            ) : (
              <p className="text-sm text-destructive">
                {result.code === 'lots-tidak-valid' ? t('cek.error.lots') : t('cek.error.harga')}
              </p>
            )}
            <div className="pt-2">
              <p className="mb-2 text-xs text-muted-foreground">{t('cek.fee.disclaimer')}</p>
              <RumusDisclosure formulaKey="cek.formula.biaya" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('cek.result.ara')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="cek-harga-acuan">{t('cek.field.hargaAcuan')}</Label>
            <Input
              id="cek-harga-acuan"
              inputMode="decimal"
              value={hargaAcuan}
              onChange={(e) => setHargaAcuan(e.target.value)}
              placeholder="0"
            />
          </div>
          {araArb && (
            <div className="space-y-2 pt-1" data-testid="cek-ara-arb">
              <Row label={t('cek.result.ara')} value={<Money value={araArb.ara} />} />
              <Row label={t('cek.result.arb')} value={<Money value={araArb.arb} />} />
            </div>
          )}
          <RumusDisclosure formulaKey="cek.formula.ara" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('cek.field.lotsAwal')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cek-lots-awal">{t('cek.field.lotsAwal')}</Label>
              <Input
                id="cek-lots-awal"
                inputMode="decimal"
                value={lotsAwal}
                onChange={(e) => setLotsAwal(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-harga-awal">{t('cek.field.hargaAwal')}</Label>
              <Input
                id="cek-harga-awal"
                inputMode="decimal"
                value={hargaAwal}
                onChange={(e) => setHargaAwal(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-lots-tambah">{t('cek.field.lotsTambah')}</Label>
              <Input
                id="cek-lots-tambah"
                inputMode="decimal"
                value={lotsTambah}
                onChange={(e) => setLotsTambah(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-harga-tambah">{t('cek.field.hargaTambah')}</Label>
              <Input
                id="cek-harga-tambah"
                inputMode="decimal"
                value={hargaTambah}
                onChange={(e) => setHargaTambah(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          {avg && avg.ok && (
            <div className="space-y-2 border-t pt-3" data-testid="cek-avg">
              <Row
                label={t('cek.result.lotsTotal')}
                value={<Numeric value={avg.lotsTotal} kind="integer" direction="none" />}
              />
              <Row
                label={t('cek.result.hargaRataRata')}
                value={<Money value={avg.hargaRataRata} />}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BiayaPajakPanel;
