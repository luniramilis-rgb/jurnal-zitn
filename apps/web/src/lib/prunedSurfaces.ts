/**
 * Permukaan Tradr yang **disembunyikan** (ZITN-TECH-070 Fase 3, tahap `hide`).
 *
 * Satu tempat untuk memutus rute yang dipangkas: `_auth.tsx` memanggil `isPrunedPath` di
 * `beforeLoad` sehingga tautan langsung/bookmark mendarat di `/dashboard`. Reversibel —
 * cukup nyalakan kembali flag fitur di `frontendFlags.ts`.
 *
 * Berbeda dari `frontendFlags` (yang menyalakan/mematikan permukaan secara utuh), daftar ini
 * hanya yang **sedang** dipangkas agar redirect terpusat dan mudah ditinjau.
 */
import { PLAYBOOKS_ENABLED } from './frontendFlags';

const PRUNED_SURFACES: { prefix: string; enabled: boolean }[] = [
  { prefix: '/playbooks', enabled: PLAYBOOKS_ENABLED },
];

/** True bila `pathname` termasuk permukaan yang sedang disembunyikan. */
export function isPrunedPath(pathname: string): boolean {
  return PRUNED_SURFACES.some(
    ({ prefix, enabled }) => !enabled && (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}
