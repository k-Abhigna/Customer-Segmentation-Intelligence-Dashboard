import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, CornerDownRight, LogOut, Search } from 'lucide-react';
import { useDashboard } from '../state/DashboardContext';
import { Badge, Card, ExportButton, MiniStat, SectionHeader, cx } from '../components/ui';
import { RankBars } from '../components/viz';
import { Sankey } from '../components/Sankey';
import { entryDistribution, keywordPreferences, navigationSankey, nextPageProbs, pageBreakdown, pageColor, pageCombinations, searchBehavior } from '../data/engine';
import { PAGES, PAGE_MAP, type PageId } from '../data/dimensions';
import { fmtCompact, fmtPct } from '../lib/format';

export default function Browsing() {
  const { agg } = useDashboard();
  const [page, setPage] = useState<PageId>('product');
  const [pinned, setPinned] = useState<string | null>(null);

  const sankey = useMemo(() => navigationSankey(agg), [agg]);
  const pages = useMemo(() => pageBreakdown(agg), [agg]);
  const entries = useMemo(() => entryDistribution(agg), [agg]);
  const next = useMemo(() => nextPageProbs(agg, page), [agg, page]);
  const combos = useMemo(() => pageCombinations(agg), [agg]);
  const search = useMemo(() => searchBehavior(agg), [agg]);
  const terms = useMemo(() => keywordPreferences(agg).slice(0, 6), [agg]);
  const selRow = pages.find((p) => p.id === page)!;

  const previous = useMemo(() => {
    const out = pages.map((p) => ({ id: p.id, v: p.pageviews * (nextPageProbs(agg, p.id).find((x) => x.to === page)?.p ?? 0) })).filter((x) => x.v > 0 && x.id !== page);
    const entryV = entries[page] ?? 0;
    const all = [...out, { id: 'entry' as const, v: entryV }].filter((x) => x.v > 0);
    const s = all.reduce((a, b) => a + b.v, 0) || 1;
    return all.map((x) => ({ ...x, p: x.v / s })).sort((a, b) => b.v - a.v).slice(0, 6);
  }, [agg, pages, page, entries]);

  const paths = useMemo(() => {
    const out: { steps: PageId[]; v: number }[] = [];
    const bounce = agg.total.sessions ? agg.total.bounces / agg.total.sessions : 0;
    for (const [e, ev] of Object.entries(entries) as [PageId, number][]) {
      if (ev <= 0) continue;
      const n1 = nextPageProbs(agg, e).filter((x) => x.to !== 'exit');
      const n1s = n1.reduce((s, x) => s + x.p, 0) || 1;
      for (const a of n1.slice(0, 4)) {
        const va = ev * (1 - bounce) * a.p / n1s;
        const n2 = nextPageProbs(agg, a.to as PageId).filter((x) => x.to !== 'exit');
        for (const b of n2.slice(0, 3)) out.push({ steps: [e, a.to as PageId, b.to as PageId], v: va * b.p });
      }
    }
    const total = agg.total.sessions || 1;
    return out.sort((x, y) => y.v - x.v).slice(0, 8).map((p) => ({ ...p, share: p.v / total }));
  }, [agg, entries]);

  const abandon = [...pages].sort((a, b) => b.exitRate - a.exitRate).slice(0, 7);
  const entryList = (Object.entries(entries) as [PageId, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const onSankeySelect = (n: { id: string } | null) => {
    setPinned(n?.id ?? null);
    const pid = n?.id.split(':')[1];
    if (pid && PAGE_MAP[pid as PageId]) setPage(pid as PageId);
  };

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="How visitors move" title="Browsing Pattern Intelligence" icon={<Compass size={20} />}
        description="Aggregated navigation flows between page templates. Select any page to explore where visitors come from and go next." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Avg interactions / session" value={(agg.total.clicks / (agg.total.sessions || 1)).toFixed(1)} />
        <MiniStat label="Avg pages / session" value={(agg.total.pageviews / (agg.total.sessions || 1)).toFixed(2)} accent="#22d3ee" />
        <MiniStat label="Sessions using search" value={fmtPct(search.searchUsage)} accent="#f59e0b" />
        <MiniStat label="Session abandonment" value={fmtPct(1 - agg.total.conversions / (agg.total.sessions || 1))} sub="sessions without conversion" accent="#f472b6" />
      </div>

      <Card title="Navigation flow" subtitle="Entry page → next three steps. Hover to trace, click a page to pin it and load it in the path explorer below."
        badge={<Badge tone="cyan">Interactive Sankey</Badge>}
        actions={<ExportButton filename="navigation_flow_links" rows={() => sankey.links.map((l) => ({ source: l.source, target: l.target, sessions: Math.round(l.value) }))} />}>
        <Sankey data={sankey} height={460} selected={pinned} onSelect={onSankeySelect} />
      </Card>

      <Card title="Page path explorer" subtitle="Pick a page to see its most common previous and next destinations"
        actions={<ExportButton filename={`next_destinations_${page}`} rows={() => next.map((n) => ({ from: PAGE_MAP[page].name, to: n.to === 'exit' ? 'Exit' : PAGE_MAP[n.to].name, probability: n.p, est_transitions: Math.round(selRow.pageviews * n.p) }))} />}>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {PAGES.map((p) => (
            <button key={p.id} onClick={() => { setPage(p.id); setPinned(null); }}
              className={cx('h-8 rounded-full px-3 text-xs border inline-flex items-center gap-1.5 transition-colors', page === p.id ? 'bg-white/10 border-white/25 text-white' : 'border-white/10 text-ink-300 hover:text-white')}>
              <span className="h-2 w-2 rounded-full" style={{ background: pageColor(p.id) }} />{p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-5 items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-400 mb-2">Arrives from</div>
            <div className="space-y-2">
              {previous.map((p) => (
                <motion.div key={p.id} layout className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1"><span className="text-ink-200 truncate">{p.id === 'entry' ? 'Session start (entry)' : PAGE_MAP[p.id].name}</span><span className="font-mono text-ink-100">{fmtPct(p.p)}</span></div>
                    <div className="h-1.5 rounded-full bg-white/5 flex justify-end overflow-hidden"><motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${p.p * 100}%` }} style={{ background: p.id === 'entry' ? '#94a3b8' : pageColor(p.id) }} /></div>
                  </div>
                  <ArrowRight size={13} className="text-ink-500 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div key={page} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="mx-auto w-full lg:w-56 rounded-2xl p-4 text-center border border-white/15 relative overflow-hidden" style={{ background: `radial-gradient(circle at 50% 0%, ${pageColor(page)}33, rgba(255,255,255,0.02))` }}>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-300">Selected page</div>
            <div className="font-display text-lg text-white font-semibold mt-1">{PAGE_MAP[page].name}</div>
            <div className="font-mono text-[11px] text-ink-400">{PAGE_MAP[page].path}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-left">
              <div><div className="text-[10px] text-ink-400">Views</div><div className="font-mono text-sm text-white">{fmtCompact(selRow.pageviews)}</div></div>
              <div><div className="text-[10px] text-ink-400">Exit rate</div><div className="font-mono text-sm text-rose-200">{fmtPct(selRow.exitRate)}</div></div>
            </div>
          </motion.div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-400 mb-2">Goes next to</div>
            <div className="space-y-2">
              {next.slice(0, 7).map((n) => (
                <motion.button key={n.to} layout onClick={() => n.to !== 'exit' && setPage(n.to)} className={cx('w-full flex items-center gap-2 text-left group', n.to === 'exit' && 'cursor-default')}>
                  <ArrowRight size={13} className="text-ink-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={cx('truncate', n.to === 'exit' ? 'text-rose-200' : 'text-ink-200 group-hover:text-white')}>{n.to === 'exit' ? 'Exit site' : PAGE_MAP[n.to].name}</span>
                      <span className="font-mono text-ink-100">{fmtPct(n.p)} <span className="text-ink-500">· {fmtCompact(selRow.pageviews * n.p)}</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${n.p * 100}%` }} style={{ background: n.to === 'exit' ? '#fb7185' : pageColor(n.to) }} /></div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Entry pages" subtitle="Where sessions begin"
          actions={<ExportButton filename="entry_pages" rows={() => entryList.map(([id, v]) => ({ page: PAGE_MAP[id].name, entries: Math.round(v), share: v / (agg.total.sessions || 1) }))} />}>
          <RankBars items={entryList.map(([id, v]) => ({ label: PAGE_MAP[id].name, value: v, key: id, color: pageColor(id) }))} format={fmtCompact} onClick={(k) => setPage(k as PageId)} selected={page}
            secondary={(i) => fmtPct(entryList[i][1] / (agg.total.sessions || 1), 0)} />
        </Card>
        <Card title="Most common navigation paths" subtitle="Top 3-step sequences (share of all sessions)"
          actions={<ExportButton filename="navigation_paths" rows={() => paths.map((p) => ({ path: p.steps.map((s) => PAGE_MAP[s].name).join(' > '), sessions: Math.round(p.v), share: p.share }))} />}>
          <div className="space-y-2">
            {paths.map((p, i) => (
              <div key={i} className="rounded-xl bg-white/[0.025] border border-white/5 px-3 py-2">
                <div className="flex items-center flex-wrap gap-1 text-[11.5px]">
                  {p.steps.map((s, j) => (
                    <span key={j} className="inline-flex items-center gap-1">
                      {j > 0 && <CornerDownRight size={11} className="text-ink-500" />}
                      <span className="rounded-md px-1.5 py-0.5" style={{ background: pageColor(s) + '22', color: '#e2e8f0' }}>{PAGE_MAP[s].name}</span>
                    </span>
                  ))}
                </div>
                <div className="flex justify-between text-[10.5px] mt-1"><span className="text-ink-400">{fmtCompact(p.v)} sessions</span><span className="font-mono text-cyan-200">{fmtPct(p.share, 2)}</span></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Frequently visited together" subtitle="Page pairs with the most direct transitions"
          actions={<ExportButton filename="page_combinations" rows={() => combos.map((c) => ({ page_a: c.a, page_b: c.b, transitions: Math.round(c.sessions) }))} />}>
          <RankBars items={combos.map((c) => ({ label: `${c.a}  ⇄  ${c.b}`, value: c.sessions }))} format={fmtCompact} color="linear-gradient(90deg,#6366f1,#22d3ee)" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Where visitors abandon sessions" icon={<LogOut size={15} />} subtitle="Pages ranked by exit rate"
          actions={<ExportButton filename="abandonment_pages" rows={() => abandon.map((p) => ({ page: p.name, exit_rate: p.exitRate, exits: Math.round(p.exits) }))} />}>
          <RankBars items={abandon.map((p) => ({ label: p.name, value: p.exitRate, key: p.id, color: 'linear-gradient(90deg,#f59e0b,#fb7185)' }))} format={(v) => fmtPct(v)} onClick={(k) => setPage(k as PageId)}
            secondary={(i) => `${fmtCompact(abandon[i].exits)} exits`} />
        </Card>
        <Card title="Search behavior" icon={<Search size={15} />} subtitle="On-site search usage and outcomes (aggregated terms only)">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <MiniStat label="Searches / session" value={search.searchesPerSession.toFixed(2)} />
            <MiniStat label="Search → product view" value={fmtPct(search.searchToProduct)} accent="#22d3ee" />
            <MiniStat label="Refinement rate" value={fmtPct(search.refinementRate)} accent="#a78bfa" />
            <MiniStat label="Zero-result rate" value={fmtPct(search.zeroResultRate)} accent="#f472b6" />
            <MiniStat label="Search exit rate" value={fmtPct(search.searchExitRate)} accent="#f59e0b" />
            <MiniStat label="Searcher CVR lift" value={`${search.searchCvrLift.toFixed(1)}×`} accent="#34d399" />
          </div>
          <div className="mt-4 text-[11px] text-ink-400 mb-2">Top search terms</div>
          <div className="flex flex-wrap gap-1.5">
            {terms.map((t) => (
              <span key={t.term} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-ink-100">
                {t.term} <span className="font-mono text-ink-400 ml-1">{fmtCompact(t.searches)}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
