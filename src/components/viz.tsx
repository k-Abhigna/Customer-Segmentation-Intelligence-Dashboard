import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cx, Delta } from './ui';
import { fmtCompact, fmtDuration, fmtPct } from '../lib/format';

// ───────────── color scale ─────────────
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function scale(t: number, stops = ['#0d1528', '#1e3a8a', '#3b82f6', '#22d3ee', '#a5f3fc']) {
  const v = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(v));
  const f = v - i;
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return `rgb(${a.map((x, j) => Math.round(x + (b[j] - x) * f)).join(',')})`;
}
export const VIOLET_SCALE = ['#120f26', '#3b1d7a', '#7c3aed', '#c084fc', '#f5d0fe'];

// ───────────── Heatmap ─────────────
export function Heatmap({
  rows, colLabels, format = (v: number) => fmtCompact(v), stops, normalizeRows = false, onCell, cellH = 26, colLabelEvery = 3, rowLabelW = 84,
}: {
  rows: { row: string; values: number[] }[]; colLabels: string[]; format?: (v: number) => string; stops?: string[];
  normalizeRows?: boolean; onCell?: (row: string, col: number, v: number) => void; cellH?: number; colLabelEvery?: number; rowLabelW?: number;
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const globalMax = Math.max(...rows.flatMap((r) => r.values), 1);
  return (
    <div className="overflow-x-auto thin-scroll">
      <div className="min-w-[560px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `${rowLabelW}px repeat(${colLabels.length}, minmax(0,1fr))` }}>
          {rows.map((r, ri) => {
            const max = normalizeRows ? Math.max(...r.values, 1) : globalMax;
            return [
              <div key={r.row} className={cx('text-[11px] pr-2 flex items-center truncate transition-colors', hover?.r === ri ? 'text-white' : 'text-ink-300')} style={{ height: cellH }}>{r.row}</div>,
              ...r.values.map((v, ci) => (
                <motion.div key={`${ri}-${ci}`}
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (ri * colLabels.length + ci) * 0.0015, duration: 0.3 }}
                  className={cx('rounded-[5px] relative cursor-pointer transition-[outline] outline outline-0', hover?.r === ri && hover?.c === ci && 'outline-2 outline-white/70 z-10')}
                  style={{ height: cellH, background: scale(Math.pow(v / max, 0.85), stops) }}
                  onMouseEnter={() => setHover({ r: ri, c: ci })} onMouseLeave={() => setHover(null)}
                  onClick={() => onCell?.(r.row, ci, v)}
                  title={`${r.row} · ${colLabels[ci]} — ${format(v)}`}
                />
              )),
            ];
          })}
          <div />
          {colLabels.map((c, i) => (
            <div key={c} className={cx('text-[10px] text-center pt-1 transition-colors', hover?.c === i ? 'text-white' : 'text-ink-400')}>{i % colLabelEvery === 0 ? c : ''}</div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
          <div className="text-[11px] text-ink-300 h-4">
            {hover ? <><span className="text-white">{rows[hover.r].row} · {colLabels[hover.c]}</span> — {format(rows[hover.r].values[hover.c])}</> : 'Hover a cell for details'}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-ink-400">
            Low<div className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${(stops ?? ['#0d1528', '#1e3a8a', '#3b82f6', '#22d3ee', '#a5f3fc']).join(',')})` }} />High
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────── Gauge ─────────────
export function Gauge({ value, baseline, label, color = '#22d3ee', invert = false, sub, max = 1, decimals = 1 }: { value: number; baseline?: number; label: string; color?: string; invert?: boolean; sub?: ReactNode; max?: number; decimals?: number }) {
  const r = 70, cx0 = 90, cy0 = 88, sw = 12;
  const arc = (t: number) => {
    const a = Math.PI * (1 - t);
    return [cx0 + r * Math.cos(a), cy0 - r * Math.sin(a)];
  };
  const path = (t: number) => {
    const [x, y] = arc(Math.max(0.0001, Math.min(1, t)));
    return `M${cx0 - r},${cy0} A${r},${r} 0 0 1 ${x},${y}`;
  };
  const delta = baseline != null ? value - baseline : null;
  const good = delta == null ? null : invert ? delta < 0 : delta > 0;
  const [bx, by] = baseline != null ? arc(Math.min(1, baseline / max)) : [0, 0];
  const gid = `g-${label.replace(/\W/g, '')}`;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 104" className="w-full max-w-[220px]">
        <defs>
          <linearGradient id={gid} x1="0" x2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={path(1)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} strokeLinecap="round" />
        <motion.path d={path(1)} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.001, Math.min(1, value / max)) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
        {baseline != null && (
          <g>
            <circle cx={bx} cy={by} r={4} fill="#0a0e1a" stroke="#f8fafc" strokeWidth={1.5} />
          </g>
        )}
        <text x={cx0} y={cy0 - 14} textAnchor="middle" className="font-display" fill="#fff" fontSize="26" fontWeight={600}>{(value * 100).toFixed(decimals)}%</text>
        <text x={cx0} y={cy0 + 2} textAnchor="middle" fill="#8792b0" fontSize="9.5">{baseline != null ? `baseline ${(baseline * 100).toFixed(decimals)}%` : ''}{max !== 1 ? ` · scale 0–${(max * 100).toFixed(0)}%` : ''}</text>
      </svg>
      <div className="text-sm font-medium text-ink-100 -mt-1 text-center">{label}</div>
      {delta != null && Math.abs(delta) > 0.0005 && (
        <div className={cx('text-[11px] mt-1 font-medium', good ? 'text-emerald-300' : 'text-rose-300')}>
          {delta > 0 ? '▲' : '▼'} {(Math.abs(delta) * 100).toFixed(decimals)} pts vs baseline
        </div>
      )}
      {sub && <div className="text-[11px] text-ink-400 mt-0.5 text-center">{sub}</div>}
    </div>
  );
}

// ───────────── Funnel ─────────────
export function Funnel({ stages, selected, onSelect, times }: {
  stages: { name: string; value: number; fromPrev: number; dropOff: number; fromStart: number }[];
  selected?: number | null; onSelect?: (i: number | null) => void; times?: { seconds: number }[];
}) {
  const colors = ['#3b82f6', '#4f7cf7', '#6366f1', '#7c5cf6', '#8b5cf6', '#22b8d6', '#22d3ee'];
  const max = stages[0]?.value || 1;
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const w = Math.max(0.06, s.value / max);
        const isSel = selected === i;
        return (
          <div key={s.name}>
            {i > 0 && (
              <div className="flex items-center justify-center gap-3 text-[10.5px] py-0.5 text-ink-400">
                <span className="text-rose-300/90">▼ {fmtPct(s.dropOff)} drop-off</span>
                <span>·</span>
                <span className="text-emerald-300/90">{fmtPct(s.fromPrev)} continue</span>
                {times?.[i - 1] && <><span>·</span><span>⏱ {fmtDuration(times[i - 1].seconds)}</span></>}
              </div>
            )}
            <button onClick={() => onSelect?.(isSel ? null : i)} className="w-full group flex items-center gap-3">
              <div className="w-28 sm:w-36 shrink-0 text-left">
                <div className={cx('text-xs font-medium transition-colors', isSel ? 'text-white' : 'text-ink-200 group-hover:text-white')}>{i + 1}. {s.name}</div>
              </div>
              <div className="flex-1 flex justify-center">
                <motion.div
                  className={cx('h-9 rounded-lg relative flex items-center justify-center border transition-shadow', isSel ? 'border-white/60 shadow-glow' : 'border-white/10 group-hover:border-white/30')}
                  initial={{ width: 0 }} animate={{ width: `${w * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: `linear-gradient(90deg, ${colors[i]}cc, ${colors[i]}66)` }}>
                  <span className={cx('text-[11px] font-mono text-white font-medium px-2 whitespace-nowrap', w < 0.16 && 'absolute left-full ml-1')}>{fmtCompact(s.value)}</span>
                </motion.div>
              </div>
              <div className="w-14 text-right text-[11px] font-mono text-ink-300 shrink-0">{fmtPct(s.fromStart, s.fromStart < 0.1 ? 2 : 1)}</div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ───────────── KPI card ─────────────
export function KpiCard({ label, value, delta, invert, spark, color = '#22d3ee', active, onClick, icon, hint, index = 0 }: {
  label: string; value: string; delta: number | null; invert?: boolean; spark: number[]; color?: string; active?: boolean; onClick?: () => void; icon: ReactNode; hint?: string; index?: number;
}) {
  const data = spark.map((v, i) => ({ i, v }));
  const id = `sp-${label.replace(/\W/g, '')}`;
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }} onClick={onClick} title={hint}
      className={cx('glass rounded-2xl p-4 text-left relative overflow-hidden group transition-all min-w-0',
        active ? 'ring-1 ring-cyan-300/50 shadow-glow' : 'hover:border-white/15')}>
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: color }} />
      <div className="flex items-center justify-between relative">
        <span className="text-[11.5px] text-ink-300 font-medium truncate pr-2">{label}</span>
        <span className="h-7 w-7 rounded-lg grid place-items-center bg-white/[0.04] border border-white/5 shrink-0" style={{ color }}>{icon}</span>
      </div>
      <div className="font-display text-[26px] font-semibold text-white mt-1.5 tabular-nums tracking-tight relative">{value}</div>
      <div className="flex items-end justify-between gap-2 relative mt-1">
        <Delta value={delta} invert={invert} size="xs" />
        <div className="h-9 w-12 sm:w-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {active && <motion.div layoutId="kpi-active" className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300" />}
    </motion.button>
  );
}

// ───────────── Ranking bars ─────────────
export function RankBars({ items, format, color = 'linear-gradient(90deg,#3b82f6,#22d3ee)', onClick, selected, secondary }: {
  items: { label: string; value: number; key?: string; color?: string }[]; format: (v: number) => string; color?: string;
  onClick?: (key: string) => void; selected?: string | null; secondary?: (i: number) => ReactNode;
}) {
  const max = Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => {
        const k = it.key ?? it.label;
        return (
          <button key={k} onClick={() => onClick?.(k)} className={cx('w-full text-left group', !onClick && 'cursor-default')}>
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className={cx('truncate transition-colors', selected === k ? 'text-cyan-200 font-medium' : 'text-ink-200 group-hover:text-white')}>
                <span className="text-ink-500 font-mono mr-2">{String(i + 1).padStart(2, '0')}</span>{it.label}
              </span>
              <span className="font-mono text-ink-100 tabular-nums shrink-0">{format(it.value)}{secondary && <span className="text-ink-400 ml-2">{secondary(i)}</span>}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(it.value / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.03 }}
                style={{ background: it.color ?? color, opacity: selected && selected !== k ? 0.4 : 1 }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
