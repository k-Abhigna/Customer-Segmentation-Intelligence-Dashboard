import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, Clock, Eye, Gauge as GaugeIcon, LayoutDashboard, LogOut, MousePointerClick, Repeat, Target, Users } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Card, ChartTooltip, ExportButton, Legend, SectionHeader, Segmented, SyntheticBadge, axisProps, gridProps, Badge } from '../components/ui';
import { Heatmap, KpiCard } from '../components/viz';
import { Sankey } from '../components/Sankey';
import { channelBreakdown, hourlyHeatmap, journeySankey, type KpiKey, type Metrics } from '../data/engine';
import { DEVICES } from '../data/dimensions';
import { fmtCompact, fmtDelta, fmtDuration, fmtInt, fmtPct } from '../lib/format';

export const KPI_DEFS: { key: KpiKey; label: string; fmt: (v: number) => string; invert?: boolean; icon: JSX.Element; color: string; daily: keyof import('../data/engine').DailyPoint; hint: string }[] = [
  { key: 'uniqueVisitors', label: 'Total Unique Visitors', fmt: fmtCompact, icon: <Users size={14} />, color: '#3b82f6', daily: 'visitors', hint: 'Estimated de-duplicated visitors in period' },
  { key: 'activeUsers', label: 'Active Users · avg/day', fmt: fmtCompact, icon: <Activity size={14} />, color: '#22d3ee', daily: 'activeUsers', hint: 'Average daily visitors with an engaged session' },
  { key: 'avgSessionDuration', label: 'Avg Session Duration', fmt: fmtDuration, icon: <Clock size={14} />, color: '#8b5cf6', daily: 'avgSessionDuration', hint: 'Mean session length' },
  { key: 'pagesPerSession', label: 'Pages per Session', fmt: (v) => v.toFixed(2), icon: <Eye size={14} />, color: '#60a5fa', daily: 'pagesPerSession', hint: 'Page views ÷ sessions' },
  { key: 'bounceRate', label: 'Bounce Rate', fmt: (v) => fmtPct(v), invert: true, icon: <LogOut size={14} />, color: '#f472b6', daily: 'bounceRate', hint: 'Single-interaction sessions ÷ sessions (lower is better)' },
  { key: 'returningRate', label: 'Returning Visitor Rate', fmt: (v) => fmtPct(v), icon: <Repeat size={14} />, color: '#a78bfa', daily: 'returningRate', hint: 'Returning visitor-days ÷ all visitor-days' },
  { key: 'conversionRate', label: 'Conversion Rate', fmt: (v) => fmtPct(v, 2), icon: <Target size={14} />, color: '#10b981', daily: 'conversionRate', hint: 'Conversions ÷ sessions' },
  { key: 'engagementScore', label: 'Engagement Score', fmt: (v) => v.toFixed(1), icon: <GaugeIcon size={14} />, color: '#f59e0b', daily: 'engagementScore', hint: 'Composite 0–100: duration, depth, scroll, bounce, engaged sessions' },
];

