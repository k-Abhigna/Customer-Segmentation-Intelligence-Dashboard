import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts';
import { Heart, TrendingDown, TrendingUp } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Card, ChartTooltip, DataTable, ExportButton, SectionHeader, axisProps, cx, gridProps } from '../components/ui';
import { RankBars } from '../components/viz';
import { categoryPreferences, contentEngagement, dayparts, featurePreferences, keywordPreferences, topContent } from '../data/engine';
import { CATEGORIES, DEVICES } from '../data/dimensions';
import { fmtCompact, fmtDuration, fmtPct } from '../lib/format';

interface TreeCellProps { x?: number; y?: number; width?: number; height?: number; name?: string; color?: string; depth?: number; value?: number; parent?: string; }
function TreeCell(props: TreeCellProps & { selected: string; total: number }) {
  const { x = 0, y = 0, width = 0, height = 0, name, color = '#3b82f6', depth, value = 0, parent, selected, total } = props;
  if (depth !== 2) return null;
  const dim = selected !== 'all' && selected !== parent;
  return (
    <g style={{ cursor: 'pointer' }}>
      <rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} rx={8} fill={color} fillOpacity={dim ? 0.12 : 0.55} stroke="#0a0e1a" strokeWidth={2} />
      {width > 64 && height > 34 && (
        <>
          <text x={x + 9} y={y + 18} fill="#fff" fontSize={11.5} fontWeight={600} opacity={dim ? 0.4 : 1}>{name}</text>
          <text x={x + 9} y={y + 32} fill="#dde2ef" fontSize={10} opacity={dim ? 0.3 : 0.75}>{fmtPct(value / (total || 1))}{width > 110 ? ` · ${parent}` : ''}</text>
        </>
      )}
    </g>
  );
}

