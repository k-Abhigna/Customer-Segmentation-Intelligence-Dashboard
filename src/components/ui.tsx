import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Download, Info, Minus, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { downloadCSV, type Row } from '../lib/csv';
import { useDashboard } from '../state/DashboardContext';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({
  title, subtitle, actions, children, className, badge, bodyClass, delay = 0, icon,
}: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
  badge?: ReactNode; bodyClass?: string; delay?: number; icon?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cx('glass rounded-2xl p-4 sm:p-5 flex flex-col min-w-0', className)}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {icon && <span className="text-cyan-300/90">{icon}</span>}
              {title && <h3 className="font-display text-[15px] font-semibold text-ink-100 tracking-tight">{title}</h3>}
              {badge}
            </div>
            {subtitle && <p className="text-xs text-ink-300 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cx('flex-1 min-w-0', bodyClass)}>{children}</div>
    </motion.section>
  );
}

export function SectionHeader({ title, description, icon, right, eyebrow }: { title: string; description: string; icon: ReactNode; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
      <div className="flex items-start gap-3.5">
        <div className="h-11 w-11 rounded-xl grid place-items-center bg-gradient-to-br from-blue-500/25 via-violet-500/20 to-cyan-400/20 border border-white/10 text-cyan-200 shadow-glow shrink-0">
          {icon}
        </div>
        <div>
          {eyebrow && <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 font-medium mb-0.5">{eyebrow}</div>}
          <h1 className="font-display text-2xl sm:text-[28px] font-semibold text-white tracking-tight leading-tight">{title}</h1>
          <p className="text-sm text-ink-300 mt-1 max-w-3xl">{description}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

export function Delta({ value, invert = false, size = 'sm', suffix = 'vs prev' }: { value: number | null; invert?: boolean; size?: 'sm' | 'xs'; suffix?: string }) {
  if (value == null || !isFinite(value)) return <span className="text-[11px] text-ink-400">no prior period</span>;
  const flat = Math.abs(value) < 0.0005;
  const good = flat ? null : invert ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cx('inline-flex items-center gap-1 font-medium', size === 'xs' ? 'text-[11px]' : 'text-xs')}>
      <span className={cx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5',
        good == null ? 'bg-white/5 text-ink-300' : good ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300')}>
        <Icon size={12} />
        {(Math.abs(value) * 100).toFixed(1)}%
      </span>
      {suffix && <span className="text-ink-400 font-normal hidden sm:inline">{suffix}</span>}
    </span>
  );
}

export function Badge({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose' | 'blue'; className?: string }) {
  const tones = {
    default: 'bg-white/5 text-ink-200 border-white/10',
    cyan: 'bg-cyan-400/10 text-cyan-200 border-cyan-400/20',
    violet: 'bg-violet-400/10 text-violet-200 border-violet-400/20',
    amber: 'bg-amber-400/10 text-amber-200 border-amber-400/25',
    emerald: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20',
    rose: 'bg-rose-400/10 text-rose-200 border-rose-400/20',
    blue: 'bg-blue-400/10 text-blue-200 border-blue-400/20',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-wide', tones[tone], className)}>{children}</span>;
}

export function SyntheticBadge({ label = 'Synthetic data' }: { label?: string }) {
  return <Badge tone="default" className="!text-ink-300">● {label}</Badge>;
}

export function SimulatedBadge() {
  return <Badge tone="amber">SIMULATED</Badge>;
}

export function IconButton({ onClick, title, children, active }: { onClick?: () => void; title: string; children: ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={cx('h-8 w-8 grid place-items-center rounded-lg border transition-all duration-200',
        active ? 'bg-blue-500/20 border-blue-400/40 text-blue-100' : 'border-white/5 bg-white/[0.03] text-ink-300 hover:text-white hover:bg-white/[0.08] hover:border-white/15')}>
      {children}
    </button>
  );
}

export function ExportButton({ filename, rows, label }: { filename: string; rows: () => Row[]; label?: string }) {
  const { notify } = useDashboard();
  return (
    <button
      onClick={() => { const r = rows(); downloadCSV(filename, r); notify(`Exported ${r.length.toLocaleString()} rows → ${filename}.csv`); }}
      title="Export to CSV" aria-label="Export to CSV"
      className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 text-xs text-ink-300 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-all"
    >
      <Download size={13} />{label ?? 'CSV'}
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size = 'sm' }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'xs' }) {
  return (
    <div className="inline-flex rounded-lg bg-black/25 border border-white/5 p-0.5 max-w-full overflow-x-auto no-scrollbar">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cx('relative rounded-md whitespace-nowrap transition-colors', size === 'xs' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs',
            value === o.value ? 'text-white' : 'text-ink-300 hover:text-ink-100')}>
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join('')}`} className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-white/10" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info size={13} className="text-ink-400 hover:text-ink-200 cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 rounded-lg bg-ink-900/95 border border-white/10 px-3 py-2 text-[11px] leading-relaxed text-ink-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl normal-case tracking-normal font-normal">
        {text}
      </span>
    </span>
  );
}

export function Bar({ value, color = 'linear-gradient(90deg,#3b82f6,#22d3ee)', height = 6 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-white/[0.05] overflow-hidden" style={{ height }}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

export function MiniStat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] px-3.5 py-3 min-w-0">
      <div className="text-[11px] text-ink-300 truncate">{label}</div>
      <div className="font-display text-lg font-semibold text-white mt-0.5 tabular-nums" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="text-[11px] text-ink-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Recharts custom tooltip */
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: {
  active?: boolean; payload?: { name?: string; value?: number | string | [number, number]; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }[];
  label?: string | number; formatter?: (v: number, name: string) => string; labelFormatter?: (l: string | number, p?: Record<string, unknown>) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl bg-ink-900/95 border border-white/10 px-3 py-2.5 shadow-2xl backdrop-blur-xl min-w-[150px]">
      {label != null && <div className="text-[11px] text-ink-300 mb-1.5 font-medium">{labelFormatter ? labelFormatter(label, payload[0]?.payload) : label}</div>}
      <div className="space-y-1">
        {payload.filter((p) => p.value != null && !Array.isArray(p.value)).map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-ink-200">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}
            </span>
            <span className="font-mono text-white tabular-nums">{formatter ? formatter(Number(p.value), String(p.name)) : String(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const axisProps = {
  stroke: 'transparent',
  tick: { fill: '#8792b0', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 6', vertical: false } as const;

export function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5 text-[11px] text-ink-300">
          {i.dashed ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />}
          {i.name}
        </span>
      ))}
    </div>
  );
}

// ───────────── sortable / searchable data table ─────────────
export interface Column<T> {
  key: string; header: string; align?: 'left' | 'right'; sortValue?: (r: T) => number | string; render: (r: T) => ReactNode; className?: string;
}

export function DataTable<T>({ rows, columns, searchKeys, initialSort, onRowClick, maxHeight = 420, placeholder = 'Search…', rowKey, selectedKey }: {
  rows: T[]; columns: Column<T>[]; searchKeys?: (r: T) => string; initialSort?: { key: string; dir: 'asc' | 'desc' };
  onRowClick?: (r: T) => void; maxHeight?: number; placeholder?: string; rowKey: (r: T) => string; selectedKey?: string | null;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const shown = useMemo(() => {
    let out = rows;
    if (q && searchKeys) out = out.filter((r) => searchKeys(r).toLowerCase().includes(q.toLowerCase()));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const va = col.sortValue!(a), vb = col.sortValue!(b);
          const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
          return sort.dir === 'asc' ? r : -r;
        });
      }
    }
    return out;
  }, [rows, q, sort, columns, searchKeys]);

  return (
    <div className="min-w-0">
      {searchKeys && (
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            className="w-full h-9 rounded-lg bg-black/25 border border-white/5 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10" />
        </div>
      )}
      <div className="overflow-auto rounded-xl border border-white/5 thin-scroll" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-ink-850/95 backdrop-blur">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={cx('px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-300 whitespace-nowrap select-none', c.align === 'right' ? 'text-right' : 'text-left', c.sortValue && 'cursor-pointer hover:text-white')}
                    onClick={() => c.sortValue && setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                    <span className={cx('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {c.sortValue && (active ? (sort!.dir === 'desc' ? <ChevronDown size={12} className="text-cyan-300" /> : <ChevronUp size={12} className="text-cyan-300" />) : <ArrowUpDown size={11} className="opacity-40" />)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const k = rowKey(r);
              return (
                <tr key={k} onClick={() => onRowClick?.(r)}
                  className={cx('border-t border-white/[0.04] transition-colors', onRowClick && 'cursor-pointer', selectedKey === k ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]')}>
                  {columns.map((c) => (
                    <td key={c.key} className={cx('px-3 py-2.5 text-ink-100 whitespace-nowrap', c.align === 'right' && 'text-right tabular-nums', c.className)}>{c.render(r)}</td>
                  ))}
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-ink-400 text-sm">No matching rows</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="h-full min-h-[160px] grid place-items-center text-sm text-ink-400 text-center px-6">{message}</div>;
}
