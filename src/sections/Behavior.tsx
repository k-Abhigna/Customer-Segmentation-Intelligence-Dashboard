import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, MousePointerClick } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Card, ChartTooltip, DataTable, ExportButton, Legend, MiniStat, SectionHeader, Segmented, axisProps, cx, gridProps } from '../components/ui';
import { Heatmap, RankBars, VIOLET_SCALE } from '../components/viz';
import { clickPatterns, contentEngagement, engagementFunnel, eventHourHeatmap, navigationStats, pageBreakdown, pageColor, sessionFrequencyByDay, type PageRow } from '../data/engine';
import { fmtCompact, fmtDuration, fmtInt, fmtPct } from '../lib/format';

type RankMetric = 'pageviews' | 'avgTime' | 'scrollDepth' | 'exitRate';
const RANK: Record<RankMetric, { label: string; fmt: (v: number) => string }> = {
  pageviews: { label: 'Page views', fmt: fmtCompact },
  avgTime: { label: 'Avg time on page', fmt: fmtDuration },
  scrollDepth: { label: 'Scroll depth', fmt: (v) => fmtPct(v, 0) },
  exitRate: { label: 'Exit rate', fmt: (v) => fmtPct(v) },
};

const EVENT_SERIES = [
  { key: 'pageviews', name: 'Page views', color: '#3b82f6' },
  { key: 'clicks', name: 'Clicks', color: '#8b5cf6' },
  { key: 'scrolls', name: 'Scroll events', color: '#22d3ee' },
  { key: 'productViews', name: 'Product views', color: '#10b981' },
  { key: 'searches', name: 'Searches', color: '#f59e0b' },
] as const;