export default function Preferences() {
  const { agg } = useDashboard();
  const [cat, setCat] = useState<string>('all');

  const cats = useMemo(() => categoryPreferences(agg), [agg]);
  const content = useMemo(() => contentEngagement(agg), [agg]);
  const keywords = useMemo(() => keywordPreferences(agg, cat), [agg, cat]);
  const features = useMemo(() => featurePreferences(agg), [agg]);
  const parts = useMemo(() => dayparts(agg), [agg]);
  const engaging = useMemo(() => topContent(agg, cat), [agg, cat]);
  const tree = cats.map((c) => ({ name: c.name, children: c.children.map((s) => ({ ...s, value: Math.max(1, s.value) })) }));
  const treeTotal = cats.reduce((s, c) => s + c.views, 0);
  const devPref = DEVICES.map((d) => ({ name: d.name, color: d.color, share: agg.byDev[d.id].sessions / (agg.total.sessions || 1), cvr: agg.byDev[d.id].conversions / (agg.byDev[d.id].sessions || 1), dur: agg.byDev[d.id].duration / (agg.byDev[d.id].sessions || 1) }));
  const catName = cat === 'all' ? 'All categories' : CATEGORIES.find((c) => c.id === cat)?.name;

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="What visitors like" title="Preference Intelligence" icon={<Heart size={20} />}
        description="Aggregated preferences across categories, content, search and features. Filter by category to focus keyword and content insights." />

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCat('all')} className={cx('h-8 rounded-full px-3 text-xs border', cat === 'all' ? 'bg-white/10 border-white/25 text-white' : 'border-white/10 text-ink-300 hover:text-white')}>All categories</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(cat === c.id ? 'all' : c.id)} className={cx('h-8 rounded-full px-3 text-xs border inline-flex items-center gap-1.5', cat === c.id ? 'bg-white/10 border-white/25 text-white' : 'border-white/10 text-ink-300 hover:text-white')}>
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" title="Popular product categories" subtitle="Treemap of product-view share by category and subcategory · click to focus"
          actions={<ExportButton filename="category_preferences" rows={() => cats.flatMap((c) => c.children.map((s) => ({ category: c.name, subcategory: s.name, product_views: Math.round(s.value), category_share: c.share, category_cvr: c.conversionRate })))} />}>
          <div className="h-[340px]">
            <ResponsiveContainer>
              <Treemap data={tree} dataKey="value" aspectRatio={1.6} isAnimationActive animationDuration={500}
                content={<TreeCell selected={cat === 'all' ? 'all' : (CATEGORIES.find((c) => c.id === cat)?.name ?? 'all')} total={treeTotal} />}
                onClick={(n: { parent?: string; name?: string }) => { const p = CATEGORIES.find((c) => c.name === (n.parent ?? n.name)); if (p) setCat(cat === p.id ? 'all' : p.id); }}>
                <Tooltip content={<ChartTooltip formatter={(v) => `${fmtCompact(v)} views`} />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Category ranking" subtitle="Share of product views and conversion rate">
          <RankBars items={cats.map((c) => ({ label: c.name, value: c.share, key: c.id, color: c.color }))} format={(v) => fmtPct(v)} onClick={(k) => setCat(cat === k ? 'all' : k)} selected={cat === 'all' ? null : cat}
            secondary={(i) => `CVR ${fmtPct(cats[i].conversionRate, 1)}`} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Preferred content types" subtitle="Share of content consumption"
          actions={<ExportButton filename="content_types" rows={() => content.map((c) => ({ content_type: c.name, share: c.share, completion: c.completion }))} />}>
          <div className="h-[190px] relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={content} dataKey="share" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                  {content.map((c) => <Cell key={c.id} fill={c.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => fmtPct(v)} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
              <div><div className="font-display text-white text-lg">{fmtPct(content.reduce((s, c) => s + c.completion * c.share, 0), 0)}</div><div className="text-[10px] text-ink-400">avg completion</div></div>
            </div>
          </div>
          <div className="space-y-1 mt-2">
            {[...content].sort((a, b) => b.share - a.share).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-[11.5px]"><span className="flex items-center gap-1.5 text-ink-200"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span><span className="font-mono text-ink-100">{fmtPct(c.share)}</span></div>
            ))}
          </div>
        </Card>

        <Card title="Frequently searched keywords" subtitle={`${catName} · trend vs prior period`}
          actions={<ExportButton filename={`keywords_${cat}`} rows={() => keywords.map((k) => ({ keyword: k.term, category: k.category, searches: Math.round(k.searches), trend: k.trend }))} />}>
          <div className="space-y-2 max-h-[340px] overflow-y-auto thin-scroll pr-1">
            {keywords.length === 0 && <div className="text-sm text-ink-400 py-6 text-center">No tracked keywords for this category.</div>}
            {keywords.slice(0, 12).map((k, i) => (
              <div key={k.term} className="flex items-center gap-3">
                <span className="text-ink-500 font-mono text-[11px] w-5">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1"><span className="text-ink-100 truncate">{k.term}</span><span className="font-mono text-ink-200">{fmtCompact(k.searches)}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-pink-400" style={{ width: `${(k.searches / (keywords[0]?.searches || 1)) * 100}%` }} /></div>
                </div>
                <span className={cx('inline-flex items-center gap-0.5 text-[10.5px] font-mono w-14 justify-end', k.trend >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                  {k.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{fmtPct(Math.abs(k.trend), 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Popular features" subtitle="Share of sessions using each feature · conversion lift for users"
          actions={<ExportButton filename="feature_usage" rows={() => features.map((f) => ({ feature: f.name, usage: f.usage, conversion_lift: f.cvrLift }))} />}>
          <RankBars items={features.map((f) => ({ label: f.name, value: f.usage }))} format={(v) => fmtPct(v)} color="linear-gradient(90deg,#10b981,#22d3ee)"
            secondary={(i) => <span className="text-emerald-300">{features[i].cvrLift.toFixed(1)}×</span>} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Device preferences" subtitle="Session share, conversion rate and session length by device">
          <div className="grid grid-cols-3 gap-3">
            {devPref.map((d) => (
              <div key={d.name} className="rounded-xl bg-white/[0.025] border border-white/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-200"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</div>
                <div className="font-display text-xl text-white mt-1">{fmtPct(d.share, 0)}</div>
                <div className="text-[10.5px] text-ink-400">of sessions</div>
                <div className="mt-2 text-[11px] flex justify-between"><span className="text-ink-400">CVR</span><span className="font-mono text-emerald-300">{fmtPct(d.cvr, 2)}</span></div>
                <div className="text-[11px] flex justify-between"><span className="text-ink-400">Session</span><span className="font-mono text-ink-100">{fmtDuration(d.dur)}</span></div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-[130px]">
            <ResponsiveContainer>
              <BarChart data={devPref} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtPct(v, 1)} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtPct(v, 2)} />} />
                <Bar dataKey="cvr" name="Conversion rate" radius={[6, 6, 0, 0]} barSize={38}>{devPref.map((d) => <Cell key={d.name} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Preferred browsing times" subtitle="Share of sessions by part of day"
          actions={<ExportButton filename="browsing_times" rows={() => parts.map((p) => ({ daypart: p.name, hours: p.range, share: p.value }))} />}>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={parts} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs><linearGradient id="gDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} /></linearGradient></defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} tick={{ fill: '#8792b0', fontSize: 10.5 }} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtPct(v, 0)} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtPct(v)} labelFormatter={(l, p) => `${l} (${p?.range})`} />} />
                <Bar dataKey="value" name="Share of sessions" fill="url(#gDay)" radius={[8, 8, 0, 0]} barSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Most engaging content" subtitle={`${catName} · engagement score blends completion, engaged time and assisted conversions`}
        actions={<ExportButton filename="engaging_content" rows={() => engaging.map((c) => ({ title: c.title, type: c.type, category: c.category, views: Math.round(c.views), engaged_seconds: c.engaged, completion: c.completion, assisted_conversion_rate: c.assist, score: c.score }))} />}>
        <DataTable rows={engaging} rowKey={(r) => r.title} searchKeys={(r) => r.title + ' ' + r.type} placeholder="Search content…" initialSort={{ key: 'score', dir: 'desc' }} maxHeight={380}
          columns={[
            { key: 'title', header: 'Content', sortValue: (r) => r.title, render: (r) => <span className="text-ink-100">{r.title}</span>, className: 'max-w-[320px] truncate' },
            { key: 'type', header: 'Type', sortValue: (r) => r.type, render: (r) => <span className="text-ink-300">{r.type}</span> },
            { key: 'views', header: 'Views', align: 'right', sortValue: (r) => r.views, render: (r) => fmtCompact(r.views) },
            { key: 'time', header: 'Engaged time', align: 'right', sortValue: (r) => r.engaged, render: (r) => fmtDuration(r.engaged) },
            { key: 'comp', header: 'Completion', align: 'right', sortValue: (r) => r.completion, render: (r) => fmtPct(r.completion, 0) },
            { key: 'assist', header: 'Assist CVR', align: 'right', sortValue: (r) => r.assist, render: (r) => fmtPct(r.assist, 0) },
            { key: 'score', header: 'Score', align: 'right', sortValue: (r) => r.score, render: (r) => <span className="inline-flex items-center justify-end gap-2"><span className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden"><span className="block h-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${r.score}%` }} /></span><span className="font-mono">{r.score}</span></span> },
          ]} />
      </Card>
    </div>
  );
}
