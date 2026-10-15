import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateTradePlanInput,
  TradePlan,
  TradePlanDecision,
  UpdateTradePlanInput,
} from '@jurnal-zitn/shared';

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

export function useUpdateTradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTradePlanInput }) =>
      api.patch<TradePlan>(`/trade-plans/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trade-plans'] });
    },
  });
}

export function useSetTradePlanDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: TradePlanDecision }) =>
      api.patch<TradePlan>(`/trade-plans/${id}/decision`, { decision }),
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
