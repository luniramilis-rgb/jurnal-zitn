import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  FeedbackListResponse,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from '@jurnal-zitn/shared';
import { FeedbackListResponseSchema, FeedbackSchema } from '@jurnal-zitn/shared';

import { api } from '@/lib/api';

export interface AdminFeedbackFilters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  source?: FeedbackSource;
}

/** GET /api/admin/feedback — one cursor page of the triage inbox. */
export function useAdminFeedback(filters: AdminFeedbackFilters, cursor?: string) {
  return useQuery<FeedbackListResponse>({
    queryKey: ['admin', 'feedback', 'list', filters, { cursor }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      if (filters.source) params.set('source', filters.source);
      if (cursor) params.set('cursor', cursor);
      const query = params.toString();
      const raw = await api.get<unknown>(`/admin/feedback${query ? `?${query}` : ''}`);
      return FeedbackListResponseSchema.parse(raw);
    },
  });
}

/** PATCH /api/admin/feedback/:id — move one row to another triage status. */
export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const raw = await api.patch<unknown>(`/admin/feedback/${id}`, { status });
      return FeedbackSchema.parse(raw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
    },
    onError: () => {
      toast.error('Failed to update feedback status');
    },
  });
}
