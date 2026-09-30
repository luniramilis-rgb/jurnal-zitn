/**
 * Spine konteks (ZITN-TECH-029 Fase 3) — pembacaan murni dari query URL yang dibawa
 * antar-permukaan: tanggal lembar, emiten, timeframe, akun. Hanya *membaca*; tidak
 * menghitung dan tidak mengambil data.
 */
export interface WorkspaceContext {
  tanggal: string;
  symbol: string;
  tf: string;
  account: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseContext(search: string): WorkspaceContext {
  const params = new URLSearchParams(String(search || ''));
  const tanggalRaw = (params.get('tanggal') ?? '').trim();
  return {
    // Tanggal hanya diterima bila berbentuk YYYY-MM-DD (bukan nilai bebas).
    tanggal: DATE_RE.test(tanggalRaw) ? tanggalRaw : '',
    symbol: (params.get('symbol') ?? '').trim().toUpperCase(),
    tf: (params.get('tf') ?? '').trim(),
    account: (params.get('akun') ?? params.get('account') ?? '').trim(),
  };
}

export function hasContext(ctx: WorkspaceContext): boolean {
  return Boolean(ctx.tanggal || ctx.symbol || ctx.tf || ctx.account);
}
