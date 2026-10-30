import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SankeyData, SankeyNode } from '../data/engine';
import { fmtCompact, fmtPct } from '../lib/format';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface LaidNode extends SankeyNode { x: number; y: number; h: number; v: number; inV: number; outV: number; }
interface LaidLink { id: string; source: LaidNode; target: LaidNode; value: number; w: number; sy: number; ty: number; }

/**
 * Lightweight layered Sankey (no external deps). Nodes are placed by column,
 * ribbons are cubic Bézier bands. Hovering a node traces every upstream and
 * downstream flow; clicking a node reports it to the parent for drill-down.
 */
export function Sankey({
  data, height = 440, minWidth = 760, selected, onSelect, valueLabel = 'sessions', labelWidth = 160,
}: {
  data: SankeyData; height?: number; minWidth?: number; selected?: string | null; onSelect?: (n: SankeyNode | null) => void;
  valueLabel?: string; labelWidth?: number;
}) {
  const [wrapRef, wrapW] = useWidth<HTMLDivElement>();
  const width = Math.max(minWidth, wrapW);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverLink, setHoverLink] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; html: React.ReactNode } | null>(null);

  const layout = useMemo(() => {
    const top = 26, bottom = 8, nodeW = 12, pad = 12;
    const cols = Math.max(...data.nodes.map((n) => n.column)) + 1;
    const innerW = width - labelWidth - 4;
    const colX = (c: number) => (cols === 1 ? 0 : (c * (innerW - nodeW)) / (cols - 1));
    const inV: Record<string, number> = {}, outV: Record<string, number> = {};
    for (const l of data.links) { outV[l.source] = (outV[l.source] ?? 0) + l.value; inV[l.target] = (inV[l.target] ?? 0) + l.value; }
    const nodes: LaidNode[] = data.nodes
      .map((n) => ({ ...n, x: colX(n.column), y: 0, h: 0, inV: inV[n.id] ?? 0, outV: outV[n.id] ?? 0, v: Math.max(inV[n.id] ?? 0, outV[n.id] ?? 0) }))
      .filter((n) => n.v > 0);
    const byCol: LaidNode[][] = Array.from({ length: cols }, () => []);
    nodes.forEach((n) => byCol[n.column].push(n));
    const H = height - top - bottom;
    const k = Math.min(...byCol.filter((c) => c.length).map((c) => (H - (c.length - 1) * pad) / c.reduce((s, n) => s + n.v, 0)));
    byCol.forEach((col) => {
      const total = col.reduce((s, n) => s + n.v * k, 0) + (col.length - 1) * pad;
      let y = top + (H - total) / 2;
      col.forEach((n) => { n.y = y; n.h = Math.max(1.5, n.v * k); y += n.h + pad; });
    });
    const map = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links: LaidLink[] = data.links
      .filter((l) => map[l.source] && map[l.target])
      .map((l) => ({ id: `${l.source}→${l.target}`, source: map[l.source], target: map[l.target], value: l.value, w: Math.max(0.8, l.value * k), sy: 0, ty: 0 }));
    // order ribbons by the vertical position of the opposite end to minimise crossings
    const so: Record<string, number> = {}, to: Record<string, number> = {};
    [...links].sort((a, b) => a.target.y - b.target.y).forEach((l) => { l.sy = l.source.y + (so[l.source.id] ?? 0); so[l.source.id] = (so[l.source.id] ?? 0) + l.w; });
    [...links].sort((a, b) => a.source.y - b.source.y).forEach((l) => { l.ty = l.target.y + (to[l.target.id] ?? 0); to[l.target.id] = (to[l.target.id] ?? 0) + l.w; });
    const colTotals = byCol.map((c) => c.reduce((s, n) => s + n.v, 0));
    return { nodes, links, nodeW, cols, colX, colTotals };
  }, [data, width, height, labelWidth]);

  // highlight set: trace upstream and downstream of the active node
  const active = hoverNode ?? selected ?? null;
  const lit = useMemo(() => {
    if (hoverLink) return new Set([hoverLink]);
    if (!active) return null;
    const set = new Set<string>();
    const down = (id: string) => layout.links.forEach((l) => { if (l.source.id === id && !set.has(l.id)) { set.add(l.id); down(l.target.id); } });
    const up = (id: string) => layout.links.forEach((l) => { if (l.target.id === id && !set.has(l.id)) { set.add(l.id); up(l.source.id); } });
    down(active); up(active);
    return set;
  }, [active, hoverLink, layout.links]);
  const litNodes = useMemo(() => {
    if (!lit) return null;
    const s = new Set<string>();
    layout.links.forEach((l) => { if (lit.has(l.id)) { s.add(l.source.id); s.add(l.target.id); } });
    if (active) s.add(active);
    return s;
  }, [lit, layout.links, active]);

  const ribbon = (l: LaidLink) => {
    const x0 = l.source.x + layout.nodeW, x1 = l.target.x;
    const xm = (x0 + x1) / 2;
    return `M${x0},${l.sy} C${xm},${l.sy} ${xm},${l.ty} ${x1},${l.ty} L${x1},${l.ty + l.w} C${xm},${l.ty + l.w} ${xm},${l.sy + l.w} ${x0},${l.sy + l.w} Z`;
  };

  const showTip = (e: React.MouseEvent, html: React.ReactNode) => {
    const r = wrapRef.current!.getBoundingClientRect();
    setTip({ x: e.clientX - r.left + wrapRef.current!.scrollLeft, y: e.clientY - r.top, html });
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-auto thin-scroll" onMouseLeave={() => { setHoverNode(null); setHoverLink(null); setTip(null); }}>
      <svg width={width} height={height} className="block select-none">
        <defs>
          {layout.links.map((l, i) => (
            <linearGradient key={i} id={`sk-${i}`} gradientUnits="userSpaceOnUse" x1={l.source.x} x2={l.target.x}>
              <stop offset="0%" stopColor={l.source.color} />
              <stop offset="100%" stopColor={l.target.color} />
            </linearGradient>
          ))}
        </defs>
        {data.columns.map((c, i) => i < layout.cols && (
          <text key={c} x={layout.colX(i)} y={12} textAnchor="start"
            className="fill-ink-400 text-[10px] uppercase tracking-[0.14em] font-medium">{c}</text>
        ))}
        <g>
          {layout.links.map((l, i) => {
            const on = !lit || lit.has(l.id);
            const drop = l.target.meta === 'dropoff';
            return (
              <motion.path key={l.id} d={ribbon(l)} fill={`url(#sk-${i})`}
                initial={{ opacity: 0 }} animate={{ opacity: on ? (drop ? 0.22 : 0.42) : 0.05 }}
                transition={{ duration: 0.5, delay: lit ? 0 : 0.05 * l.source.column }}
                className="cursor-pointer"
                onMouseEnter={(e) => { setHoverLink(l.id); showTip(e, (
                  <>
                    <div className="text-ink-300 text-[11px]">{l.source.name} → {l.target.name}</div>
                    <div className="font-mono text-white text-sm">{fmtCompact(l.value)} <span className="text-ink-400 text-[11px]">{valueLabel}</span></div>
                    <div className="text-[11px] text-cyan-200">{fmtPct(l.value / (l.source.outV || 1))} of {l.source.name}</div>
                  </>
                )); }}
                onMouseMove={(e) => tip && showTip(e, tip.html)}
                onMouseLeave={() => { setHoverLink(null); setTip(null); }}
              />
            );
          })}
        </g>
        <g>
          {layout.nodes.map((n) => {
            const on = !litNodes || litNodes.has(n.id);
                        const share = n.v / (layout.colTotals[n.column] || 1);
            const isSel = selected === n.id;
            return (
              <g key={n.id} className="cursor-pointer" opacity={on ? 1 : 0.3}
                onMouseEnter={(e) => { setHoverNode(n.id); showTip(e, (
                  <>
                    <div className="text-white text-sm font-medium">{n.name}</div>
                    <div className="font-mono text-cyan-200 text-sm">{fmtCompact(n.v)} <span className="text-ink-400 text-[11px]">{valueLabel}</span></div>
                    <div className="text-[11px] text-ink-300">{fmtPct(share)} of {data.columns[n.column]?.toLowerCase()}</div>
                    {n.inV > 0 && n.outV > 0 && <div className="text-[11px] text-amber-200">{fmtPct(1 - n.outV / n.inV)} drop-off here</div>}
                    <div className="text-[10px] text-ink-400 mt-1">Click to pin path</div>
                  </>
                )); }}
                onMouseLeave={() => { setHoverNode(null); setTip(null); }}
                onClick={() => onSelect?.(selected === n.id ? null : n)}>
                <motion.rect x={n.x} width={layout.nodeW} rx={3} fill={n.color}
                  initial={{ y: n.y, height: 0 }} animate={{ y: n.y, height: n.h }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  stroke={isSel ? '#fff' : 'rgba(255,255,255,0.15)'} strokeWidth={isSel ? 1.5 : 0.5}
                  style={{ filter: isSel ? `drop-shadow(0 0 8px ${n.color})` : undefined }} />
                {(n.h >= 9 || n.meta === 'goal' || n.meta === 'dropoff' || n.column >= layout.cols - 2) && (
                  <text x={n.x + layout.nodeW + 6} y={n.y + n.h / 2} dy="0.35em" textAnchor="start"
                    className="text-[11px] font-medium sankey-label" fill={n.meta === 'dropoff' ? '#94a3b8' : '#e2e8f0'}>
                    {n.name}
                    <tspan className="fill-ink-400 font-normal" dx={5}>{fmtCompact(n.v)}</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {tip && (
        <div className="pointer-events-none absolute z-20 rounded-xl bg-ink-900/95 border border-white/10 px-3 py-2 shadow-2xl backdrop-blur-xl"
          style={{ left: Math.min(tip.x + 14, width - 220), top: Math.max(0, tip.y - 10) }}>
          {tip.html}
        </div>
      )}
    </div>
  );
}
