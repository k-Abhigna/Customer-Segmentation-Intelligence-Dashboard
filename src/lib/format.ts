export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

export function fmtCompact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  if (a >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return Math.round(n).toString();
}

export const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

export function fmtDuration(sec: number) {
  if (!isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export const fmtCurrency = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;

export function fmtDelta(cur: number, prev: number | null | undefined) {
  if (prev == null || !isFinite(prev) || prev === 0) return null;
  return cur / prev - 1;
}
