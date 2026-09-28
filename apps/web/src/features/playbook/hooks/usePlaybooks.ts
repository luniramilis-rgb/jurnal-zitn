import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreatePlaybookInput, Playbook, PlaybookSetupStats } from '@jurnal-zitn/shared';

import { api } from '@/lib/api';

/** F4 playbook data access (ZITN-TECH-017 §10.8). */
export function usePlaybooks() {
  return useQuery({
    queryKey: ['playbooks'],
    queryFn: () => api.get<{ items: Playbook[] }>('/playbooks'),
  });
}

export function usePlaybookStats(currency: string | null) {
  return useQuery({
    queryKey: ['playbooks', 'stats', currency],
    // No currency → no meaningful stats (never sum across currencies), so the
    // query stays disabled until the display currency resolves.
    enabled: currency !== null,
    queryFn: () =>
      api.get<{ items: PlaybookSetupStats[] }>(
        `/playbooks/stats?currency=${encodeURIComponent(currency ?? '')}`,
      ),
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlaybookInput) => api.post<Playbook>('/playbooks', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
  });
}

export function useDeletePlaybook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/playbooks/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
  });
}
