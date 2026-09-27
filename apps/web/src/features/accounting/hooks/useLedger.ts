import { useQuery } from '@tanstack/react-query';

import type { LedgerEntryListResponse } from '@jurnal-zitn/shared/schemas/accounting';

import { api } from '@/lib/api';

export function useLedgerQuery({ accountId, page }: { accountId: string; page: number }) {
  return useQuery<LedgerEntryListResponse>({
    queryKey: ['ledger', accountId, { page }],
    queryFn: () => api.get<LedgerEntryListResponse>(`/ledger/${accountId}?page=${page}`),
    enabled: !!accountId,
  });
}
