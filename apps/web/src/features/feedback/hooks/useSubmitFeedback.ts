import { useMutation } from '@tanstack/react-query';

import type { CreateFeedbackInput, Feedback } from '@jurnal-zitn/shared';

import { api } from '@/lib/api';

/**
 * POST /api/feedback — the in-app feedback write (ZITN-TECH-017 §10.4, F0b).
 * No telemetry: this is the ONLY network call the feedback surface makes.
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (input: CreateFeedbackInput) => api.post<Feedback>('/feedback', input),
  });
}
