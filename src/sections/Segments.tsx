import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Fingerprint, Lightbulb, ShieldCheck, X } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Badge, Card, ChartTooltip, DataTable, ExportButton, MiniStat, SectionHeader, axisProps, cx, gridProps } from '../components/ui';
import { RankBars } from '../components/viz';
import { aggregate, categoryPreferences, channelBreakdown, funnel, metricsForAggregation, NEXT_BEST_CONTENT, pageBreakdown, pageColor, segmentMetrics, suppressed } from '../data/engine';
import { DEVICES, SEGMENTS, SEGMENT_MAP, K_ANON, type SegmentId } from '../data/dimensions';
import { fmtCompact, fmtCurrency, fmtDuration, fmtPct } from '../lib/format';

export default function Segments() {
  const { agg, filters, focusSegment, setFocusSegment, metrics } = useDashboard();

  const rows = useMemo(() => SEGMENTS.map((s) => {
    const m = segmentMetrics(agg, s.id);
    const included = filters.segments.length === 0 || filters.segments.includes(s.id);
    return { seg: s, m, included, retention: s.retention, sizeShare: 0 };
  }), [agg, filters.segments]);
  const totalU = rows.reduce((s, r) => s + r.m.uniqueVisitors, 0) || 1;
  rows.forEach((r) => (r.sizeShare = r.m.uniqueVisitors / totalU));

  const bubble = rows.filter((r) => r.included && r.m.sessions > 0).map((r) => ({ name: r.seg.name, x: r.m.engagementScore, y: r.m.conversionRate * 100, z: r.m.uniqueVisitors, color: r.seg.color, id: r.seg.id }));

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Who behaves alike" title="Customer Segmentation" icon={<Fingerprint size={20} />}
        description="Anonymized visitors are grouped automatically by deterministic behavioral rules. Only cohort-level aggregates are shown — no individual can be identified or inspected."
        right={<Badge tone="emerald"><ShieldCheck size={11} /> Cohorts &lt; {K_ANON} suppressed</Badge>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {rows.map((r, i) => {
          const active = focusSegment === r.seg.id;
          return (
            <motion.button key={r.seg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: r.included ? 1 : 0.45, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }}
              onClick={() => setFocusSegment(active ? null : r.seg.id)} disabled={!r.included}
              className={cx('glass rounded-2xl p-4 text-left relative overflow-hidden group', active ? 'ring-1 ring-white/40 shadow-glow' : 'hover:border-white/15')}>
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ background: r.seg.color }} />
              <div className="flex items-center justify-between relative">
                <span className="flex items-center gap-2 text-[13px] font-medium text-white"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.seg.color, boxShadow: `0 0 10px ${r.seg.color}` }} />{r.seg.name}</span>
                <span className="text-[10.5px] font-mono text-ink-400">{r.included ? fmtPct(r.sizeShare, 1) : 'filtered'}</span>
              </div>
              <div className="font-display text-2xl font-semibold text-white mt-2 tabular-nums relative">{r.included ? (suppressed(r.m.uniqueVisitors) ? '<50' : fmtCompact(r.m.uniqueVisitors)) : '—'}</div>
              <div className="text-[10.5px] text-ink-400 relative">est. unique visitors</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-[11px] relative">
                <span className="text-ink-400">Engagement</span><span className="text-right font-mono text-white">{r.m.engagementScore.toFixed(1)}</span>
                <span className="text-ink-400">Avg session</span><span className="text-right font-mono text-white">{fmtDuration(r.m.avgSessionDuration)}</span>
                <span className="text-ink-400">Conversion</span><span className="text-right font-mono text-emerald-300">{fmtPct(r.m.conversionRate, 2)}</span>
                <span className="text-ink-400">Retention 30d</span><span className="text-right font-mono text-cyan-200">{fmtPct(r.retention, 0)}</span>
              </div>
              <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden relative"><div className="h-full rounded-full" style={{ width: `${r.m.engagementScore}%`, background: r.seg.color }} /></div>
            </motion.button>
          );
        })}
        <div className="glass rounded-2xl p-4 flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-400">How segmentation works</div>
          <p className="text-[12px] text-ink-200 mt-2 leading-relaxed">Each anonymized, consented session history is assigned to exactly one segment by priority-ordered rules (e.g. <span className="text-white">High Intent</span> before <span className="text-white">Returning</span>). Click any card to inspect its aggregated behavior.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {focusSegment && <SegmentInspector key={focusSegment} seg={focusSegment} onClose={() => setFocusSegment(null)} />}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-2" title="Segment landscape" subtitle="Engagement score vs conversion rate · bubble size = segment size · click a bubble">
          <div className="h-[320px]">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid {...gridProps} vertical />
                <XAxis type="number" dataKey="x" name="Engagement" {...axisProps} domain={[0, 100]} label={{ value: 'Engagement score', position: 'insideBottom', offset: -4, fill: '#5b6788', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="CVR" {...axisProps} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <ZAxis type="number" dataKey="z" range={[120, 2400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }}
                  content={({ active, payload }) => active && payload?.[0] ? (
                    <div className="rounded-xl bg-ink-900/95 border border-white/10 px-3 py-2 text-xs">
                      <div className="text-white font-medium">{String(payload[0].payload.name)}</div>
                      <div className="text-ink-300">Engagement {Number(payload[0].payload.x).toFixed(1)} · CVR {Number(payload[0].payload.y).toFixed(2)}%</div>
                      <div className="text-ink-400">{fmtCompact(Number(payload[0].payload.z))} visitors</div>
                    </div>
                  ) : null} />
                <Scatter data={bubble} onClick={(d: { id?: SegmentId }) => d.id && setFocusSegment(d.id)} className="cursor-pointer">
                  {bubble.map((b) => <Cell key={b.id} fill={b.color} fillOpacity={focusSegment && focusSegment !== b.id ? 0.25 : 0.75} stroke={b.color} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="xl:col-span-3" title="Segment comparison" subtitle={`Sortable · site average engagement ${metrics.engagementScore.toFixed(1)}, CVR ${fmtPct(metrics.conversionRate, 2)}`}
          actions={<ExportButton filename="segment_comparison" rows={() => rows.filter((r) => r.included).map((r) => ({ segment: r.seg.name, rule: r.seg.rule, est_unique_visitors: Math.round(r.m.uniqueVisitors), share: r.sizeShare, engagement_score: r.m.engagementScore, avg_session_seconds: r.m.avgSessionDuration, conversion_rate: r.m.conversionRate, retention_rate: r.retention }))} />}>
          <DataTable
            rows={rows.filter((r) => r.included)} rowKey={(r) => r.seg.id} selectedKey={focusSegment} onRowClick={(r) => setFocusSegment(r.seg.id)}
            searchKeys={(r) => r.seg.name + ' ' + r.seg.rule} placeholder="Search segments or rules…" initialSort={{ key: 'size', dir: 'desc' }} maxHeight={330}
            columns={[
              { key: 'name', header: 'Segment', sortValue: (r) => r.seg.name, render: (r) => <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: r.seg.color }} />{r.seg.name}</span> },
              { key: 'size', header: 'Size', align: 'right', sortValue: (r) => r.m.uniqueVisitors, render: (r) => <span>{fmtCompact(r.m.uniqueVisitors)} <span className="text-ink-500">{fmtPct(r.sizeShare, 0)}</span></span> },
              { key: 'eng', header: 'Engagement', align: 'right', sortValue: (r) => r.m.engagementScore, render: (r) => r.m.engagementScore.toFixed(1) },
              { key: 'dur', header: 'Avg session', align: 'right', sortValue: (r) => r.m.avgSessionDuration, render: (r) => fmtDuration(r.m.avgSessionDuration) },
              { key: 'cvr', header: 'CVR', align: 'right', sortValue: (r) => r.m.conversionRate, render: (r) => <span className="text-emerald-300">{fmtPct(r.m.conversionRate, 2)}</span> },
              { key: 'ret', header: 'Retention', align: 'right', sortValue: (r) => r.retention, render: (r) => fmtPct(r.retention, 0) },
            ]}
          />
        </Card>
      </div>
    </div>
  );

}

