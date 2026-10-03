import { Link } from '@tanstack/react-router';

import { IDX_SHARES_PER_LOT } from '@jurnal-zitn/shared';
import type { PositionListItem } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useT } from '@/hooks/useLocale';

/**
 * "Posisi Saya" ringkas (H2): kode · lot · harga rata-rata · untung/rugi.
 * Membaca **mesin jurnal yang sama** (`GET /positions`), bukan gudang kedua.
 */
export function PosisiSaya() {
  const t = useT();
  const { data, isLoading } = usePositions({ status: 'open' });
  const positions = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{t('cek.posisi.title')}</CardTitle>
        <Link to="/positions" className="text-xs text-muted-foreground underline">
          {t('cek.posisi.viewAll')}
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('cek.posisi.loading')}</p>
        ) : positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('cek.posisi.empty')}</p>
        ) : (
          <ul className="divide-y" data-testid="cek-posisi-list">
            {positions.map((p: PositionListItem) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{p.symbol}</span>
                <span className="text-muted-foreground">
                  <Numeric
                    value={p.openUnits / IDX_SHARES_PER_LOT}
                    kind="decimal"
                    precision={2}
                    direction="none"
                  />{' '}
                  {t('cek.posisi.lots')}
                </span>
                <span className="text-muted-foreground">
                  <Numeric
                    value={p.avgEntryPrice}
                    kind="money"
                    currency={p.accountCurrency}
                    direction="none"
                  />
                </span>
                <span className="font-medium">
                  <Numeric
                    value={p.netPnl ?? p.realizedPnl}
                    kind="money"
                    currency={p.accountCurrency}
                    direction="auto"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default PosisiSaya;
