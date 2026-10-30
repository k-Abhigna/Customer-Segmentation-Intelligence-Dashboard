import { useMemo, useState } from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { AlertTriangle, BrainCircuit, ChevronDown, FlaskConical, Lightbulb, RotateCcw } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Badge, Card, ChartTooltip, DataTable, ExportButton, Legend, SectionHeader, SimulatedBadge, axisProps, cx, gridProps } from '../components/ui';
import { Gauge } from '../components/viz';
import { BASE_SCENARIO, forecast, NEXT_BEST_CONTENT, predict, predictedFunnel, weightedRetention, type Scenario } from '../data/engine';
import { SEGMENTS, K_ANON } from '../data/dimensions';
import { fmtCompact, fmtCurrency, fmtInt, fmtPct } from '../lib/format';

const PRESETS: { name: string; s: Scenario }[] = [
  { name: 'Baseline', s: BASE_SCENARIO },
  { name: 'Growth push', s: { campaignBudget: 60, personalization: 30, emailCadence: 3, discount: 10, pageSpeed: 10, retargeting: true } },
  { name: 'Retention focus', s: { campaignBudget: 0, personalization: 70, emailCadence: 3, discount: 0, pageSpeed: 15, retargeting: false } },
  { name: 'Efficiency', s: { campaignBudget: -30, personalization: 40, emailCadence: 2, discount: 0, pageSpeed: 30, retargeting: false } },
  { name: 'Over-mailing', s: { campaignBudget: 0, personalization: 0, emailCadence: 7, discount: 15, pageSpeed: 0, retargeting: true } },
];

function Slider({ label, value, min, max, step = 1, onChange, fmt, hint }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt: (v: number) => string; hint: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="flex justify-between text-xs mb-1.5"><span className="text-ink-200">{label}</span><span className="font-mono text-cyan-200">{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="range w-full"
        style={{ background: `linear-gradient(90deg, #3b82f6 0%, #22d3ee ${pct}%, rgba(255,255,255,0.08) ${pct}%)` }} />
      <div className="text-[10.5px] text-ink-500 mt-1">{hint}</div>
    </label>
  );
}

