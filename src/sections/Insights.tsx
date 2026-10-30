import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, Cpu, Info, Lightbulb, Loader2, RefreshCw, Sparkles, TrendingUp, Wand2 } from 'lucide-react';
import { useDashboard, type SectionId } from '../state/DashboardContext';
import { Badge, Card, ExportButton, SectionHeader, Segmented, cx } from '../components/ui';
import { generateInsights, fmtDate, type Insight } from '../data/engine';
import { dateAt } from '../data/generator';

const EXAMPLES = [
  'Returning visitors show higher engagement than first-time visitors.',
  'Mobile users have a higher checkout abandonment rate.',
  'Product comparison pages generate strong purchase intent.',
  'Visitors arriving from organic search spend more time exploring content.',
];

const STEPS = [
  'Aggregating filtered event cells',
  'Comparing segment engagement scores',
  'Evaluating device-level funnel abandonment',
  'Scoring navigation transitions',
  'Ranking channels and regions',
  'Checking period-over-period deltas',
  'Composing recommendations',
];

const KIND: Record<Insight['kind'], { label: string; icon: JSX.Element; tone: 'emerald' | 'rose' | 'blue' | 'violet'; color: string }> = {
  opportunity: { label: 'Opportunity', icon: <Lightbulb size={14} />, tone: 'emerald', color: '#34d399' },
  risk: { label: 'Risk', icon: <AlertTriangle size={14} />, tone: 'rose', color: '#fb7185' },
  trend: { label: 'Trend', icon: <TrendingUp size={14} />, tone: 'blue', color: '#60a5fa' },
  info: { label: 'Observation', icon: <Info size={14} />, tone: 'violet', color: '#a78bfa' },
};

export default function Insights() {
  const { cells, filters, agg, prevAgg, setSection } = useDashboard();
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ insights: Insight[]; key: string; at: Date } | null>(null);
  const [kind, setKind] = useState<'all' | Insight['kind']>('all');
  const timer = useRef<number>();
  const filterKey = JSON.stringify(filters);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const run = () => {
    setPhase('running'); setStep(0);
    let i = 0;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      i++;
      setStep(i);
      if (i >= STEPS.length) {
        window.clearInterval(timer.current);
        setResult({ insights: generateInsights(cells, filters, agg, prevAgg), key: filterKey, at: new Date() });
        setPhase('done');
      }
    }, 260);
  };

  const shown = useMemo(() => (result?.insights ?? []).filter((i) => kind === 'all' || i.kind === kind), [result, kind]);
  const stale = result && result.key !== filterKey;

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Intelligence panel" title="AI Recommendations" icon={<Sparkles size={20} />}
        description="Insights generated from the current filtered sample dataset using predefined analytical rules. No external AI model is called."
        right={
          <button onClick={run} disabled={phase === 'running'}
            className="relative h-11 inline-flex items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white overflow-hidden disabled:opacity-80 group shadow-glow">
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 animate-gradient bg-[length:200%_100%]" />
            <span className="relative flex items-center gap-2">
              {phase === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {phase === 'running' ? 'Analyzing…' : result ? 'Regenerate AI Insights' : 'Generate AI Insights'}
            </span>
          </button>
        } />

      <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.06] px-4 py-3 flex items-start gap-3">
        <Cpu size={17} className="text-violet-300 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-violet-100/90 leading-relaxed">
          <span className="font-semibold text-violet-200">Prototype rule engine.</span> “AI Insights” here are produced by {11} deterministic analytical rules (comparisons, thresholds, rankings) evaluated over aggregated synthetic data. Each card shows the exact rule that fired, so results are fully explainable and reproducible.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'running' && (
          <motion.div key="run" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card title="Running analysis" subtitle={`Scope: ${agg.total.sessions.toLocaleString()} sessions · ${fmtDate(dateAt(filters.start))} – ${fmtDate(dateAt(filters.end))}`}>
              <div className="grid sm:grid-cols-2 gap-2">
                {STEPS.map((s, i) => (
                  <div key={s} className={cx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] transition-colors', i < step ? 'text-emerald-200 bg-emerald-400/5' : i === step ? 'text-white bg-white/5' : 'text-ink-500')}>
                    {i < step ? <CheckCircle2 size={14} /> : i === step ? <Loader2 size={14} className="animate-spin text-cyan-300" /> : <span className="h-3.5 w-3.5 rounded-full border border-ink-600" />}
                    {s}
                  </div>
                ))}
              </div>
              <div className="h-1 rounded-full bg-white/5 mt-4 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300" animate={{ width: `${(step / STEPS.length) * 100}%` }} /></div>
            </Card>
          </motion.div>
        )}

        {phase !== 'running' && !result && (
          <motion.div key="examples" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card title="Example insights" subtitle="The kinds of findings the engine produces. Press “Generate AI Insights” to compute them from the current data.">
              <div className="grid sm:grid-cols-2 gap-3">
                {EXAMPLES.map((e, i) => (
                  <motion.div key={e} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-4 flex gap-3">
                    <Sparkles size={16} className="text-cyan-300 shrink-0 mt-0.5" />
                    <span className="text-sm text-ink-100">{e}</span>
                  </motion.div>
                ))}
              </div>
              <button onClick={run} className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"><Wand2 size={15} /> Generate from current filters</button>
            </Card>
          </motion.div>
        )}

        {phase === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="cyan">{result.insights.length} insights</Badge>
                <span className="text-[11.5px] text-ink-400">from 11 rules · generated {result.at.toLocaleTimeString()} · {agg.total.sessions.toLocaleString()} sessions in scope</span>
                {stale && (
                  <button onClick={run} className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] text-amber-100">
                    <RefreshCw size={11} /> Filters changed — regenerate
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Segmented size="xs" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'opportunity', label: 'Opportunities' }, { value: 'risk', label: 'Risks' }, { value: 'trend', label: 'Trends' }, { value: 'info', label: 'Observations' }]} />
                <ExportButton filename="rule_based_insights" rows={() => result.insights.map((i) => ({ type: i.kind, title: i.title, detail: i.detail, key_metric: i.metric, recommendation: i.recommendation, rule: i.rule, generated_by: 'rule-based engine (no AI model)' }))} />
              </div>
            </div>
            {shown.length === 0 && <Card><div className="text-sm text-ink-400 text-center py-8">No insights of this type for the current filters.</div></Card>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {shown.map((ins, i) => {
                const k = KIND[ins.kind];
                return (
                  <motion.div key={ins.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-white/15">
                    <div className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full" style={{ background: k.color }} />
                    <div className="flex items-start justify-between gap-3">
                      <Badge tone={k.tone}>{k.icon}{k.label}</Badge>
                      <span className="font-display text-lg text-white font-semibold tabular-nums text-right">{ins.metric}</span>
                    </div>
                    <h3 className="font-display text-[15.5px] text-white font-semibold mt-3 leading-snug">{ins.title}</h3>
                    <p className="text-[12.5px] text-ink-300 mt-1.5 leading-relaxed">{ins.detail}</p>
                    <div className="mt-3 rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
                      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-500">Recommendation</div>
                      <div className="text-[12.5px] text-cyan-100 mt-0.5">{ins.recommendation}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[10.5px] font-mono text-ink-500 truncate" title={ins.rule}>rule: {ins.rule}</span>
                      <button onClick={() => setSection(ins.section as SectionId)} className="inline-flex items-center gap-1 text-[11.5px] text-cyan-300 hover:text-cyan-200 shrink-0">Explore <ArrowRight size={12} /></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
