import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { RiskProfileFile } from '../lib/risk-profile.types';

/**
 * Fetches the PRIVATE risk-profile grid at runtime (ZITN-TECH-043, Opsi A). The
 * grid is strategy IP and is NOT bundled; it is served by
 * `GET /api/cek-risiko/risk-profile`. When absent the endpoint 503s and the
 * simulator falls back to its "no data" state.
 */
export function useRiskProfileData() {
  return useQuery({
    queryKey: ['cek-risiko', 'risk-profile'],
    queryFn: () => api.get<RiskProfileFile>('/cek-risiko/risk-profile'),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