export default function Predictive() {
  const { agg, cells, filters } = useDashboard();
  const [sc, setSc] = useState<Scenario>(BASE_SCENARIO);
  const [showMethod, setShowMethod] = useState(false);
  const set = <K extends keyof Scenario>(k: K, v: Scenario[K]) => setSc((s) => ({ ...s, [k]: v }));

  const retention = weightedRetention(agg);
  const base = useMemo(() => predict(agg.total, retention, BASE_SCENARIO), [agg, retention]);
  const scen = useMemo(() => predict(agg.total, retention, sc), [agg, retention, sc]);
  const fc = useMemo(() => forecast(cells, filters, sc), [cells, filters, sc]);
  const pf = useMemo(() => predictedFunnel(agg.total, retention, sc), [agg, retention, sc]);
  const segPred = useMemo(() => SEGMENTS.filter((s) => agg.bySeg[s.id].sessions >= K_ANON).map((s) => {
    const a = agg.bySeg[s.id];
    const b = predict(a, s.retention, BASE_SCENARIO), x = predict(a, s.retention, sc);
    return { seg: s, b, x };
  }), [agg, sc]);
  const sum = fc.summary;
  const delta = (a: number, b: number) => (b ? a / b - 1 : 0);
  const changed = JSON.stringify(sc) !== JSON.stringify(BASE_SCENARIO);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="What may happen next" title="Predictive Insights" icon={<BrainCircuit size={20} />}
        description="Scenario-based what-if forecasts. Adjust hypothetical campaign and engagement parameters to see how simulated outcomes change."
        right={<SimulatedBadge />} />

      <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-300 shrink-0 mt-0.5" />
        <div className="text-[12.5px] text-amber-100/90 leading-relaxed">
          <span className="font-semibold text-amber-200">Simulated forecasts, not validated AI predictions.</span> Probabilities come from transparent heuristic formulas (logistic transforms of historical aggregates plus fixed scenario coefficients) applied to <span className="font-semibold">synthetic</span> data. Use them to explore directionality, not to make decisions. <span className="text-white">Solid lines = historical (actual synthetic metrics); dashed = simulated.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
        <Card title="Scenario controls" icon={<FlaskConical size={15} />} subtitle="Hypothetical levers — not tied to real spend"
          actions={changed && <button onClick={() => setSc(BASE_SCENARIO)} className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-ink-200 hover:text-white"><RotateCcw size={12} />Reset</button>}>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => setSc(p.s)} className={cx('h-7 rounded-full px-2.5 text-[11px] border transition-colors', JSON.stringify(sc) === JSON.stringify(p.s) ? 'bg-amber-400/15 border-amber-300/30 text-amber-100' : 'border-white/10 text-ink-300 hover:text-white')}>{p.name}</button>
            ))}
          </div>
          <div className="space-y-5">
            <Slider label="Campaign budget change" value={sc.campaignBudget} min={-50} max={100} step={5} onChange={(v) => set('campaignBudget', v)} fmt={(v) => `${v > 0 ? '+' : ''}${v}%`} hint="Diminishing returns (log response) on traffic & intent" />
            <Slider label="Personalization level" value={sc.personalization} min={0} max={100} step={5} onChange={(v) => set('personalization', v)} fmt={(v) => `${v}`} hint="Consent-based on-site recommendations coverage" />
            <Slider label="Email cadence (opted-in)" value={sc.emailCadence} min={0} max={7} onChange={(v) => set('emailCadence', v)} fmt={(v) => `${v}/week`} hint="Above 4/week, simulated fatigue raises churn" />
            <Slider label="Discount depth" value={sc.discount} min={0} max={30} onChange={(v) => set('discount', v)} fmt={(v) => `${v}%`} hint="Lifts conversion, lowers average order value" />
            <Slider label="Page speed improvement" value={sc.pageSpeed} min={0} max={50} step={5} onChange={(v) => set('pageSpeed', v)} fmt={(v) => `${v}%`} hint="Reduces bounce; lifts landing → exploration" />
            <label className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5 cursor-pointer">
              <span><span className="block text-xs text-ink-200">Consented retargeting</span><span className="block text-[10.5px] text-ink-500">Opted-in audiences only</span></span>
              <button onClick={() => set('retargeting', !sc.retargeting)} className={cx('h-6 w-11 rounded-full relative transition-colors', sc.retargeting ? 'bg-cyan-400' : 'bg-white/10')} aria-label="Toggle retargeting">
                <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', sc.retargeting ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </label>
          </div>
        </Card>

        <div className="space-y-5 min-w-0">
          <Card title="Prediction gauges" badge={<SimulatedBadge />} subtitle="White marker = baseline (no changes). Arc = selected scenario.">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Gauge label="Purchase intent probability" value={scen.purchaseIntent} baseline={base.purchaseIntent} color="#10b981" sub="P(intent signal, next 7d)" />
              <Gauge label="Churn risk estimate" value={scen.churnRisk} baseline={base.churnRisk} color="#fb7185" invert sub="P(no return, 30d)" />
              <Gauge label="Repeat visit likelihood" value={scen.repeatVisit} baseline={base.repeatVisit} color="#8b5cf6" sub="P(return visit, 30d)" />
              <Gauge label="Conversion probability" value={scen.conversion} baseline={base.conversion} color="#22d3ee" max={0.1} decimals={2} sub="P(convert, per session)" />
            </div>
          </Card>

          <Card title="Conversion forecast · next 30 days" badge={<SimulatedBadge />}
            subtitle="Trailing 60-day linear trend × weekday seasonality, scaled by scenario lift. Shaded band ≈ 90% interval from residual noise."
            actions={<ExportButton filename="simulated_conversion_forecast" rows={() => fc.points.map((p) => ({ date: p.date, actual_historical: p.actual ?? '', simulated_baseline: p.baseline ?? '', simulated_scenario: p.scenario ?? '', band_low: p.band?.[0] ?? '', band_high: p.band?.[1] ?? '', is_simulated: p.actual == null }))} />}>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <ComposedChart data={fc.points} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={30} />
                  <YAxis {...axisProps} width={50} tickFormatter={fmtCompact} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip formatter={fmtInt} />} />
                  <Area dataKey="band" name="Interval" stroke="none" fill="#f59e0b" fillOpacity={0.1} isAnimationActive={false} />
                  <Area type="monotone" dataKey="actual" name="Historical (actual)" stroke="#3b82f6" strokeWidth={2} fill="url(#gAct)" connectNulls={false} />
                  <Line type="monotone" dataKey="baseline" name="Simulated baseline" stroke="#8792b0" strokeDasharray="4 4" strokeWidth={1.6} dot={false} />
                  <Line type="monotone" dataKey="scenario" name="Simulated scenario" stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={2.2} dot={false} />
                  <ReferenceLine x={fc.points.find((p) => p.actual == null)?.label} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 4" label={{ value: 'forecast →', fill: '#8792b0', fontSize: 10, position: 'insideTopRight' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ name: 'Historical (actual synthetic)', color: '#3b82f6' }, { name: 'Simulated baseline', color: '#8792b0', dashed: true }, { name: 'Simulated scenario', color: '#f59e0b', dashed: true }, { name: '≈90% interval', color: '#f59e0b55' }]} />
            <div className="overflow-x-auto thin-scroll mt-4">
              <table className="w-full text-xs min-w-[520px]">
                <thead><tr className="text-ink-400 text-[10.5px] uppercase tracking-wider">
                  <th className="text-left font-medium py-2">Metric</th><th className="text-right font-medium">Last 30d <span className="normal-case text-blue-300">(actual)</span></th>
                  <th className="text-right font-medium">Next 30d baseline <span className="normal-case text-amber-300">(sim.)</span></th><th className="text-right font-medium">Next 30d scenario <span className="normal-case text-amber-300">(sim.)</span></th><th className="text-right font-medium">Δ vs baseline</th>
                </tr></thead>
                <tbody className="font-mono">
                  {[
                    { m: 'Conversions', a: sum.actualConversions30, b: sum.baselineConversions, s: sum.scenarioConversions, f: fmtCompact },
                    { m: 'Revenue', a: sum.actualRevenue30, b: sum.baselineRevenue, s: sum.scenarioRevenue, f: fmtCurrency },
                    { m: 'Sessions', a: agg.byDay.slice(-30).reduce((x, y) => x + y.sessions, 0), b: sum.baselineSessions, s: sum.scenarioSessions, f: fmtCompact },
                  ].map((r) => {
                    const d = delta(r.s, r.b);
                    return (
                      <tr key={r.m} className="border-t border-white/5">
                        <td className="py-2 font-sans text-ink-200">{r.m}</td>
                        <td className="text-right text-white">{r.f(r.a)}</td>
                        <td className="text-right text-ink-200">{r.f(r.b)}</td>
                        <td className="text-right text-amber-200">{r.f(r.s)}</td>
                        <td className={cx('text-right', d >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{d >= 0 ? '+' : ''}{fmtPct(d)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {agg.days < 30 && <p className="text-[10.5px] text-ink-500 mt-2">“Last 30d” uses the trailing history window ending on the selected end date.</p>}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Predicted customer journey" badge={<SimulatedBadge />} subtitle="Next-30-day stage volumes: simulated baseline vs scenario"
          actions={<ExportButton filename="simulated_journey" rows={() => pf.map((p) => ({ stage: p.name, simulated_baseline: Math.round(p.baseline), simulated_scenario: Math.round(p.scenario) }))} />}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={pf} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fill: '#8792b0', fontSize: 9.5 }} angle={-18} textAnchor="end" height={50} />
                <YAxis {...axisProps} scale="log" domain={['auto', 'auto']} tickFormatter={fmtCompact} width={50} allowDataOverflow />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip formatter={fmtCompact} />} />
                <Bar dataKey="baseline" name="Simulated baseline" fill="#5b6788" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="scenario" name="Simulated scenario" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10.5px] text-ink-500">Log scale. Stage lifts are distributed from the simulated intent and conversion probability ratios.</p>
        </Card>

        <Card title="Segment-level simulated predictions" badge={<SimulatedBadge />} subtitle="Baseline → scenario for each segment in scope"
          actions={<ExportButton filename="simulated_segment_predictions" rows={() => segPred.map((r) => ({ segment: r.seg.name, intent_baseline: r.b.purchaseIntent, intent_scenario: r.x.purchaseIntent, churn_baseline: r.b.churnRisk, churn_scenario: r.x.churnRisk, repeat_baseline: r.b.repeatVisit, repeat_scenario: r.x.repeatVisit, conversion_baseline: r.b.conversion, conversion_scenario: r.x.conversion, is_simulated: true }))} />}>
          <DataTable rows={segPred} rowKey={(r) => r.seg.id} initialSort={{ key: 'churn', dir: 'desc' }} maxHeight={330}
            columns={[
              { key: 'seg', header: 'Segment', sortValue: (r) => r.seg.name, render: (r) => <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: r.seg.color }} />{r.seg.short}</span> },
              { key: 'intent', header: 'Intent', align: 'right', sortValue: (r) => r.x.purchaseIntent, render: (r) => <PredCell b={r.b.purchaseIntent} x={r.x.purchaseIntent} /> },
              { key: 'churn', header: 'Churn risk', align: 'right', sortValue: (r) => r.x.churnRisk, render: (r) => <PredCell b={r.b.churnRisk} x={r.x.churnRisk} invert /> },
              { key: 'repeat', header: 'Repeat', align: 'right', sortValue: (r) => r.x.repeatVisit, render: (r) => <PredCell b={r.b.repeatVisit} x={r.x.repeatVisit} /> },
              { key: 'cvr', header: 'Conversion', align: 'right', sortValue: (r) => r.x.conversion, render: (r) => <PredCell b={r.b.conversion} x={r.x.conversion} d={2} /> },
            ]} />
        </Card>
      </div>

      <Card title="Next-best-content recommendations" icon={<Lightbulb size={15} />} badge={<Badge tone="violet">Rule-based</Badge>}
        subtitle="Deterministic content rules per segment — aggregated signals only, never individual targeting"
        actions={<ExportButton filename="next_best_content" rows={() => SEGMENTS.map((s) => ({ segment: s.name, ...NEXT_BEST_CONTENT[s.id] }))} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {SEGMENTS.filter((s) => agg.bySeg[s.id].sessions > 0).map((s) => {
            const r = NEXT_BEST_CONTENT[s.id];
            const x = segPred.find((p) => p.seg.id === s.id);
            return (
              <div key={s.id} className="rounded-xl bg-white/[0.025] border border-white/5 p-3.5 hover:border-white/15 transition-colors">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[12.5px] text-white font-medium"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                  {x && <span className="text-[10px] font-mono text-amber-200">intent {fmtPct(x.x.purchaseIntent, 0)}</span>}</div>
                <div className="text-[10.5px] text-ink-400 mt-1.5">Signal · {r.signal}</div>
                <div className="text-[13px] text-cyan-100 mt-1 leading-snug">{r.content}</div>
                <div className="text-[10.5px] text-ink-400 mt-1.5">{r.channel} · {r.rationale}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="glass rounded-2xl">
        <button onClick={() => setShowMethod((v) => !v)} className="w-full flex items-center justify-between px-5 py-4 text-sm text-ink-100">
          <span className="flex items-center gap-2"><FlaskConical size={15} className="text-amber-300" /> Methodology & limitations of the simulation</span>
          <ChevronDown size={16} className={cx('transition-transform text-ink-400', showMethod && 'rotate-180')} />
        </button>
        {showMethod && (
          <div className="px-5 pb-5 text-[12px] text-ink-300 leading-relaxed space-y-2 font-mono">
            <p>purchase_intent = σ(−1.6 + 4.0·cart_rate + 1.2·engagement + Δ_scenario)</p>
            <p>churn_risk = σ(1.2 − 3.2·retention_30d − 1.5·engagement + Δ_scenario)</p>
            <p>repeat_visit = σ(−1.0 + 2.6·returning_share + 1.4·engagement + Δ_scenario)</p>
            <p>conversion = σ(logit(historical_cvr) + 0.25·ln(1+budget) + 0.004·personalization + 0.035·discount + 0.008·speed + 0.12·retargeting)</p>
            <p>forecast = (linear trend over trailing 60 days) × weekday factor × (scenario conversion ratio) × traffic multiplier</p>
            <p className="font-sans text-ink-400">Coefficients are hand-set for illustration, not fitted or validated. Replace with a trained, evaluated model on consented first-party data before any production use.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PredCell({ b, x, invert, d = 0 }: { b: number; x: number; invert?: boolean; d?: number }) {
  const diff = x - b;
  const good = invert ? diff < 0 : diff > 0;
  return (
    <span className="font-mono">
      {fmtPct(x, d)}
      {Math.abs(diff) > 0.0005 && <span className={cx('ml-1.5 text-[10.5px]', good ? 'text-emerald-300' : 'text-rose-300')}>{diff > 0 ? '▲' : '▼'}{(Math.abs(diff) * 100).toFixed(d || 1)}</span>}
    </span>
  );
}
