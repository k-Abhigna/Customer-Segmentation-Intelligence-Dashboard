import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Globe2, ShieldCheck, Users } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Badge, Card, ChartTooltip, ExportButton, InfoTip, Legend, MiniStat, SectionHeader, Segmented, axisProps, cx, gridProps } from '../components/ui';
import { RankBars, scale } from '../components/viz';
import { ageDistribution, browserBreakdown, engagementCategories, estimateUniques, frequencyDistribution, suppressed } from '../data/engine';
import { DEVICES, REGIONS, SEGMENTS, type SegmentId } from '../data/dimensions';
import { fmtCompact, fmtInt, fmtPct } from '../lib/format';

export default function Audience() {
  const { agg, filters, toggleSegment, toggleRegion, setSegments, metrics } = useDashboard();
  const [crossBy, setCrossBy] = useState<'region' | 'device'>('region');

  const age = useMemo(() => ageDistribution(agg), [agg]);
  const freq = useMemo(() => frequencyDistribution(agg), [agg]);
  const engCats = useMemo(() => engagementCategories(agg), [agg]);
  const browsers = useMemo(() => browserBreakdown(agg), [agg]);
  const uniques = estimateUniques(agg);
  const regions = useMemo(() => REGIONS.map((r) => {
    const a = agg.byReg[r.id];
    return { ...r, visitors: a.visitors, sessions: a.sessions, cvr: a.sessions ? a.conversions / a.sessions : 0, share: a.visitors / (agg.total.visitors || 1), mobile: a.sessions ? (agg.byRegDev[r.id + '|mobile']?.sessions ?? 0) / a.sessions : 0 };
  }), [agg]);
  const nvr = [
    { name: 'New', value: agg.total.newVisitors, color: '#22d3ee' },
    { name: 'Returning', value: agg.total.visitors - agg.total.newVisitors, color: '#8b5cf6' },
  ];
  const segRows = SEGMENTS.map((s) => ({ ...s, visitors: agg.bySeg[s.id].visitors, newV: agg.bySeg[s.id].newVisitors }));

  const cross = useMemo(() => {
    const cols = crossBy === 'region' ? REGIONS.map((r) => ({ id: r.id, name: r.short })) : DEVICES.map((d) => ({ id: d.id, name: d.name }));
    const rows = SEGMENTS.map((s) => ({
      seg: s, values: cols.map((c) => {
        if (crossBy === 'region') return agg.byRegSeg[c.id + '|' + s.id]?.visitors ?? 0;
        return agg.bySegDev[s.id + '|' + c.id]?.visitors ?? 0;
      }),
    }));
    const max = Math.max(...rows.flatMap((r) => r.values), 1);
    return { cols, rows, max };
  }, [agg, crossBy]);

  const isOn = (s: SegmentId) => filters.segments.length === 0 || filters.segments.includes(s);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Who visits" title="Audience Intelligence" icon={<Users size={20} />}
        description="Aggregated audience groups. Demographics come only from a self-declared, opt-in panel; locations are regional, never city- or IP-level." />

      <Card title="Explore audience segments" subtitle="Toggle segments to focus every chart on this page (and across the dashboard)." delay={0}>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSegments([])} className={cx('h-8 rounded-full px-3 text-xs border transition-colors', filters.segments.length === 0 ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-ink-300 hover:text-white')}>All audiences</button>
          {segRows.map((s) => (
            <button key={s.id} onClick={() => toggleSegment(s.id)}
              className={cx('h-8 rounded-full pl-2 pr-3 text-xs border transition-all inline-flex items-center gap-2',
                filters.segments.includes(s.id) ? 'text-white border-white/25 bg-white/10' : 'border-white/10 text-ink-300 hover:text-white')}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, opacity: isOn(s.id) ? 1 : 0.35 }} />
              {s.name}
              <span className="font-mono text-[10.5px] text-ink-400">{fmtCompact(s.visitors)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MiniStat label="Est. unique visitors" value={fmtCompact(uniques)} sub="de-duplicated, period" />
          <MiniStat label="New visitor share" value={fmtPct(1 - metrics.returningRate)} sub="of visitor-days" accent="#22d3ee" />
          <MiniStat label="Visits per visitor" value={(agg.total.visitors / (uniques || 1)).toFixed(2)} sub="visitor-days ÷ uniques" accent="#a78bfa" />
          <MiniStat label="Consented panel" value={fmtCompact(age.panelSize)} sub="self-declared demographics" accent="#34d399" />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card title="Age-range distribution" badge={<Badge tone="emerald"><ShieldCheck size={10} /> Consented panel only</Badge>}
          subtitle={`Self-declared by ${fmtCompact(age.panelSize)} opted-in visitors (${fmtPct(0.36, 0)} consent rate). Never inferred.`}
          actions={<ExportButton filename="age_distribution_consented" rows={() => age.rows.map((r) => ({ age_band: r.band, share: r.share, panel_count: Math.round(r.count) }))} />}>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <BarChart data={age.rows} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <defs><linearGradient id="gAge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} /></linearGradient></defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="band" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtPct(v, 0)} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtPct(v)} />} />
                <Bar dataKey="share" name="Share of panel" fill="url(#gAge)" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2" title="Geographic distribution" icon={<Globe2 size={15} />} subtitle="Regional aggregates only · click a region to filter"
          actions={<ExportButton filename="regions" rows={() => regions.map((r) => ({ region: r.name, visitors: r.visitors, share: r.share, conversion_rate: r.cvr, mobile_share: r.mobile }))} />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {regions.map((r) => {
              const on = filters.regions.includes(r.id);
              const tiny = suppressed(r.visitors);
              return (
                <button key={r.id} onClick={() => toggleRegion(r.id)}
                  className={cx('relative rounded-xl border p-3 text-left overflow-hidden transition-all hover:-translate-y-0.5', on ? 'border-cyan-300/40 bg-cyan-400/10' : 'border-white/5 bg-white/[0.025] hover:border-white/15')}>
                  <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: r.color, opacity: 0.7 }} />
                  <div className="text-[10.5px] font-mono text-ink-400">{r.short}</div>
                  <div className="text-[12.5px] text-white font-medium leading-tight mt-0.5 h-8">{r.name}</div>
                  <div className="font-display text-lg text-white mt-1 tabular-nums">{tiny ? '<50' : fmtCompact(r.visitors)}</div>
                  <div className="text-[10.5px] text-ink-400">{fmtPct(r.share)} of visitors</div>
                  <div className="mt-2 flex justify-between text-[10.5px]"><span className="text-ink-400">CVR</span><span className="text-emerald-300 font-mono">{fmtPct(r.cvr, 2)}</span></div>
                  <div className="flex justify-between text-[10.5px]"><span className="text-ink-400">Mobile</span><span className="text-cyan-200 font-mono">{fmtPct(r.mobile, 0)}</span></div>
                </button>
              );
            })}
          </div>
          <div className="h-[130px] mt-4">
            <ResponsiveContainer>
              <BarChart data={regions} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="short" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={fmtCompact} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtInt(v)} />} />
                <Bar dataKey="visitors" name="Visitor-days" radius={[5, 5, 0, 0]} barSize={34} onClick={(d: { id?: string }) => d.id && toggleRegion(d.id as never)} className="cursor-pointer">
                  {regions.map((r) => <Cell key={r.id} fill={r.color} opacity={filters.regions.length && !filters.regions.includes(r.id) ? 0.35 : 0.9} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Device & browser preferences" subtitle="Share of sessions by browser family"
          actions={<ExportButton filename="browsers" rows={() => browsers.map((b) => ({ browser: b.name, sessions: Math.round(b.sessions), share: b.share }))} />}>
          <RankBars items={browsers.map((b) => ({ label: b.name, value: b.share }))} format={(v) => fmtPct(v)} color="linear-gradient(90deg,#8b5cf6,#22d3ee)" />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {DEVICES.map((d) => (
              <div key={d.id} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
                <div className="text-[10.5px] text-ink-400">{d.name}</div>
                <div className="font-mono text-sm text-white">{fmtPct(agg.byDev[d.id].sessions / (agg.total.sessions || 1), 0)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="New vs returning audience" subtitle="Visitor-day mix and per-segment new share"
          actions={<ExportButton filename="new_vs_returning_by_segment" rows={() => segRows.map((s) => ({ segment: s.name, visitors: s.visitors, new_share: s.visitors ? s.newV / s.visitors : 0 }))} />}>
          <div className="flex items-center gap-4">
            <div className="h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={nvr} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={3} stroke="none">
                    {nvr.map((n) => <Cell key={n.name} fill={n.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => fmtInt(v)} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {nvr.map((n) => (
                <div key={n.name}>
                  <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-ink-200"><span className="h-2 w-2 rounded-full" style={{ background: n.color }} />{n.name}</span><span className="font-mono text-white">{fmtPct(n.value / (agg.total.visitors || 1))}</span></div>
                  <div className="text-[11px] text-ink-400">{fmtCompact(n.value)} visitor-days</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {segRows.filter((s) => s.visitors > 0).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-24 truncate text-ink-300">{s.short}</span>
                <div className="flex-1 h-1.5 rounded-full bg-violet-500/50 overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${(s.newV / (s.visitors || 1)) * 100}%` }} /></div>
                <span className="w-10 text-right font-mono text-ink-200">{fmtPct(s.newV / (s.visitors || 1), 0)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Customer engagement categories" subtitle="Sessions by engagement band"
          actions={<ExportButton filename="engagement_categories" rows={() => engCats.map((c) => ({ band: c.name, sessions: Math.round(c.value), share: c.share }))} />}>
          <div className="h-[170px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={engCats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                  {engCats.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => `${fmtCompact(v)} sessions`} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-1 mt-1">
            {engCats.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-200"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                <span className="font-mono text-ink-100">{fmtPct(c.share)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-2" title="Visitor frequency" subtitle="Distribution of visits per visitor in a 30-day window"
          actions={<ExportButton filename="visitor_frequency" rows={() => freq.map((f) => ({ band: f.band, share: f.share }))} />}>
          <div className="h-[240px]">
            <ResponsiveContainer>
              <BarChart data={freq} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <defs><linearGradient id="gFreq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} /></linearGradient></defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="band" {...axisProps} interval={0} tick={{ fill: '#8792b0', fontSize: 10 }} />
                <YAxis {...axisProps} tickFormatter={(v) => fmtPct(v, 0)} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={(v) => fmtPct(v)} />} />
                <Bar dataKey="share" name="Share of visitors" fill="url(#gFreq)" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3" title="Segment cross-tab" subtitle="Visitor-days by segment — click a row to filter that segment"
          actions={<><Segmented size="xs" value={crossBy} onChange={setCrossBy} options={[{ value: 'region', label: 'By region' }, { value: 'device', label: 'By device' }]} />
            <ExportButton filename={`segment_by_${crossBy}`} rows={() => cross.rows.map((r) => ({ segment: r.seg.name, ...Object.fromEntries(cross.cols.map((c, i) => [c.name, r.values[i]])) }))} /></>}>
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-xs min-w-[460px]">
              <thead>
                <tr>
                  <th className="text-left font-medium text-ink-400 pb-2 pr-2">Segment <InfoTip text="Cells under 50 visitors are suppressed (k-anonymity) and shown as <50." /></th>
                  {cross.cols.map((c) => <th key={c.id} className="font-medium text-ink-400 pb-2 px-1 text-center">{c.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {cross.rows.map((r) => (
                  <tr key={r.seg.id} className="cursor-pointer group" onClick={() => toggleSegment(r.seg.id)}>
                    <td className="py-1 pr-2 whitespace-nowrap text-ink-200 group-hover:text-white"><span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: r.seg.color }} />{r.seg.short}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className="p-0.5">
                        <div className="rounded-md h-8 grid place-items-center font-mono text-[11px] text-white/90 transition-transform group-hover:scale-[1.02]" style={{ background: v === 0 ? 'rgba(255,255,255,0.02)' : scale(Math.pow(v / cross.max, 0.6)) }}>
                          {v === 0 ? '—' : suppressed(v) ? '<50' : fmtCompact(v)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3"><Legend items={SEGMENTS.filter((s) => isOn(s.id)).slice(0, 7).map((s) => ({ name: s.short, color: s.color }))} /></div>
        </Card>
      </div>
    </div>
  );
}
