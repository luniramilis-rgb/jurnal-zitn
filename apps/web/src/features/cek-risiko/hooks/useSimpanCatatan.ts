import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreatePositionInput, Position } from '@jurnal-zitn/shared';

import { billingKeys } from '@/features/billing/useWalletBalance';
import { api } from '@/lib/api';
import { eventBus } from '@/stores/event-bus.store';

/**
 * "Simpan ke Catatan" (D-H3 / H2) — efek samping dari alat hitung.
 *
 * Menulis lewat **mesin jurnal yang sudah ada**, meniru rangkaian kanonik
 * `useCreatePosition` → `useAddFill` → `useOpenPosition`: `POST /positions`,
 * lalu `POST /positions/:id/fills` (entri), lalu `POST /positions/:id/open`.
 * Urutan itu wajib — `openPositionTx` menolak posisi tanpa entri, dan posisi
 * yang tetap `draft` tidak muncul di "Posisi Saya" (yang menyaring `open`).
 * **Tidak** ada gudang data kedua. Fees dikirim `'0'` supaya server memakai
 * jadwal broker akun (pola FillDialog); menulis angkanya di sini akan
 * dibebankan dua kali.
 */
export interface SimpanCatatanInput {
  accountId: string;
  symbol: string;
  /** Harga beli per saham. */
  price: string;
  /** Jumlah saham (sudah dalam satuan saham, bukan lot). */
  shares: number;
}

export function useSimpanCatatan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SimpanCatatanInput) => {
      const body: CreatePositionInput = {
        accountId: input.accountId,
        symbol: input.symbol,
        side: 'long',
        assetType: 'stock',
      };
      const position = await api.post<Position>('/positions', body);
      await api.post(`/positions/${position.id}/fills`, {
        type: 'entry',
        price: input.price,
        quantity: String(input.shares),
        fees: '0',
        filledAt: new Date().toISOString(),
      });
      // Draft → open; only possible once an entry fill exists.
      await api.post<Position>(`/positions/${position.id}/open`, {});
      return position;
    },
    onSuccess: (position) => {
      // Mirror the canonical mutations: ['positions'] + tier usage on create,
      // then the fill/open events the EventBusBridge turns into the derived
      // account/dashboard/performance invalidations.
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: billingKeys.tier() });
      eventBus.publish('positions:cache-invalidate', {
        reason: 'created',
        positionId: position.id,
      });
      eventBus.publish('positions:cache-invalidate', {
        reason: 'fill-added',
        positionId: position.id,
      });
      eventBus.publish('positions:cache-invalidate', {
        reason: 'opened',
        positionId: position.id,
      });
    },
  });
}
