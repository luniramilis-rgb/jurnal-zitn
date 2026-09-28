import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateTradePlanInput, TradePlan, TradePlanStatus } from '@jurnal-zitn/shared';

import { api } from '@/lib/api';

/** F4 pre-trade plan data access (ZITN-TECH-017 §10.8). */
export function useTradePlans() {
  return useQuery({
    queryKey: ['trade-plans'],
    queryFn: () => api.get<{ items: TradePlan[] }>('/trade-plans'),
  });
}

export function useCreateTradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTradePlanInput) => api.post<TradePlan>('/trade-plans', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trade-plans'] });
    },
  });
}

export function useSetTradePlanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TradePlanStatus }) =>
      api.patch<TradePlan>(`/trade-plans/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trade-plans'] });
    },
  });
}

/** F4 — attach a plan to a trade (1:1), or detach with `positionId: null`. */
export function useLinkTradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, positionId }: { id: string; positionId: string | null }) =>
      api.patch<TradePlan>(`/trade-plans/${id}/link`, { positionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trade-plans'] });
    },
  });
}

export function useDeleteTradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/trade-plans/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trade-plans'] });
    },
  });
}
