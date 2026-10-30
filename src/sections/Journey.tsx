import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ChevronRight, Clock, Route, TrendingDown, Target } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Badge, Card, ChartTooltip, ExportButton, Legend, MiniStat, SectionHeader, Segmented, axisProps, cx, gridProps } from '../components/ui';
import { Funnel, RankBars } from '../components/viz';
import { Sankey } from '../components/Sankey';
import { funnel, journeyPaths, journeySankey, stageTimes, STAGES, type Agg, type SankeyNode } from '../data/engine';
import { DEVICES, SEGMENTS } from '../data/dimensions';
import { fmtCompact, fmtDuration, fmtPct } from '../lib/format';

const STAGE_KEYS: (keyof Agg)[] = ['sessions', 'landed', 'explored', 'interested', 'addToCart', 'checkouts', 'conversions'];

export default function Journey() {
  const { agg } = useDashboard();
  const [node, setNode] = useState<SankeyNode | null>(null);
  const [stage, setStage] = useState<number | null>(4);
  const [compareBy, setCompareBy] = useState<'device' | 'segment'>('device');

  const sankey = useMemo(() => journeySankey(agg), [agg]);
  const stages = useMemo(() => funnel(agg.total), [agg]);
  const times = useMemo(() => stageTimes(agg), [agg]);
  const paths = useMemo(() => journeyPaths(agg, 8), [agg]);
  const total = agg.total.sessions || 1;
  const completion = agg.total.conversions / total;
  const timeToConvert = times.reduce((s, t) => s + t.seconds, 0);
  const worst = stages.slice(1).reduce((w, s) => (s.dropOff > w.dropOff ? s : w), stages[1]);

  const nodeDetail = useMemo(() => {
    if (!node) return null;
    const inflow = sankey.links.filter((l) => l.target === node.id);
    const outflow = sankey.links.filter((l) => l.source === node.id);
    const v = Math.max(inflow.reduce((s, l) => s + l.value, 0), outflow.reduce((s, l) => s + l.value, 0));
    const name = (id: string) => sankey.nodes.find((n) => n.id === id)?.name ?? id;
    return {
      v, share: v / total,
      inflow: inflow.sort((a, b) => b.value - a.value).map((l) => ({ label: name(l.source), value: l.value, color: sankey.nodes.find((n) => n.id === l.source)?.color })),
      outflow: outflow.sort((a, b) => b.value - a.value).map((l) => ({ label: name(l.target), value: l.value, color: sankey.nodes.find((n) => n.id === l.target)?.color })),
    };
  }, [node, sankey, total]);

  const compare = useMemo(() => {
    if (stage == null || stage === 0) return [];
    const k = STAGE_KEYS[stage], kp = STAGE_KEYS[stage - 1];
    if (compareBy === 'device') return DEVICES.map((d) => ({ name: d.name, color: d.color, rate: (agg.byDev[d.id][k] as number) / ((agg.byDev[d.id][kp] as number) || 1), n: agg.byDev[d.id][kp] as number })).filter((x) => x.n > 0);
    return SEGMENTS.map((s) => ({ name: s.short, color: s.color, rate: (agg.bySeg[s.id][k] as number) / ((agg.bySeg[s.id][kp] as number) || 1), n: agg.bySeg[s.id][kp] as number })).filter((x) => x.n > 0);
  }, [agg, stage, compareBy]);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Centerpiece" title="Customer Journey Analysis" icon={<Route size={20} />}
        description="An interactive map of how aggregated sessions flow from discovery to conversion — where they continue, where they drop, and how long each step takes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Journey completion rate" value={fmtPct(completion, 2)} sub="sessions reaching conversion" accent="#4ade80" />
        <MiniStat label="Avg time to convert" value={fmtDuration(timeToConvert)} sub="sum of stage-to-stage times" accent="#a78bfa" />
        <MiniStat label="Largest drop-off" value={worst.name} sub={`${fmtPct(worst.dropOff)} lost entering this stage`} accent="#fb7185" />
        <MiniStat label="Cart → order abandonment" value={fmtPct(1 - agg.total.conversions / (agg.total.addToCart || 1))} accent="#f59e0b" />
      </div>

      <Card title="Interactive journey map" icon={<Route size={15} />} badge={<Badge tone="cyan">Sankey · click any node</Badge>}
        subtitle="Traffic source → landing → engagement → cart → checkout → outcome. Hover to trace every flow through a node; click to pin and inspect."
        actions={<ExportButton filename="journey_sankey_links" rows={() => sankey.links.map((l) => ({ source: sankey.nodes.find((n) => n.id === l.source)?.name, target: sankey.nodes.find((n) => n.id === l.target)?.name, sessions: Math.round(l.value) }))} />}>
        <div className="grid grid-cols-1 2xl:grid-cols-[1fr_300px] gap-5">
          <Sankey data={sankey} height={520} selected={node?.id ?? null} onSelect={setNode} minWidth={820} />
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 min-h-[200px]">
            {node && nodeDetail ? (
              <motion.div key={node.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{sankey.columns[node.column]}</div>
                  <div className="flex items-center gap-2 mt-1"><span className="h-3 w-3 rounded" style={{ background: node.color }} /><span className="font-display text-lg text-white font-semibold">{node.name}</span></div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <MiniStat label="Sessions" value={fmtCompact(nodeDetail.v)} />
                    <MiniStat label="Share of all" value={fmtPct(nodeDetail.share)} accent="#22d3ee" />
                  </div>
                </div>
                {nodeDetail.inflow.length > 0 && (
                  <div><div className="text-[11px] text-ink-400 mb-2">Arrives from</div>
                    <RankBars items={nodeDetail.inflow.slice(0, 5).map((x) => ({ label: x.label, value: x.value, color: x.color }))} format={fmtCompact} /></div>
                )}
                {nodeDetail.outflow.length > 0 && (
                  <div><div className="text-[11px] text-ink-400 mb-2">Continues to</div>
                    <RankBars items={nodeDetail.outflow.slice(0, 5).map((x) => ({ label: x.label, value: x.value, color: x.color }))} format={fmtCompact}
                      secondary={(i) => fmtPct(nodeDetail.outflow[i].value / (nodeDetail.v || 1), 0)} /></div>
                )}
                <button onClick={() => setNode(null)} className="text-[11px] text-cyan-300 hover:text-cyan-200">Clear selection</button>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col justify-center text-center gap-2 py-6">
                <Target size={22} className="mx-auto text-cyan-300/70" />
                <div className="text-sm text-ink-200">Select a node</div>
                <div className="text-[11.5px] text-ink-400 leading-relaxed">Click a traffic source, landing type or outcome to see its inflows, outflows and share of all sessions.</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-3" title="Journey funnel" subtitle="7 stages with stage-to-stage conversion, drop-off and average time. Click a stage to compare it."
          actions={<ExportButton filename="journey_funnel" rows={() => stages.map((s, i) => ({ stage: s.name, sessions: Math.round(s.value), conversion_from_previous: s.fromPrev, drop_off: s.dropOff, from_start: s.fromStart, avg_seconds_from_previous: i ? times[i - 1].seconds : 0 }))} />}>
          <Funnel stages={stages} selected={stage} onSelect={setStage} times={times} />
        </Card>
        <Card className="xl:col-span-2" title={stage ? `Stage: ${STAGES[stage]}` : 'Stage comparison'}
          subtitle={stage ? `Conversion from “${STAGES[stage - 1]}” by ${compareBy}` : 'Select a funnel stage to compare conversion across audiences'}
          actions={<Segmented size="xs" value={compareBy} onChange={setCompareBy} options={[{ value: 'device', label: 'Device' }, { value: 'segment', label: 'Segment' }]} />}>
          {stage ? (
            <>
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={compare} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} horizontal={false} vertical />
                    <XAxis type="number" {...axisProps} domain={[0, 1]} tickFormatter={(v) => fmtPct(v, 0)} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={78} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtPct(v)} />} />
                    <Bar dataKey="rate" name="Stage conversion" radius={[0, 6, 6, 0]} barSize={16}>
                      {compare.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11px] text-ink-400 mt-2">Site-wide: <span className="text-white font-mono">{fmtPct(stages[stage].fromPrev)}</span> · drop-off <span className="text-rose-300 font-mono">{fmtPct(stages[stage].dropOff)}</span></div>
            </>
          ) : <div className="text-sm text-ink-400 py-16 text-center">Click a stage (2–7) in the funnel.</div>}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Average time between stages" icon={<Clock size={15} />} subtitle="Average aggregate time from one stage to the next (stage numbers match the funnel)"
          actions={<ExportButton filename="time_between_stages" rows={() => times.map((t) => ({ from: t.from, to: t.to, avg_seconds: t.seconds }))} />}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={times.map((t) => ({ ...t, label: `${STAGES.indexOf(t.from as (typeof STAGES)[number]) + 1} → ${STAGES.indexOf(t.to as (typeof STAGES)[number]) + 1}` }))} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <defs><linearGradient id="gTime" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} /></linearGradient></defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval={0} tick={{ fill: '#8792b0', fontSize: 9.5 }} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtDuration(v)} width={64} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtDuration(v)} labelFormatter={(_, p) => `${p?.from} → ${p?.to}`} />} />
                <Bar dataKey="seconds" name="Avg time" fill="url(#gTime)" radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Most common journey paths" icon={<TrendingDown size={15} />} subtitle="Source → landing → outcome, ranked by sessions"
          actions={<ExportButton filename="journey_paths" rows={() => paths.map((p) => ({ path: p.path.join(' > '), sessions: Math.round(p.sessions), share: p.share, conversions: Math.round(p.conversions), conversion_rate: p.conversionRate }))} />}>
          <div className="space-y-2">
            {paths.map((p, i) => (
              <div key={i} className={cx('rounded-xl border px-3 py-2', p.completed ? 'border-emerald-400/15 bg-emerald-400/[0.04]' : 'border-white/5 bg-white/[0.02]')}>
                <div className="flex items-center flex-wrap gap-0.5 text-[11.5px] text-ink-100">
                  {p.path.map((s, j) => (
                    <span key={j} className="inline-flex items-center">
                      {j > 0 && <ChevronRight size={12} className="text-ink-500 mx-0.5" />}
                      <span className={cx(s === 'Conversion' && 'text-emerald-300 font-medium', s === 'Exit' && 'text-rose-300')}>{s}</span>
                    </span>
                  ))}
                  {p.completed && <CheckCircle2 size={12} className="text-emerald-300 ml-1" />}
                </div>
                <div className="flex justify-between text-[10.5px] mt-1">
                  <span className="text-ink-400">{fmtCompact(p.sessions)} sessions · {fmtPct(p.share, 1)}</span>
                  {p.completed && <span className="font-mono text-emerald-300">{fmtPct(p.conversionRate, 1)} convert · {fmtCompact(p.conversions)}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3"><Legend items={[{ name: 'Completed journey', color: '#4ade80' }, { name: 'Exited before product', color: '#64748b' }]} /></div>
        </Card>
      </div>
    </div>
  );
}
