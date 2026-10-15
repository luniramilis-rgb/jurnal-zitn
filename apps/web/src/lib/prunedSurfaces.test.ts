import { describe, expect, it } from 'vitest';

import { PLAYBOOKS_ENABLED } from './frontendFlags';
import { isPrunedPath } from './prunedSurfaces';

// ZITN-TECH-070 Fase 3 (hide): rute yang dipangkas mendarat di /dashboard lewat `_auth.tsx`.
describe('isPrunedPath', () => {
  it('menandai permukaan yang sedang disembunyikan (/playbooks) beserta anaknya', () => {
    // Guard terhadap flag: uji ini menegaskan permukaan benar-benar dipangkas saat ini.
    expect(PLAYBOOKS_ENABLED).toBe(false);
    expect(isPrunedPath('/playbooks')).toBe(true);
    expect(isPrunedPath('/playbooks/123')).toBe(true);
  });

  it('tidak menyentuh permukaan lain', () => {
    expect(isPrunedPath('/playbook')).toBe(false);
    expect(isPrunedPath('/positions')).toBe(false);
    expect(isPrunedPath('/dashboard')).toBe(false);
    expect(isPrunedPath('/trade-plans')).toBe(false);
  });
});
