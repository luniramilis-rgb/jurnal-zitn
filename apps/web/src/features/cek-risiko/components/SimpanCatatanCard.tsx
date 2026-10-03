import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { isAccountWritable } from '@/features/billing/tier-usage';
import { useTierState } from '@/features/billing/useTierState';
import { getPositionErrorCode } from '@/features/positions/hooks/usePositions';
import { useT } from '@/hooks/useLocale';

import { useSimpanCatatan } from '../hooks/useSimpanCatatan';

interface Props {
  symbol: string;
  /** Harga beli per saham. */
  price: string;
  /** Jumlah saham (satuan saham, bukan lot). */
  shares: number;
}

/**
 * Tombol "Simpan ke Catatan" (H2). Menulis lewat mesin jurnal lewat
 * `useSimpanCatatan`; memilih akun tujuan (default akun pengguna) agar posisi
 * masuk ke buku yang benar. Akun hanya-baca pada paket pengguna dinonaktifkan
 * (pola CreatePositionDialog) supaya tidak mengundang 403.
 */
export function SimpanCatatanCard({ symbol, price, shares }: Props) {
  const t = useT();
  const { data: accounts } = useAccounts();
  const { data: tierState } = useTierState();
  const simpan = useSimpanCatatan();
  const [accountId, setAccountId] = useState('');
  const [refusalCode, setRefusalCode] = useState<string | null>(null);

  const list = accounts ?? [];
  const defaultAccount =
    list.find((a) => a.isDefault && isAccountWritable(tierState, a.id)) ??
    list.find((a) => isAccountWritable(tierState, a.id)) ??
    list.find((a) => a.isDefault) ??
    list[0];
  useEffect(() => {
    if (accountId === '' && defaultAccount) setAccountId(defaultAccount.id);
  }, [accountId, defaultAccount]);

  const disabled = symbol.trim() === '' || accountId === '' || shares <= 0 || simpan.isPending;

  async function handleSave() {
    setRefusalCode(null);
    try {
      await simpan.mutateAsync({ accountId, symbol: symbol.trim().toUpperCase(), price, shares });
      toast.success(t('cek.action.saved'));
    } catch (err) {
      const code = getPositionErrorCode(err);
      if (code === 'TIER_LIMIT_POSITIONS' || code === 'TIER_ACCOUNT_NOT_WRITABLE') {
        setRefusalCode(code);
      } else {
        toast.error(t('auth.error.generic'));
      }
    }
  }

  if (accounts !== undefined && list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="cek-simpan-no-account">
        <Link to="/accounts" className="underline">
          {t('nav.accounts')}
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor="cek-simpan-account">{t('pos.col.account')}</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger id="cek-simpan-account" data-testid="cek-simpan-account">
            <SelectValue placeholder={t('calc.field.selectAccount')} />
          </SelectTrigger>
          <SelectContent>
            {list.map((a) => {
              const writable = isAccountWritable(tierState, a.id);
              return (
                <SelectItem key={a.id} value={a.id} disabled={!writable}>
                  {writable
                    ? `${a.name} (${a.currency})`
                    : `${a.name} (${a.currency}) — ${t('acct.badge.readonly')}`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        className="w-full cursor-pointer"
        disabled={disabled}
        onClick={() => void handleSave()}
        data-testid="cek-simpan"
      >
        {simpan.isPending ? t('cek.action.saving') : t('cek.action.simpan')}
      </Button>
      {refusalCode && (
        <p className="text-sm text-destructive" data-testid="cek-simpan-error">
          {refusalCode === 'TIER_LIMIT_POSITIONS'
            ? t('cek.error.tierPositions')
            : t('cek.error.tierAccount')}
        </p>
      )}
    </div>
  );
}

export default SimpanCatatanCard;
