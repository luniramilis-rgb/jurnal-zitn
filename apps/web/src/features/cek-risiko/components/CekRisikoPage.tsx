import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/useLocale';
import { HITUNG_LOT_ENABLED } from '@/lib/frontendFlags';

import { BiayaPajakPanel } from './BiayaPajakPanel';
import { HitungLotPanel } from './HitungLotPanel';
import { PosisiSaya } from './PosisiSaya';
import { ProfilRisikoPanel } from './ProfilRisikoPanel';

type Mode = 'lot' | 'biaya' | 'profil';

/** Tab pembuka: "Hitung Lot" saat aktif, selain itu "Profil risiko". */
const DEFAULT_MODE: Mode = HITUNG_LOT_ENABLED ? 'lot' : 'profil';

/**
 * Permukaan **Cek Risiko** (ZITN-TECH-017 §12 / Fase H) — wajah baru jurnal.
 *
 * Satu layar, beberapa mode (segmented). Alat hitung dari angka pengguna: tidak
 * ada prediksi/sinyal/target. Pencatatan menjadi efek samping lewat mesin jurnal
 * ("Simpan ke Catatan"); fitur lanjutan tetap ada di **Mode lengkap**.
 *
 * Tab "Hitung Lot" disembunyikan sementara di balik `HITUNG_LOT_ENABLED`
 * (ZITN-TECH-049) — kode tetap; urutan tab: Hitung Lot (bila aktif) · Profil
 * risiko · Biaya dan pajak.
 */
export function CekRisikoPage() {
  const t = useT();
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);

  return (
    <div className="space-y-6" data-testid="cek-risiko-page">
      <div>
        <PageHeader page={t('cek.page.title')} className="mb-2" />
        <p className="text-sm text-muted-foreground">{t('cek.page.subtitle')}</p>
      </div>

      <div
        role="tablist"
        aria-label={t('cek.page.title')}
        className="flex gap-2"
        data-testid="cek-modes"
      >
        {HITUNG_LOT_ENABLED && (
          <Button
            type="button"
            role="tab"
            aria-selected={mode === 'lot'}
            variant={mode === 'lot' ? 'default' : 'outline'}
            className="flex-1 cursor-pointer"
            onClick={() => setMode('lot')}
            data-testid="cek-mode-lot"
          >
            {t('cek.mode.lot')}
          </Button>
        )}
        <Button
          type="button"
          role="tab"
          aria-selected={mode === 'profil'}
          variant={mode === 'profil' ? 'default' : 'outline'}
          className="flex-1 cursor-pointer"
          onClick={() => setMode('profil')}
          data-testid="cek-mode-profil"
        >
          {t('cek.profile.title')}
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={mode === 'biaya'}
          variant={mode === 'biaya' ? 'default' : 'outline'}
          className="flex-1 cursor-pointer"
          onClick={() => setMode('biaya')}
          data-testid="cek-mode-biaya"
        >
          {t('cek.mode.biaya')}
        </Button>
      </div>

      {HITUNG_LOT_ENABLED && mode === 'lot' ? (
        <HitungLotPanel />
      ) : mode === 'biaya' ? (
        <BiayaPajakPanel />
      ) : (
        <ProfilRisikoPanel />
      )}

      <PosisiSaya />

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" data-testid="cek-disclaimer">
          {t('cek.disclaimer')}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('cek.action.modeLengkap.hint')}</span>
          <Button
            asChild
            variant="outline"
            className="cursor-pointer"
            data-testid="cek-mode-lengkap"
          >
            <Link to="/dashboard">{t('cek.action.modeLengkap')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CekRisikoPage;