export default function Behavior() {
  const { agg, daily } = useDashboard();
  const [rank, setRank] = useState<RankMetric>('pageviews');
  const [selPage, setSelPage] = useState<string | null>(null);
  const [series, setSeries] = useState<string[]>(EVENT_SERIES.map((s) => s.key));

  const pages = useMemo(() => pageBreakdown(agg), [agg]);
  const nav = useMemo(() => navigationStats(agg), [agg]);
  const evHeat = useMemo(() => eventHourHeatmap(agg), [agg]);
  const funnel = useMemo(() => engagementFunnel(agg.total), [agg]);
  const clicks = useMemo(() => clickPatterns(agg), [agg]);
  const content = useMemo(() => contentEngagement(agg), [agg]);
  const freq = useMemo(() => sessionFrequencyByDay(agg), [agg]);

  const ranked = [...pages].sort((a, b) => b[rank] - a[rank]);
  const exits = [...pages].sort((a, b) => b.exits - a.exits).slice(0, 8);
  const sel = pages.find((p) => p.id === selPage);
  const maxTime = Math.max(...content.map((c) => c.avgTime));
  const radar = content.map((c) => ({ name: c.name.replace(' & ', ' & '), Completion: c.completion * 100, 'Time index': (c.avgTime / maxTime) * 100, 'Share index': c.share * 400 }));

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="What visitors do" title="Behavior Analytics" icon={<Activity size={20} />}
        description="Page-level engagement, interaction patterns and session activity computed from aggregated page-view, click and scroll events." />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MiniStat label="Avg navigation depth" value={`${nav.avgDepth.toFixed(2)} pages`} />
        <MiniStat label="Interactions / session" value={nav.interactionsPerSession.toFixed(1)} accent="#a78bfa" />
        <MiniStat label="Avg scroll depth" value={fmtPct(nav.avgScrollDepth, 0)} accent="#22d3ee" />
        <MiniStat label="Back-navigation rate" value={fmtPct(nav.backNavRate)} accent="#f472b6" />
        <MiniStat label="Menu-led navigation" value={fmtPct(nav.menuNavShare)} accent="#60a5fa" />
        <MiniStat label="Search-led navigation" value={fmtPct(nav.searchNavShare)} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-3" title="Page ranking" subtitle="Horizontal ranking · click a bar to inspect the page"
          actions={<><Segmented size="xs" value={rank} onChange={setRank} options={(Object.keys(RANK) as RankMetric[]).map((k) => ({ value: k, label: RANK[k].label }))} />
            <ExportButton filename={`page_ranking_${rank}`} rows={() => ranked.map((p) => ({ page: p.name, path: p.path, [rank]: p[rank] }))} /></>}>
          <div className="h-[380px]">
            <ResponsiveContainer>
              <BarChart data={ranked} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} tickFormatter={RANK[rank].fmt} />
                <YAxis type="category" dataKey="name" {...axisProps} width={128} interval={0} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={RANK[rank].fmt} />} />
                <Bar dataKey={rank} name={RANK[rank].label} radius={[0, 6, 6, 0]} barSize={18} onClick={(d: { id?: string }) => setSelPage(d.id ?? null)} className="cursor-pointer" animationDuration={600}>
                  {ranked.map((p) => <Cell key={p.id} fill={pageColor(p.id)} opacity={selPage && selPage !== p.id ? 0.35 : 0.9} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2" title={sel ? sel.name : 'Page drill-down'} subtitle={sel ? <span className="font-mono">{sel.path}</span> : 'Select a page in the ranking or table to inspect it.'}>
          {sel ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat label="Page views" value={fmtCompact(sel.pageviews)} sub={`${fmtPct(sel.share)} of all views`} />
                <MiniStat label="Avg time on page" value={fmtDuration(sel.avgTime)} accent="#a78bfa" />
                <MiniStat label="Scroll depth" value={fmtPct(sel.scrollDepth, 0)} accent="#22d3ee" />
                <MiniStat label="Clicks / view" value={sel.clicksPerView.toFixed(2)} accent="#60a5fa" />
                <MiniStat label="Entries" value={fmtCompact(sel.entries)} accent="#34d399" />
                <MiniStat label="Exit rate" value={fmtPct(sel.exitRate)} accent="#f472b6" />
              </div>
              <div>
                <div className="text-[11px] text-ink-400 mb-1.5">Engagement vs site average</div>
                {[
                  { k: 'Time', v: sel.avgTime / (pages.reduce((s, p) => s + p.avgTime * p.share, 0) || 1) },
                  { k: 'Scroll', v: sel.scrollDepth / (pages.reduce((s, p) => s + p.scrollDepth * p.share, 0) || 1) },
                  { k: 'Clicks', v: sel.clicksPerView / (pages.reduce((s, p) => s + p.clicksPerView * p.share, 0) || 1) },
                ].map((x) => (
                  <div key={x.k} className="flex items-center gap-2 text-[11px] mb-1.5">
                    <span className="w-12 text-ink-300">{x.k}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30" />
                      <div className={cx('absolute top-0 bottom-0', x.v >= 1 ? 'left-1/2 bg-emerald-400/80' : 'right-1/2 bg-rose-400/80')} style={{ width: `${Math.min(50, Math.abs(x.v - 1) * 50)}%` }} />
                    </div>
                    <span className={cx('w-12 text-right font-mono', x.v >= 1 ? 'text-emerald-300' : 'text-rose-300')}>{x.v >= 1 ? '+' : ''}{((x.v - 1) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setSelPage(null)} className="text-[11px] text-cyan-300 hover:text-cyan-200">Clear selection</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] text-ink-400">Top exit pages (where sessions end)</div>
              <RankBars items={exits.map((p) => ({ label: p.name, value: p.exits, key: p.id, color: 'linear-gradient(90deg,#f472b6,#fb7185)' }))} format={fmtCompact} onClick={setSelPage}
                secondary={(i) => fmtPct(exits[i].exitRate, 0)} />
            </div>
          )}
        </Card>
      </div>

      <Card title="Behavioral activity heatmap" subtitle="Average daily event volume by hour — each row scaled to its own peak to reveal timing patterns"
        actions={<ExportButton filename="event_hour_heatmap" rows={() => evHeat.flatMap((r) => r.values.map((v, h) => ({ event_type: r.row, hour: h, avg_events: Math.round(v) })))} />}>
        <Heatmap rows={evHeat} colLabels={Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`)} format={(v) => `${fmtInt(v)} events/day`} normalizeRows stops={VIOLET_SCALE} rowLabelW={96} cellH={22} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Engagement funnel" subtitle="From session start to add-to-cart"
          actions={<ExportButton filename="engagement_funnel" rows={() => funnel.map((f) => ({ step: f.name, sessions: Math.round(f.value), rate_from_start: f.rate, rate_from_previous: f.step }))} />}>
          <div className="space-y-2.5">
            {funnel.map((f, i) => (
              <div key={f.name} className="group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-200 group-hover:text-white">{f.name}</span>
                  <span className="font-mono text-ink-100">{fmtCompact(f.value)} <span className="text-ink-400">· {fmtPct(f.rate)}</span>{i > 0 && <span className="text-rose-300/80 ml-2">−{fmtPct(1 - f.step, 0)}</span>}</span>
                </div>
                <div className="h-6 rounded-lg bg-white/[0.03] overflow-hidden">
                  <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${f.rate * 100}%`, background: `linear-gradient(90deg, rgba(59,130,246,${0.9 - i * 0.08}), rgba(34,211,238,${0.75 - i * 0.07}))` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Click interaction patterns" subtitle="Clicks by UI element type and their click-through rate" icon={<MousePointerClick size={15} />}
          actions={<ExportButton filename="click_patterns" rows={() => clicks.map((c) => ({ element: c.name, clicks: Math.round(c.clicks), share: c.share, ctr: c.ctr }))} />}>
          <div className="h-[290px]">
            <ResponsiveContainer>
              <BarChart data={clicks} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: '#8792b0', fontSize: 9.5 }} angle={-20} textAnchor="end" height={52} />
                <YAxis {...axisProps} tickFormatter={fmtCompact} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={fmtCompact} labelFormatter={(l, p) => `${l} · CTR ${fmtPct(Number(p?.ctr ?? 0), 0)}`} />} />
                <Bar dataKey="clicks" name="Clicks" radius={[6, 6, 0, 0]} barSize={26}>
                  {clicks.map((c, i) => <Cell key={c.name} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa', '#22d3ee', '#2dd4bf', '#60a5fa', '#64748b'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="xl:col-span-3" title="Session activity timeline" subtitle="Daily interaction events — toggle series in the legend"
          actions={<ExportButton filename="session_activity_timeline" rows={() => daily.map((d) => ({ date: d.date, page_views: d.pageviews, clicks: d.clicks, scrolls: d.scrolls, product_views: d.productViews, searches: d.searches }))} />}>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {EVENT_SERIES.map((s) => {
              const on = series.includes(s.key);
              return (
                <button key={s.key} onClick={() => setSeries((x) => (on ? x.filter((k) => k !== s.key) : [...x, s.key]))}
                  className={cx('h-7 inline-flex items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors', on ? 'border-white/15 bg-white/[0.06] text-white' : 'border-white/5 text-ink-400')}>
                  <span className="h-2 w-2 rounded-full" style={{ background: on ? s.color : '#3a4663' }} />{s.name}
                </button>
              );
            })}
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ top: 4, right: 8, left: -6, bottom: 0 }}>
                <defs>
                  {EVENT_SERIES.map((s) => (
                    <linearGradient key={s.key} id={`ev-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity={0.45} /><stop offset="100%" stopColor={s.color} stopOpacity={0.02} /></linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} minTickGap={28} />
                <YAxis {...axisProps} width={50} tickFormatter={fmtCompact} />
                <Tooltip content={<ChartTooltip formatter={fmtInt} />} />
                {EVENT_SERIES.filter((s) => series.includes(s.key)).map((s) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stackId="ev" stroke={s.color} fill={`url(#ev-${s.key})`} strokeWidth={1.5} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2" title="Content engagement" subtitle="Completion, time and share by content type (index)"
          actions={<ExportButton filename="content_engagement" rows={() => content.map((c) => ({ content_type: c.name, share: c.share, completion: c.completion, avg_seconds: c.avgTime }))} />}>
          <div className="h-[290px]">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: '#8792b0', fontSize: 9.5 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar name="Completion %" dataKey="Completion" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.22} />
                <Radar name="Time index" dataKey="Time index" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.18} />
                <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(0)} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ name: 'Completion %', color: '#22d3ee' }, { name: 'Time index', color: '#8b5cf6' }]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" title="Page interaction breakdown" subtitle="Searchable, sortable page metrics · click a row to drill down">
          <DataTable<PageRow>
            rows={pages} rowKey={(r) => r.id} selectedKey={selPage} onRowClick={(r) => setSelPage(r.id)} searchKeys={(r) => r.name + ' ' + r.path} placeholder="Search pages…"
            initialSort={{ key: 'pv', dir: 'desc' }} maxHeight={360}
            columns={[
              { key: 'name', header: 'Page', sortValue: (r) => r.name, render: (r) => <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: pageColor(r.id) }} /><span>{r.name}</span><span className="text-ink-500 font-mono text-[11px]">{r.path}</span></span> },
              { key: 'pv', header: 'Views', align: 'right', sortValue: (r) => r.pageviews, render: (r) => fmtCompact(r.pageviews) },
              { key: 'time', header: 'Avg time', align: 'right', sortValue: (r) => r.avgTime, render: (r) => fmtDuration(r.avgTime) },
              { key: 'scroll', header: 'Scroll', align: 'right', sortValue: (r) => r.scrollDepth, render: (r) => fmtPct(r.scrollDepth, 0) },
              { key: 'cpv', header: 'Clicks/view', align: 'right', sortValue: (r) => r.clicksPerView, render: (r) => r.clicksPerView.toFixed(2) },
              { key: 'exit', header: 'Exit rate', align: 'right', sortValue: (r) => r.exitRate, render: (r) => <span className={r.exitRate > 0.3 ? 'text-rose-300' : 'text-ink-100'}>{fmtPct(r.exitRate)}</span> },
            ]}
          />
          <div className="mt-3 flex justify-end"><ExportButton filename="page_interactions" label="Export table" rows={() => pages.map((p) => ({ page: p.name, path: p.path, views: Math.round(p.pageviews), avg_time_s: p.avgTime, scroll_depth: p.scrollDepth, clicks_per_view: p.clicksPerView, exit_rate: p.exitRate }))} /></div>
        </Card>
        <Card title="Session frequency" subtitle="Sessions per visitor-day over time"
          actions={<ExportButton filename="session_frequency" rows={() => freq.map((f) => ({ date: f.label, sessions_per_visitor: f.value }))} />}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <LineChart data={freq} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} minTickGap={28} />
                <YAxis {...axisProps} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip content={<ChartTooltip formatter={(v) => v.toFixed(3)} />} />
                <Line type="monotone" dataKey="value" name="Sessions / visitor" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