function SegmentInspector({ seg, onClose }: { seg: SegmentId; onClose: () => void }) {
  const { cells, filters, metrics } = useDashboard();
  const s = SEGMENT_MAP[seg];
  const sAgg = useMemo(() => aggregate(cells, { ...filters, segments: [seg] }), [cells, filters, seg]);
  const m = metricsForAggregation(sAgg);
  const ch = channelBreakdown(sAgg).sort((a, b) => b.sessions - a.sessions);
  const cats = categoryPreferences(sAgg).slice(0, 5);
  const topPages = pageBreakdown(sAgg).sort((a, b) => b.pageviews - a.pageviews).slice(0, 5);
  const fun = funnel(sAgg.total);
  const nbc = NEXT_BEST_CONTENT[seg];
  const trend = sAgg.byDay.map((a, i) => ({ i, visitors: a.visitors }));
  const norm = (v: number, base: number) => Math.min(150, (v / (base || 1)) * 100);
  const radar = [
    { k: 'Engagement', seg: norm(m.engagementScore, metrics.engagementScore), avg: 100 },
    { k: 'Duration', seg: norm(m.avgSessionDuration, metrics.avgSessionDuration), avg: 100 },
    { k: 'Depth', seg: norm(m.pagesPerSession, metrics.pagesPerSession), avg: 100 },
    { k: 'Conversion', seg: norm(m.conversionRate, metrics.conversionRate), avg: 100 },
    { k: 'Returning', seg: norm(m.returningRate, metrics.returningRate), avg: 100 },
    { k: 'Scroll', seg: norm(m.scrollDepth, metrics.scrollDepth), avg: 100 },
  ];
  const tooSmall = sAgg.total.visitors < K_ANON;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
      <div className="glass rounded-2xl p-5 relative overflow-hidden" style={{ boxShadow: `0 0 0 1px ${s.color}44, 0 20px 60px -20px ${s.color}55` }}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-3 w-3 rounded-full" style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }} />
              <h2 className="font-display text-xl text-white font-semibold">{s.name}</h2>
              <Badge>Segment inspector</Badge>
              <Badge tone="emerald"><ShieldCheck size={10} /> Aggregated over {fmtCompact(m.uniqueVisitors)} visitors</Badge>
            </div>
            <p className="text-xs text-ink-300 mt-1">{s.description}</p>
            <p className="text-[11px] font-mono text-cyan-200/80 mt-1">Rule: {s.rule}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton filename={`segment_${seg}_profile`} rows={() => [{ segment: s.name, est_unique_visitors: Math.round(m.uniqueVisitors), sessions: m.sessions, engagement_score: m.engagementScore, avg_session_seconds: m.avgSessionDuration, pages_per_session: m.pagesPerSession, bounce_rate: m.bounceRate, conversion_rate: m.conversionRate, retention_rate: s.retention, revenue: m.revenue }]} />
            <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 text-ink-300 hover:text-white" aria-label="Close inspector"><X size={15} /></button>
          </div>
        </div>
        {tooSmall ? (
          <div className="py-10 text-center text-sm text-ink-400">This cohort is below the k-anonymity threshold ({K_ANON}) for the current filters, so details are suppressed.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat label="Sessions" value={fmtCompact(m.sessions)} />
                <MiniStat label="Engagement" value={m.engagementScore.toFixed(1)} accent={s.color} />
                <MiniStat label="Avg session" value={fmtDuration(m.avgSessionDuration)} />
                <MiniStat label="Pages / session" value={m.pagesPerSession.toFixed(2)} />
                <MiniStat label="Conversion" value={fmtPct(m.conversionRate, 2)} accent="#34d399" />
                <MiniStat label="Revenue (agg.)" value={fmtCurrency(m.revenue)} />
              </div>
              <div className="h-[90px]">
                <ResponsiveContainer>
                  <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="segTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity={0.5} /><stop offset="100%" stopColor={s.color} stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="visitors" stroke={s.color} fill="url(#segTrend)" strokeWidth={1.8} isAnimationActive={false} />
                    <Tooltip content={<ChartTooltip formatter={fmtCompact} labelFormatter={() => 'Daily visitor-days'} />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-400 mb-1">Behavior profile vs site average (=100)</div>
              <div className="h-[250px]">
                <ResponsiveContainer>
                  <RadarChart data={radar} outerRadius="75%">
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="k" tick={{ fill: '#8792b0', fontSize: 10.5 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 150]} />
                    <Radar name="Site average" dataKey="avg" stroke="#5b6788" fill="#5b6788" fillOpacity={0.12} strokeDasharray="4 4" />
                    <Radar name={s.short} dataKey="seg" stroke={s.color} fill={s.color} fillOpacity={0.3} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(0)} idx`} />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[11px] text-ink-400 mb-1.5">Device mix</div>
                <div className="flex h-2.5 rounded-full overflow-hidden">
                  {DEVICES.map((d) => <div key={d.id} style={{ width: `${(sAgg.byDev[d.id].sessions / (sAgg.total.sessions || 1)) * 100}%`, background: d.color }} title={d.name} />)}
                </div>
                <div className="flex justify-between text-[10.5px] text-ink-300 mt-1">
                  {DEVICES.map((d) => <span key={d.id}>{d.name} {fmtPct(sAgg.byDev[d.id].sessions / (sAgg.total.sessions || 1), 0)}</span>)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-ink-400 mb-1.5">Top traffic sources</div>
                <RankBars items={ch.slice(0, 3).map((c) => ({ label: c.name, value: c.share, color: c.color }))} format={(v) => fmtPct(v, 0)} />
              </div>
              <div>
                <div className="text-[11px] text-ink-400 mb-1.5">Top categories</div>
                <div className="flex flex-wrap gap-1.5">{cats.map((c) => <span key={c.id} className="rounded-full px-2 py-0.5 text-[11px] border border-white/10" style={{ color: c.color }}>{c.name} {fmtPct(c.share, 0)}</span>)}</div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="text-[11px] text-ink-400 mb-2">Journey conversion (stage → stage)</div>
              <div className="grid grid-cols-7 gap-1.5">
                {fun.map((f, i) => (
                  <div key={f.name} className="text-center">
                    <div className="h-16 rounded-lg bg-white/[0.03] flex items-end overflow-hidden"><div className="w-full rounded-lg" style={{ height: `${Math.max(4, f.fromStart * 100)}%`, background: s.color, opacity: 0.4 + i * 0.08 }} /></div>
                    <div className="text-[9.5px] text-ink-400 mt-1 leading-tight h-6">{f.name}</div>
                    <div className="font-mono text-[10.5px] text-white">{i === 0 ? '100%' : fmtPct(f.fromPrev, 0)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topPages.map((p) => <span key={p.id} className="rounded-md px-2 py-0.5 text-[11px] text-ink-100" style={{ background: pageColor(p.id) + '22' }}>{p.name} · {fmtPct(p.share, 0)}</span>)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-300/15 bg-amber-400/[0.05] p-3.5">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-medium"><Lightbulb size={13} /> Next-best action (rule-based)</div>
              <div className="text-[13px] text-white mt-1.5">{nbc.content}</div>
              <div className="text-[11px] text-ink-300 mt-1">Signal: {nbc.signal}</div>
              <div className="text-[11px] text-ink-300">Channel: {nbc.channel}</div>
              <div className="text-[11px] text-ink-400 mt-1.5 italic">{nbc.rationale}</div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