export function KpiGrid({ compact = false }: { compact?: boolean }) {
  const { metrics, prevMetrics, daily, trendMetric, setTrendMetric } = useDashboard();
  return (
    <div className={compact ? 'grid grid-cols-2 xl:grid-cols-4 gap-3' : 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'}>
      {KPI_DEFS.map((k, i) => (
        <KpiCard key={k.key} index={i} label={k.label} value={k.fmt(metrics[k.key])} delta={fmtDelta(metrics[k.key], prevMetrics?.[k.key as keyof Metrics])}
          invert={k.invert} icon={k.icon} color={k.color} active={trendMetric === k.key} onClick={() => setTrendMetric(k.key)} hint={`${k.hint} — click to chart`}
          spark={daily.map((d) => Number(d[k.daily]))} />
      ))}
    </div>
  );
}

export default function Overview() {
  const { agg, daily, prevDaily, trendMetric, setSection, toggleDevice, filters } = useDashboard();
  const kdef = KPI_DEFS.find((k) => k.key === trendMetric)!;
  const [mixMode, setMixMode] = useState<'abs' | 'pct'>('abs');

  const trend = useMemo(() => daily.map((d, i) => ({ label: d.label, current: Number(d[kdef.daily]), previous: prevDaily ? Number(prevDaily[i]?.[kdef.daily]) : undefined })), [daily, prevDaily, kdef]);
  const mix = useMemo(() => daily.map((d) => mixMode === 'abs'
    ? { label: d.label, New: d.newVisitors, Returning: d.returningVisitors }
    : { label: d.label, New: d.newVisitors / (d.visitors || 1), Returning: d.returningVisitors / (d.visitors || 1) }), [daily, mixMode]);
  const engagement = useMemo(() => daily.map((d) => ({ label: d.label, score: d.engagementScore, bounce: d.bounceRate * 100, depth: d.pagesPerSession })), [daily]);
  const devices = useMemo(() => DEVICES.map((d) => ({ id: d.id, name: d.name, color: d.color, value: agg.byDev[d.id].sessions })).filter((d) => d.value > 0), [agg]);
  const channels = useMemo(() => channelBreakdown(agg).sort((a, b) => b.sessions - a.sessions), [agg]);
  const heat = useMemo(() => hourlyHeatmap(agg), [agg]);
  const journey = useMemo(() => journeySankey(agg), [agg]);
  const devTotal = devices.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Executive overview" title="Behavior Intelligence Overview" icon={<LayoutDashboard size={20} />}
        description="Aggregated, privacy-safe view of visitor activity, engagement and conversion. Click any KPI to chart it against the previous period."
        right={<SyntheticBadge label="Synthetic, anonymized event aggregates" />} />

      <KpiGrid />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" title={`${kdef.label} over time`} subtitle="Current period (solid) vs previous period (dashed). Select a KPI card above to switch metric." delay={0.05}
          actions={<ExportButton filename={`trend_${kdef.key}`} rows={() => trend.map((t) => ({ date: t.label, current: t.current, previous: t.previous ?? '' }))} />}>
          <div className="h-[280px]">
            <ResponsiveContainer>
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={kdef.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={kdef.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} minTickGap={28} />
                <YAxis {...axisProps} width={56} tickFormatter={(v) => kdef.fmt(v)} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip formatter={(v) => kdef.fmt(v)} />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                <Area type="monotone" dataKey="current" name="Current" stroke={kdef.color} strokeWidth={2.2} fill="url(#trendFill)" animationDuration={700} />
                {prevDaily && <Line type="monotone" dataKey="previous" name="Previous" stroke="#5b6788" strokeDasharray="5 5" strokeWidth={1.5} dot={false} animationDuration={700} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Device distribution" subtitle="Share of sessions · click a slice to filter" delay={0.1}
          actions={<ExportButton filename="device_distribution" rows={() => devices.map((d) => ({ device: d.name, sessions: d.value, share: d.value / devTotal }))} />}>
          <div className="h-[200px] relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={devices} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none" animationDuration={700}
                  onClick={(d: { id?: string }) => d.id && toggleDevice(d.id as never)} className="cursor-pointer">
                  {devices.map((d) => <Cell key={d.id} fill={d.color} opacity={filters.devices.length && !filters.devices.includes(d.id) ? 0.35 : 1} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => `${fmtCompact(v)} · ${fmtPct(v / devTotal)}`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="font-display text-xl font-semibold text-white">{fmtCompact(devTotal)}</div>
                <div className="text-[11px] text-ink-400">sessions</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {devices.map((d) => (
              <button key={d.id} onClick={() => toggleDevice(d.id)} className="rounded-xl bg-white/[0.03] border border-white/5 px-2 py-2 text-center hover:bg-white/[0.06]">
                <div className="text-[11px] text-ink-300 flex items-center justify-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</div>
                <div className="font-mono text-sm text-white mt-0.5">{fmtPct(d.value / devTotal)}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* centerpiece preview */}
      <Card title="Live customer journey map" icon={<MousePointerClick size={15} />}
        subtitle="Every aggregated session from traffic source to outcome. Hover a node to trace its flows; open Journey Analysis for drill-down."
        badge={<Badge tone="cyan">Centerpiece</Badge>} delay={0.12}
        actions={<button onClick={() => setSection('journey')} className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2.5 text-xs text-cyan-100 hover:bg-cyan-400/20">Explore journey <ArrowRight size={13} /></button>}>
        <Sankey data={journey} height={340} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="New vs returning visitors" subtitle="Daily visitor-days by visitor type"
          actions={<><Segmented size="xs" value={mixMode} onChange={setMixMode} options={[{ value: 'abs', label: 'Count' }, { value: 'pct', label: 'Share' }]} />
            <ExportButton filename="new_vs_returning" rows={() => daily.map((d) => ({ date: d.date, new_visitors: d.newVisitors, returning_visitors: d.returningVisitors }))} /></>}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <AreaChart data={mix} margin={{ top: 8, right: 8, left: -6, bottom: 0 }} stackOffset={mixMode === 'pct' ? 'expand' : 'none'}>
                <defs>
                  <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="gRet" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} /></linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} minTickGap={28} />
                <YAxis {...axisProps} width={50} tickFormatter={(v) => (mixMode === 'pct' ? fmtPct(v, 0) : fmtCompact(v))} />
                <Tooltip content={<ChartTooltip formatter={(v) => (mixMode === 'pct' ? fmtPct(v) : fmtInt(v))} />} />
                <Area type="monotone" dataKey="Returning" stackId="1" stroke="#8b5cf6" fill="url(#gRet)" strokeWidth={1.8} />
                <Area type="monotone" dataKey="New" stackId="1" stroke="#22d3ee" fill="url(#gNew)" strokeWidth={1.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ name: 'Returning', color: '#8b5cf6' }, { name: 'New', color: '#22d3ee' }]} />
        </Card>

        <Card title="Engagement trends" subtitle="Engagement score (0–100) vs bounce rate (%)"
          actions={<ExportButton filename="engagement_trend" rows={() => engagement.map((e) => ({ date: e.label, engagement_score: e.score, bounce_rate_pct: e.bounce }))} />}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={engagement} margin={{ top: 8, right: 0, left: -6, bottom: 0 }}>
                <defs><linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} minTickGap={28} />
                <YAxis yAxisId="l" {...axisProps} width={40} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} />
                <YAxis yAxisId="r" orientation="right" {...axisProps} width={40} domain={['auto', 'auto']} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <Tooltip content={<ChartTooltip formatter={(v, n) => (n === 'Bounce rate' ? `${v.toFixed(1)}%` : v.toFixed(1))} />} />
                <Area yAxisId="l" type="monotone" dataKey="score" name="Engagement score" stroke="#f59e0b" fill="url(#gEng)" strokeWidth={2} />
                <Line yAxisId="r" type="monotone" dataKey="bounce" name="Bounce rate" stroke="#f472b6" strokeWidth={1.6} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ name: 'Engagement score', color: '#f59e0b' }, { name: 'Bounce rate', color: '#f472b6' }]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-2" title="Traffic source distribution" subtitle="Modeled channel share of sessions with conversion rate"
          actions={<ExportButton filename="traffic_sources" rows={() => channels.map((c) => ({ channel: c.name, sessions: Math.round(c.sessions), share: c.share, conversion_rate: c.conversionRate, avg_session_seconds: c.avgDuration }))} />}>
          <div className="h-[250px]">
            <ResponsiveContainer>
              <BarChart data={channels} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} tickFormatter={fmtCompact} />
                <YAxis type="category" dataKey="name" {...axisProps} width={98} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtCompact(v)} labelFormatter={(l, p) => `${l} · CVR ${fmtPct(Number(p?.conversionRate ?? 0), 2)} · ${fmtDuration(Number(p?.avgDuration ?? 0))}`} />} />
                <Bar dataKey="sessions" name="Sessions" radius={[0, 6, 6, 0]} barSize={16} animationDuration={700}>
                  {channels.map((c) => <Cell key={c.id} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="xl:col-span-3" title="Hourly activity heatmap" subtitle="Average sessions by weekday and hour (local time, aggregated)"
          actions={<ExportButton filename="hourly_heatmap" rows={() => heat.flatMap((r) => r.values.map((v, h) => ({ weekday: r.row, hour: h, avg_sessions: Math.round(v) })))} />}>
          <Heatmap rows={heat} colLabels={Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`)} format={(v) => `${fmtInt(v)} sessions`} rowLabelW={40} cellH={24} />
        </Card>
      </div>
    </div>
  );
}
