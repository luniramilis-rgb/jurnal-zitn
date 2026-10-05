import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { RiskMarket } from '../lib/risk-profile';
import type { RiskProfileFile } from '../lib/risk-profile.types';

/**
 * Fetches a PRIVATE per-market risk-profile grid at runtime (ZITN-TECH-043/047).
 * The grids are strategy IP and are NOT bundled; they are served by
 * `GET /api/cek-risiko/risk-profile?market=us|id`. When a market is not
 * provisioned the endpoint 503s and the simulator falls back to its "no data"
 * state. The query key is per-market so switching markets refetches.
 */
export function useRiskProfileData(market: RiskMarket) {
  return useQuery({
    queryKey: ['cek-risiko', 'risk-profile', market],
    queryFn: () => api.get<RiskProfileFile>(`/cek-risiko/risk-profile?market=${market}`),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
