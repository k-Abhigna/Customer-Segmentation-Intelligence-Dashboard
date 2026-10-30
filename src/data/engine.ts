/**
 * Analytics engine: turns filtered aggregate cells into every metric,
 * breakdown, flow and (clearly simulated) forecast used by the dashboard.
 *
 * All functions are pure and work on aggregates only.
 */
import {
  CATEGORIES, CHANNELS, CLICK_TARGETS, CONTENT_TYPES, DEVICES, DEVICE_MAP, ENGAGEMENT_DIST, FEATURES,
  FREQ_DIST, KEYWORDS, LANDINGS, PAGES, PAGE_MAP, REGIONS, SEGMENTS, SEGMENT_MAP, TOP_CONTENT, TRANSITIONS,
  AGE_DIST, AGE_CONSENT_RATE, BROWSERS, K_ANON, EVENT_TYPES,
  type ChannelId, type DeviceId, type LandingId, type PageId, type RegionId, type SegmentId,
} from './dimensions';
import { type Cell, dateAt } from './generator';

// ───────────────────────────── Filters & aggregation ─────────────────────────────

export interface Filters {
  start: number; // inclusive day index
  end: number;   // inclusive day index
  segments: SegmentId[];
  devices: DeviceId[];
  regions: RegionId[];
}

export const SUM_KEYS = [
  'visitors', 'newVisitors', 'sessions', 'engagedSessions', 'pageviews', 'duration', 'bounces', 'clicks', 'scrolls',
  'scrollDepthSum', 'productViews', 'searches', 'landed', 'explored', 'interested', 'addToCart', 'checkouts', 'conversions', 'revenue',
] as const;
export type SumKey = (typeof SUM_KEYS)[number];
export type Agg = Record<SumKey, number>;

export const emptyAgg = (): Agg => Object.fromEntries(SUM_KEYS.map((k) => [k, 0])) as Agg;
function addInto(a: Agg, c: Cell | Agg) {
  for (const k of SUM_KEYS) a[k] += (c as Agg)[k];
}

export interface Aggregation {
  days: number;
  start: number;
  total: Agg;
  bySeg: Record<SegmentId, Agg>;
  byDev: Record<DeviceId, Agg>;
  byReg: Record<RegionId, Agg>;
  bySegDev: Record<string, Agg>;
  byRegSeg: Record<string, Agg>;
  byRegDev: Record<string, Agg>;
  byDay: Agg[];
  byDaySeg: Record<SegmentId, number[]>; // visitors per day per segment
  byDayDev: Record<DeviceId, number[]>;  // sessions per day per device
  byDowDev: Record<DeviceId, number[]>;  // sessions per dow per device
}

const keyed = <T extends string>(ids: readonly T[]) => Object.fromEntries(ids.map((id) => [id, emptyAgg()])) as Record<T, Agg>;

export function matches(c: Cell, f: Filters) {
  return (f.segments.length === 0 || f.segments.includes(c.seg)) &&
    (f.devices.length === 0 || f.devices.includes(c.dev)) &&
    (f.regions.length === 0 || f.regions.includes(c.reg));
}

export function aggregate(cells: Cell[], f: Filters, start = f.start, end = f.end): Aggregation {
  const days = end - start + 1;
  const segIds = SEGMENTS.map((s) => s.id);
  const devIds = DEVICES.map((s) => s.id);
  const regIds = REGIONS.map((s) => s.id);
  const res: Aggregation = {
    days, start,
    total: emptyAgg(), bySeg: keyed(segIds), byDev: keyed(devIds), byReg: keyed(regIds),
    bySegDev: {}, byRegSeg: {}, byRegDev: {},
    byDay: Array.from({ length: Math.max(0, days) }, emptyAgg),
    byDaySeg: Object.fromEntries(segIds.map((s) => [s, new Array(Math.max(0, days)).fill(0)])) as Record<SegmentId, number[]>,
    byDayDev: Object.fromEntries(devIds.map((s) => [s, new Array(Math.max(0, days)).fill(0)])) as Record<DeviceId, number[]>,
    byDowDev: Object.fromEntries(devIds.map((s) => [s, new Array(7).fill(0)])) as Record<DeviceId, number[]>,
  };
  if (days <= 0) return res;
  for (const c of cells) {
    if (c.d < start || c.d > end || !matches(c, f)) continue;
    addInto(res.total, c);
    addInto(res.bySeg[c.seg], c);
    addInto(res.byDev[c.dev], c);
    addInto(res.byReg[c.reg], c);
    addInto((res.bySegDev[c.seg + '|' + c.dev] ??= emptyAgg()), c);
    addInto((res.byRegSeg[c.reg + '|' + c.seg] ??= emptyAgg()), c);
    addInto((res.byRegDev[c.reg + '|' + c.dev] ??= emptyAgg()), c);
    const i = c.d - start;
    addInto(res.byDay[i], c);
    res.byDaySeg[c.seg][i] += c.visitors;
    res.byDayDev[c.dev][i] += c.sessions;
    res.byDowDev[c.dev][c.dow] += c.sessions;
  }
  return res;
}

// ───────────────────────────── Core metrics ─────────────────────────────

export interface Metrics {
  uniqueVisitors: number;
  activeUsers: number;
  avgSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  returningRate: number;
  conversionRate: number;
  engagementScore: number;
  sessions: number;
  conversions: number;
  revenue: number;
  scrollDepth: number;
  clicksPerSession: number;
  cartAbandonment: number;
  checkoutAbandonment: number;
}

const safe = (n: number, d: number) => (d > 0 ? n / d : 0);

export function engagementScore(a: Agg) {
  const dur = safe(a.duration, a.sessions);
  const pps = safe(a.pageviews, a.sessions);
  const bounce = safe(a.bounces, a.sessions);
  const depth = safe(a.scrollDepthSum, a.pageviews);
  const engaged = safe(a.engagedSessions, a.sessions);
  if (a.sessions === 0) return 0;
  return 100 * (0.3 * Math.min(1, dur / 480) + 0.2 * Math.min(1, pps / 8) + 0.2 * (1 - bounce) + 0.15 * depth + 0.15 * engaged);
}

/** Estimated period-unique visitors: daily returning visitor-days are de-duplicated by segment revisit propensity. */
export function estimateUniques(agg: Aggregation, segFilter?: SegmentId) {
  let u = 0;
  for (const s of SEGMENTS) {
    if (segFilter && s.id !== segFilter) continue;
    const a = agg.bySeg[s.id];
    const ret = a.visitors - a.newVisitors;
    u += a.newVisitors + ret / (1 + (agg.days - 1) * s.dailyReturnProb);
  }
  return u;
}

export function metricsOf(a: Agg, days: number, uniques: number): Metrics {
  return {
    uniqueVisitors: uniques,
    activeUsers: safe(a.visitors * safe(a.engagedSessions, a.sessions), days),
    avgSessionDuration: safe(a.duration, a.sessions),
    pagesPerSession: safe(a.pageviews, a.sessions),
    bounceRate: safe(a.bounces, a.sessions),
    returningRate: 1 - safe(a.newVisitors, a.visitors),
    conversionRate: safe(a.conversions, a.sessions),
    engagementScore: engagementScore(a),
    sessions: a.sessions,
    conversions: a.conversions,
    revenue: a.revenue,
    scrollDepth: safe(a.scrollDepthSum, a.pageviews),
    clicksPerSession: safe(a.clicks, a.sessions),
    cartAbandonment: 1 - safe(a.conversions, a.addToCart),
    checkoutAbandonment: 1 - safe(a.conversions, a.checkouts),
  };
}

export function metricsForAggregation(agg: Aggregation): Metrics {
  return metricsOf(agg.total, agg.days, estimateUniques(agg));
}

export function segmentMetrics(agg: Aggregation, s: SegmentId): Metrics {
  const a = agg.bySeg[s];
  let u = 0;
  const seg = SEGMENT_MAP[s];
  const ret = a.visitors - a.newVisitors;
  u = a.newVisitors + ret / (1 + (agg.days - 1) * seg.dailyReturnProb);
  return metricsOf(a, agg.days, u);
}

export type KpiKey = 'uniqueVisitors' | 'activeUsers' | 'avgSessionDuration' | 'pagesPerSession' | 'bounceRate' | 'returningRate' | 'conversionRate' | 'engagementScore';

export interface DailyPoint {
  date: string; label: string; idx: number;
  visitors: number; newVisitors: number; returningVisitors: number; sessions: number; conversions: number;
  engagementScore: number; bounceRate: number; avgSessionDuration: number; pagesPerSession: number;
  conversionRate: number; returningRate: number; activeUsers: number; uniqueVisitors: number;
  pageviews: number; clicks: number; scrolls: number; productViews: number; searches: number; addToCart: number; checkouts: number; revenue: number;
}

export function dailySeries(agg: Aggregation): DailyPoint[] {
  return agg.byDay.map((a, i) => {
    const date = dateAt(agg.start + i);
    const m = metricsOf(a, 1, a.visitors);
    return {
      date, idx: agg.start + i,
      label: new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      visitors: a.visitors, newVisitors: a.newVisitors, returningVisitors: a.visitors - a.newVisitors,
      sessions: a.sessions, conversions: a.conversions,
      engagementScore: m.engagementScore, bounceRate: m.bounceRate, avgSessionDuration: m.avgSessionDuration,
      pagesPerSession: m.pagesPerSession, conversionRate: m.conversionRate, returningRate: m.returningRate,
      activeUsers: m.activeUsers, uniqueVisitors: a.visitors,
      pageviews: a.pageviews, clicks: a.clicks, scrolls: a.scrolls, productViews: a.productViews,
      searches: a.searches, addToCart: a.addToCart, checkouts: a.checkouts, revenue: a.revenue,
    };
  });
}

// ───────────────────────────── Channels / traffic sources ─────────────────────────────

export interface ChannelRow { id: ChannelId; name: string; color: string; sessions: number; share: number; avgDuration: number; bounceRate: number; conversions: number; conversionRate: number; }

export function channelBreakdown(agg: Aggregation): ChannelRow[] {
  const acc: Record<ChannelId, { sessions: number; duration: number; bounces: number; conversions: number }> =
    Object.fromEntries(CHANNELS.map((c) => [c.id, { sessions: 0, duration: 0, bounces: 0, conversions: 0 }])) as never;
  for (const [key, a] of Object.entries(agg.bySegDev)) {
    const [seg, dev] = key.split('|') as [SegmentId, DeviceId];
    const raw = CHANNELS.map((c) => c.segShare[seg] * (dev === 'mobile' ? c.mobileTilt : 1));
    const sum = raw.reduce((x, y) => x + y, 0);
    const shares = raw.map((r) => r / sum);
    const norm = (idx: (c: (typeof CHANNELS)[number]) => number) => CHANNELS.reduce((s, c, i) => s + shares[i] * idx(c), 0);
    const nd = norm((c) => c.durIdx), nb = norm((c) => c.bounceIdx), nc = norm((c) => c.cvrIdx);
    CHANNELS.forEach((c, i) => {
      const sh = shares[i];
      acc[c.id].sessions += a.sessions * sh;
      acc[c.id].duration += a.duration * sh * c.durIdx / nd;
      acc[c.id].bounces += a.bounces * sh * c.bounceIdx / nb;
      acc[c.id].conversions += a.conversions * sh * c.cvrIdx / nc;
    });
  }
  const total = agg.total.sessions;
  return CHANNELS.map((c) => {
    const v = acc[c.id];
    return {
      id: c.id, name: c.name, color: c.color, sessions: v.sessions, share: safe(v.sessions, total),
      avgDuration: safe(v.duration, v.sessions), bounceRate: safe(v.bounces, v.sessions),
      conversions: v.conversions, conversionRate: safe(v.conversions, v.sessions),
    };
  });
}

// ───────────────────────────── Time-of-day patterns ─────────────────────────────

const gauss = (h: number, mu: number, sd: number) => Math.exp(-((h - mu) ** 2) / (2 * sd * sd));
export const HOUR_PROFILE: Record<DeviceId, number[]> = (() => {
  const mk = (fn: (h: number) => number) => {
    const raw = Array.from({ length: 24 }, (_, h) => fn(h));
    const s = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / s);
  };
  return {
    desktop: mk((h) => 0.04 + gauss(h, 10.5, 2.2) * 0.9 + gauss(h, 14.5, 2.0) * 0.85 + gauss(h, 20, 1.8) * 0.3),
    mobile: mk((h) => 0.05 + gauss(h, 8, 1.4) * 0.35 + gauss(h, 12.5, 1.2) * 0.5 + gauss(h, 20.5, 2.0) * 1.0 + gauss(h, 23, 1.2) * 0.25),
    tablet: mk((h) => 0.03 + gauss(h, 9, 1.6) * 0.3 + gauss(h, 20.5, 1.6) * 1.0 + gauss(h, 15, 2) * 0.25),
  };
})();

const EVENT_SHIFT: Record<string, (h: number) => number> = {
  'Page Views': () => 1,
  Clicks: () => 1,
  Scrolls: (h) => 1 + 0.15 * gauss(h, 21, 2),
  'Product Views': (h) => 1 + 0.12 * gauss(h, 20, 2.5),
  Searches: (h) => 1 + 0.25 * gauss(h, 10, 2),
  'Add to Cart': (h) => 1 + 0.3 * gauss(h, 20.5, 2),
  Checkouts: (h) => 1 + 0.4 * gauss(h, 21, 1.8),
  Conversions: (h) => 1 + 0.45 * gauss(h, 21, 1.8),
};

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** sessions by day-of-week × hour, rows ordered Mon..Sun */
export function hourlyHeatmap(agg: Aggregation): { row: string; values: number[] }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const nWeeks = Math.max(1, agg.days / 7);
  return order.map((dow) => ({
    row: DOW_LABELS[dow],
    values: Array.from({ length: 24 }, (_, h) =>
      DEVICES.reduce((s, dv) => s + agg.byDowDev[dv.id][dow] * HOUR_PROFILE[dv.id][h], 0) / nWeeks),
  }));
}

export function eventTotals(a: Agg): Record<string, number> {
  return {
    'Page Views': a.pageviews, Clicks: a.clicks, Scrolls: a.scrolls, 'Product Views': a.productViews,
    Searches: a.searches, 'Add to Cart': a.addToCart, Checkouts: a.checkouts, Conversions: a.conversions,
  };
}

/** event type × hour heatmap, each row normalized to its own peak (intensity index) */
export function eventHourHeatmap(agg: Aggregation) {
  const devShare = DEVICES.map((d) => safe(agg.byDev[d.id].sessions, agg.total.sessions));
  const totals = eventTotals(agg.total);
  return EVENT_TYPES.map((ev) => {
    const raw = Array.from({ length: 24 }, (_, h) =>
      DEVICES.reduce((s, d, i) => s + devShare[i] * HOUR_PROFILE[d.id][h], 0) * EVENT_SHIFT[ev](h));
    const sum = raw.reduce((x, y) => x + y, 0) || 1;
    return { row: ev, values: raw.map((r) => (totals[ev] * r) / sum / Math.max(1, agg.days)) };
  });
}

export function dayparts(agg: Aggregation) {
  const hm = hourlyHeatmap(agg);
  const hours = Array.from({ length: 24 }, (_, h) => hm.reduce((s, r) => s + r.values[h], 0));
  const parts = [
    { name: 'Early Morning', range: '05–08', hours: [5, 6, 7, 8] },
    { name: 'Late Morning', range: '09–11', hours: [9, 10, 11] },
    { name: 'Afternoon', range: '12–16', hours: [12, 13, 14, 15, 16] },
    { name: 'Evening', range: '17–21', hours: [17, 18, 19, 20, 21] },
    { name: 'Night', range: '22–04', hours: [22, 23, 0, 1, 2, 3, 4] },
  ];
  const total = hours.reduce((a, b) => a + b, 0) || 1;
  return parts.map((p) => ({ name: p.name, range: p.range, value: p.hours.reduce((s, h) => s + hours[h], 0) / total }));
}

// ───────────────────────────── Pages & navigation ─────────────────────────────

export interface PageRow {
  id: PageId; name: string; path: string; pageviews: number; avgTime: number; scrollDepth: number;
  clicks: number; clicksPerView: number; exits: number; exitRate: number; entries: number; share: number;
}

function segMixWeights(agg: Aggregation, key: SumKey) {
  const t = agg.total[key] || 1;
  return SEGMENTS.map((s) => ({ s, w: agg.bySeg[s.id][key] / t }));
}

export function entryDistribution(agg: Aggregation): Record<PageId, number> {
  const ch = channelBreakdown(agg);
  const landing = landingFlows(ch);
  const out = Object.fromEntries(PAGES.map((p) => [p.id, 0])) as Record<PageId, number>;
  for (const f of landing) {
    if (f.landing === 'content') { out.blog += f.value * 0.42; out.guides += f.value * 0.58; }
    else if (f.landing === 'category') { out.category += f.value * 0.72; out.deals += f.value * 0.28; }
    else if (f.landing === 'product') { out.product += f.value * 0.9; out.compare += f.value * 0.04; out.reviews += f.value * 0.06; }
    else if (f.landing === 'home') { out.home += f.value * 0.94; out.help += f.value * 0.03; out.search += f.value * 0.03; }
    else out.campaign += f.value;
  }
  return out;
}

export function pageBreakdown(agg: Aggregation): PageRow[] {
  const mix = segMixWeights(agg, 'pageviews');
  const raw = PAGES.map((p) => mix.reduce((s, { s: seg, w }) => s + w * p.weight * (p.segIdx[seg.id] ?? 1), 0));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const m = metricsOf(agg.total, agg.days, 0);
  const durScale = m.avgSessionDuration / 230;
  const depthScale = m.scrollDepth / 0.5;
  const mobileShare = safe(agg.byDev.mobile.sessions, agg.total.sessions);
  const entries = entryDistribution(agg);
  const exitRaw = PAGES.map((p, i) => (raw[i] / sum) * p.exitRate * (p.id === 'checkout' || p.id === 'cart' ? 1 + mobileShare * 0.6 : 1));
  const exitSum = exitRaw.reduce((a, b) => a + b, 0) || 1;
  return PAGES.map((p, i) => {
    const pv = agg.total.pageviews * raw[i] / sum;
    const exits = agg.total.sessions * exitRaw[i] / exitSum;
    const clicksPerView = p.clicksPerView * safe(agg.total.clicks, agg.total.pageviews) / 2.3;
    return {
      id: p.id, name: p.name, path: p.path, pageviews: pv,
      avgTime: p.avgTime * Math.pow(durScale, 0.6),
      scrollDepth: Math.min(0.97, p.scroll * Math.pow(depthScale, 0.5)),
      clicks: pv * clicksPerView, clicksPerView, exits, exitRate: safe(exits, pv), entries: entries[p.id], share: raw[i] / sum,
    };
  });
}

/** probability of each next page (incl. exit) given current page, for the filtered audience */
export function nextPageProbs(agg: Aggregation, page: PageId): { to: PageId | 'exit'; p: number }[] {
  const rows = pageBreakdown(agg);
  const row = rows.find((r) => r.id === page)!;
  const exitP = Math.min(0.9, row.exitRate);
  const trans = TRANSITIONS[page];
  const intentShare = safe(agg.total.addToCart, agg.total.interested) / 0.22;
  const weights = Object.entries(trans).filter(([, w]) => (w ?? 0) > 0).map(([to, w]) => {
    let adj = w as number;
    if (to === 'cart' || to === 'checkout') adj *= Math.pow(intentShare, 0.7);
    return { to: to as PageId, w: adj };
  });
  const ws = weights.reduce((s, x) => s + x.w, 0) || 1;
  return [
    ...weights.map((x) => ({ to: x.to, p: (1 - exitP) * x.w / ws })),
    { to: 'exit' as const, p: exitP },
  ].sort((a, b) => b.p - a.p);
}

export interface SankeyNode { id: string; name: string; column: number; color: string; value?: number; meta?: string; }
export interface SankeyLink { source: string; target: string; value: number; }
export interface SankeyData { nodes: SankeyNode[]; links: SankeyLink[]; columns: string[]; }

const PAGE_COLORS: Record<string, string> = {
  home: '#60a5fa', category: '#818cf8', product: '#22d3ee', compare: '#34d399', search: '#a78bfa', reviews: '#10b981',
  blog: '#f472b6', guides: '#c084fc', deals: '#fbbf24', campaign: '#fb7185', cart: '#2dd4bf', checkout: '#4ade80', help: '#94a3b8',
  exit: '#475569', other: '#64748b',
};
export const pageColor = (id: string) => PAGE_COLORS[id] ?? '#64748b';

/** Layered navigation flow: Entry → Step 2 → Step 3 → Step 4 (top pages per step, rest grouped). */
export function navigationSankey(agg: Aggregation, steps = 4, topN = 6): SankeyData {
  const entries = entryDistribution(agg);
  const probCache = new Map<PageId, { to: PageId | 'exit'; p: number }[]>();
  const probs = (p: PageId) => { if (!probCache.has(p)) probCache.set(p, nextPageProbs(agg, p)); return probCache.get(p)!; };
  const bounce = safe(agg.total.bounces, agg.total.sessions);

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  let level: Map<string, { pages: Record<PageId, number>; total: number }> = new Map();

  // level 0 grouping
  const pick = (vals: Record<string, number>) => {
    const sorted = Object.entries(vals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    return { keep: new Set(sorted.slice(0, topN).map(([k]) => k)), sorted };
  };
  {
    const { keep } = pick(entries);
    for (const [pid, v] of Object.entries(entries) as [PageId, number][]) {
      if (v <= 0) continue;
      const key = keep.has(pid) ? pid : 'other';
      const g = level.get(key) ?? { pages: {} as Record<PageId, number>, total: 0 };
      g.pages[pid] = (g.pages[pid] ?? 0) + v; g.total += v;
      level.set(key, g);
    }
    for (const [key, g] of level) nodes.push({ id: `0:${key}`, name: key === 'other' ? 'Other entries' : PAGE_MAP[key as PageId].name, column: 0, color: pageColor(key), value: g.total });
  }

  for (let step = 1; step < steps; step++) {
    const nextRaw: Record<string, number> = {};
    const flows: { from: string; to: string; page: PageId | 'exit'; v: number }[] = [];
    for (const [key, g] of level) {
      for (const [pid, v] of Object.entries(g.pages) as [PageId, number][]) {
        const pr = probs(pid);
        // first step exit follows the bounce rate; later steps use page exit probabilities
        const exitP = step === 1 ? Math.min(0.85, bounce * (LANDINGS.find((l) => l.page === pid)?.bounceW ?? 1)) : pr.find((x) => x.to === 'exit')!.p;
        const nonExit = pr.filter((x) => x.to !== 'exit');
        const ns = nonExit.reduce((s, x) => s + x.p, 0) || 1;
        flows.push({ from: key, to: 'exit', page: 'exit', v: v * exitP });
        for (const x of nonExit) {
          const fv = v * (1 - exitP) * x.p / ns;
          flows.push({ from: key, to: x.to, page: x.to, v: fv });
          nextRaw[x.to] = (nextRaw[x.to] ?? 0) + fv;
        }
      }
    }
    const { keep } = pick(nextRaw);
    const nextLevel: typeof level = new Map();
    const linkAcc = new Map<string, number>();
    const exitNodeId = `${step}:exit`;
    let exitTotal = 0;
    for (const fl of flows) {
      if (fl.page === 'exit') {
        exitTotal += fl.v;
        linkAcc.set(`${step - 1}:${fl.from}→${exitNodeId}`, (linkAcc.get(`${step - 1}:${fl.from}→${exitNodeId}`) ?? 0) + fl.v);
        continue;
      }
      const key = keep.has(fl.page) ? fl.page : 'other';
      const g = nextLevel.get(key) ?? { pages: {} as Record<PageId, number>, total: 0 };
      g.pages[fl.page] = (g.pages[fl.page] ?? 0) + fl.v; g.total += fl.v;
      nextLevel.set(key, g);
      const lk = `${step - 1}:${fl.from}→${step}:${key}`;
      linkAcc.set(lk, (linkAcc.get(lk) ?? 0) + fl.v);
    }
    for (const [key, g] of [...nextLevel].sort((a, b) => b[1].total - a[1].total))
      nodes.push({ id: `${step}:${key}`, name: key === 'other' ? 'Other pages' : PAGE_MAP[key as PageId].name, column: step, color: pageColor(key), value: g.total });
    nodes.push({ id: exitNodeId, name: 'Exit', column: step, color: pageColor('exit'), value: exitTotal, meta: 'dropoff' });
    for (const [lk, v] of linkAcc) {
      const [source, target] = lk.split('→');
      links.push({ source, target, value: v });
    }
    level = nextLevel;
  }
  return { nodes, links, columns: ['Entry page', 'Step 2', 'Step 3', 'Step 4'].slice(0, steps) };
}

export function pageCombinations(agg: Aggregation, top = 10) {
  const rows = pageBreakdown(agg);
  const pairs = new Map<string, number>();
  for (const r of rows) {
    for (const x of nextPageProbs(agg, r.id)) {
      if (x.to === 'exit' || x.to === r.id) continue;
      const k = [r.id, x.to].sort().join('+');
      pairs.set(k, (pairs.get(k) ?? 0) + r.pageviews * x.p);
    }
  }
  const total = agg.total.sessions || 1;
  return [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => {
    const [a, b] = k.split('+') as PageId[];
    return { a: PAGE_MAP[a].name, b: PAGE_MAP[b].name, sessions: v, share: Math.min(1, v / total) };
  });
}

export function searchBehavior(agg: Aggregation) {
  const t = agg.total;
  const intent = safe(t.addToCart, t.interested);
  return {
    searchesPerSession: safe(t.searches, t.sessions),
    searchUsage: Math.min(0.95, safe(t.searches, t.sessions) * 0.78),
    refinementRate: 0.24 + intent * 0.3,
    zeroResultRate: 0.071,
    searchExitRate: 0.19 - intent * 0.12,
    searchToProduct: 0.62 + intent * 0.2,
    searchCvrLift: 1.8 + intent * 2,
  };
}

// ───────────────────────────── Journey ─────────────────────────────

export const STAGES = ['Discovery', 'Landing Page', 'Content Exploration', 'Product Interest', 'Add to Cart', 'Checkout', 'Conversion'] as const;

export function funnel(a: Agg) {
  const vals = [a.sessions, a.landed, a.explored, a.interested, a.addToCart, a.checkouts, a.conversions];
  return STAGES.map((name, i) => ({
    name, value: vals[i],
    fromPrev: i === 0 ? 1 : safe(vals[i], vals[i - 1]),
    dropOff: i === 0 ? 0 : 1 - safe(vals[i], vals[i - 1]),
    fromStart: safe(vals[i], vals[0]),
  }));
}

const STAGE_TIME_BASE = [9, 46, 98, 186, 232, 148];
const SEG_SPEED: Record<SegmentId, number> = { engaged: 0.85, first: 1.25, returning: 1.0, window: 1.45, intent: 0.72, atrisk: 1.15, inactive: 1.3 };
export function stageTimes(agg: Aggregation) {
  let w = 0, sp = 0;
  for (const s of SEGMENTS) { const v = agg.bySeg[s.id].sessions; w += v; sp += v * SEG_SPEED[s.id]; }
  const segF = safe(sp, w) || 1;
  const mob = safe(agg.byDev.mobile.sessions, agg.total.sessions);
  return STAGE_TIME_BASE.map((t, i) => ({
    from: STAGES[i], to: STAGES[i + 1],
    seconds: t * segF * (1 + (i >= 3 ? mob * 0.35 : mob * 0.1)),
  }));
}

function landingFlows(ch: ChannelRow[]) {
  const out: { channel: ChannelId; landing: LandingId; value: number }[] = [];
  for (const c of ch) {
    const dim = CHANNELS.find((x) => x.id === c.id)!;
    for (const l of LANDINGS) out.push({ channel: c.id, landing: l.id, value: c.sessions * dim.landing[l.id] });
  }
  return out;
}

/** Landing × engagement-stage matrix fitted (IPF) to the funnel totals. */
function landingStageMatrix(agg: Aggregation) {
  const ch = channelBreakdown(agg);
  const lf = landingFlows(ch);
  const L = LANDINGS.map((l) => lf.filter((f) => f.landing === l.id).reduce((s, f) => s + f.value, 0));
  const t = agg.total;
  const S = [t.bounces, Math.max(0, t.landed - t.interested), t.interested];
  const b = safe(t.bounces, t.sessions), pI = safe(t.interested, t.landed);
  let m = LANDINGS.map((l, i) => [L[i] * b * l.bounceW, L[i] * (1 - b) * (1 - pI) / l.productW, L[i] * (1 - b) * pI * l.productW]);
  for (let it = 0; it < 30; it++) {
    m = m.map((row, i) => { const s = row.reduce((x, y) => x + y, 0) || 1; return row.map((v) => v * L[i] / s); });
    for (let j = 0; j < 3; j++) { const s = m.reduce((x, r) => x + r[j], 0) || 1; m.forEach((r) => (r[j] *= S[j] / s)); }
  }
  return { ch, lf, L, m };
}

export function journeySankey(agg: Aggregation): SankeyData {
  const { ch, lf, m } = landingStageMatrix(agg);
  const t = agg.total;
  const nodes: SankeyNode[] = [
    ...ch.map((c) => ({ id: `ch:${c.id}`, name: c.name, column: 0, color: c.color, value: c.sessions })),
    ...LANDINGS.map((l) => ({ id: `ld:${l.id}`, name: l.name, column: 1, color: pageColor(l.page) })),
    { id: 'st:bounce', name: 'Bounced', column: 2, color: '#475569', meta: 'dropoff' },
    { id: 'st:browse', name: 'Browsed Content', column: 2, color: '#c084fc', meta: 'dropoff' },
    { id: 'st:interest', name: 'Product Interest', column: 2, color: '#22d3ee' },
    { id: 'ct:left', name: 'Left at Product', column: 3, color: '#64748b', meta: 'dropoff' },
    { id: 'ct:cart', name: 'Added to Cart', column: 3, color: '#2dd4bf' },
    { id: 'co:cartab', name: 'Cart Abandoned', column: 4, color: '#f59e0b', meta: 'dropoff' },
    { id: 'co:checkout', name: 'Checkout Started', column: 4, color: '#34d399' },
    { id: 'cv:abandon', name: 'Checkout Abandoned', column: 5, color: '#fb7185', meta: 'dropoff' },
    { id: 'cv:converted', name: 'Converted', column: 5, color: '#4ade80', meta: 'goal' },
  ];
  const links: SankeyLink[] = [];
  for (const f of lf) if (f.value > 0) links.push({ source: `ch:${f.channel}`, target: `ld:${f.landing}`, value: f.value });
  const stIds = ['st:bounce', 'st:browse', 'st:interest'];
  LANDINGS.forEach((l, i) => m[i].forEach((v, j) => v > 0 && links.push({ source: `ld:${l.id}`, target: stIds[j], value: v })));
  links.push({ source: 'st:interest', target: 'ct:left', value: Math.max(0, t.interested - t.addToCart) });
  links.push({ source: 'st:interest', target: 'ct:cart', value: t.addToCart });
  links.push({ source: 'ct:cart', target: 'co:cartab', value: Math.max(0, t.addToCart - t.checkouts) });
  links.push({ source: 'ct:cart', target: 'co:checkout', value: t.checkouts });
  links.push({ source: 'co:checkout', target: 'cv:abandon', value: Math.max(0, t.checkouts - t.conversions) });
  links.push({ source: 'co:checkout', target: 'cv:converted', value: t.conversions });
  return { nodes, links: links.filter((l) => l.value > 0.5), columns: ['Traffic source', 'Landing', 'Engagement', 'Cart', 'Checkout', 'Outcome'] };
}

export function journeyPaths(agg: Aggregation, top = 8) {
  const { ch, lf, L, m } = landingStageMatrix(agg);
  const t = agg.total;
  const convPerInterest = safe(t.conversions, t.interested);
  const cvrNorm = ch.reduce((s, c) => s + c.share * CHANNELS.find((x) => x.id === c.id)!.cvrIdx, 0) || 1;
  const stageNames = ['Bounced', 'Browsed (no product)', 'Product Interest'];
  const paths: { path: string[]; sessions: number; conversions: number; conversionRate: number; completed: boolean }[] = [];
  lf.forEach((f) => {
    const li = LANDINGS.findIndex((l) => l.id === f.landing);
    const cdim = CHANNELS.find((x) => x.id === f.channel)!;
    for (let j = 1; j < 3; j++) {
      const v = f.value * safe(m[li][j], L[li]);
      if (j === 2) {
        const conv = v * convPerInterest * cdim.cvrIdx / cvrNorm;
        paths.push({ path: [cdim.name, LANDINGS[li].name, 'Product Interest', 'Add to Cart', 'Conversion'], sessions: v, conversions: conv, conversionRate: safe(conv, v), completed: true });
      } else {
        paths.push({ path: [cdim.name, LANDINGS[li].name, stageNames[j], 'Exit'], sessions: v, conversions: 0, conversionRate: 0, completed: false });
      }
    }
  });
  const total = t.sessions || 1;
  return paths.sort((a, b) => b.sessions - a.sessions).slice(0, top).map((p) => ({ ...p, share: p.sessions / total }));
}

// ───────────────────────────── Audience ─────────────────────────────

function mixDist(agg: Aggregation, dist: Record<SegmentId, number[]>, key: SumKey = 'visitors') {
  const len = Object.values(dist)[0].length;
  const out = new Array(len).fill(0);
  for (const s of SEGMENTS) {
    const v = agg.bySeg[s.id][key];
    dist[s.id].forEach((p, i) => (out[i] += v * p));
  }
  return out;
}

export function ageDistribution(agg: Aggregation) {
  const uniques = estimateUniques(agg);
  const panel = uniques * AGE_CONSENT_RATE;
  const raw = mixDist(agg, AGE_DIST);
  const s = raw.reduce((a, b) => a + b, 0) || 1;
  return { panelSize: panel, rows: raw.map((v, i) => ({ band: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'][i], share: v / s, count: panel * v / s })) };
}

export function frequencyDistribution(agg: Aggregation) {
  const raw = mixDist(agg, FREQ_DIST);
  const s = raw.reduce((a, b) => a + b, 0) || 1;
  return ['1 visit', '2–3 visits', '4–7 visits', '8–15 visits', '16+ visits'].map((band, i) => ({ band, share: raw[i] / s }));
}

export function engagementCategories(agg: Aggregation) {
  const raw = mixDist(agg, ENGAGEMENT_DIST, 'sessions');
  const s = raw.reduce((a, b) => a + b, 0) || 1;
  const colors = ['#22d3ee', '#3b82f6', '#8b5cf6', '#f472b6', '#475569'];
  return ['Very High', 'High', 'Medium', 'Low', 'Minimal'].map((name, i) => ({ name, share: raw[i] / s, value: raw[i], color: colors[i] }));
}

export function browserBreakdown(agg: Aggregation) {
  const acc: Record<string, number> = {};
  for (const d of DEVICES) for (const [b, p] of Object.entries(BROWSERS[d.id])) acc[b] = (acc[b] ?? 0) + agg.byDev[d.id].sessions * p;
  const total = agg.total.sessions || 1;
  return Object.entries(acc).map(([name, v]) => ({ name, sessions: v, share: v / total })).sort((a, b) => b.sessions - a.sessions);
}

/** suppress small cells (k-anonymity) */
export const suppressed = (n: number) => n > 0 && n < K_ANON;

// ───────────────────────────── Behavior ─────────────────────────────

export function clickPatterns(agg: Aggregation) {
  return CLICK_TARGETS.map((c) => ({ ...c, clicks: agg.total.clicks * c.share }));
}

export function engagementFunnel(a: Agg) {
  const depth = safe(a.scrollDepthSum, a.pageviews);
  const steps = [
    { name: 'Sessions', value: a.sessions },
    { name: 'Engaged (non-bounce)', value: a.landed },
    { name: 'Scrolled ≥ 50%', value: a.landed * Math.min(0.97, 0.45 + depth * 0.6) },
    { name: 'Interacted (click)', value: a.explored },
    { name: 'Viewed Product', value: a.interested },
    { name: 'Added to Cart', value: a.addToCart },
  ];
  return steps.map((s, i) => ({ ...s, rate: safe(s.value, steps[0].value), step: i === 0 ? 1 : safe(s.value, steps[i - 1].value) }));
}

export function navigationStats(agg: Aggregation) {
  const t = agg.total;
  const m = metricsOf(t, agg.days, 0);
  return {
    avgDepth: m.pagesPerSession,
    backNavRate: 0.12 + (1 - m.scrollDepth) * 0.1,
    menuNavShare: 0.34 + (m.bounceRate - 0.35) * 0.2,
    searchNavShare: safe(t.searches, t.pageviews) * 2.2,
    interactionsPerSession: m.clicksPerSession,
    avgScrollDepth: m.scrollDepth,
  };
}

export function contentEngagement(agg: Aggregation) {
  const mix = segMixWeights(agg, 'sessions');
  const raw = CONTENT_TYPES.map((c) => mix.reduce((s, { s: seg, w }) => s + w * c.share * (c.segIdx[seg.id] ?? 1), 0));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const eng = engagementScore(agg.total) / 50;
  return CONTENT_TYPES.map((c, i) => ({
    id: c.id, name: c.name, color: c.color, share: raw[i] / sum,
    completion: Math.min(0.95, c.completion * Math.pow(eng, 0.3)),
    avgTime: c.avgTime * Math.pow(eng, 0.4), assist: c.assist,
    views: agg.total.pageviews * 0.18 * raw[i] / sum,
  }));
}

export function sessionFrequencyByDay(agg: Aggregation) {
  // sessions per visitor per day
  return dailySeries(agg).map((p) => ({ label: p.label, value: safe(p.sessions, p.visitors) }));
}

// ───────────────────────────── Preferences ─────────────────────────────

export function categoryPreferences(agg: Aggregation) {
  const mix = segMixWeights(agg, 'productViews');
  const regTotal = agg.total.productViews || 1;
  const raw = CATEGORIES.map((c) => {
    const segF = mix.reduce((s, { s: seg, w }) => s + w * (c.segIdx[seg.id] ?? 1), 0);
    const regF = REGIONS.reduce((s, r) => s + (agg.byReg[r.id].productViews / regTotal) * (c.regionIdx[r.id] ?? 1), 0);
    return c.weight * segF * regF;
  });
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const cvr = safe(agg.total.conversions, agg.total.interested);
  const cvrIdx: Record<string, number> = { electronics: 0.82, home: 0.95, fashion: 1.1, sports: 1.0, beauty: 1.35, books: 1.4, toys: 1.15, grocery: 1.6 };
  return CATEGORIES.map((c, i) => {
    const views = agg.total.productViews * raw[i] / sum;
    return {
      id: c.id, name: c.name, color: c.color, share: raw[i] / sum, views,
      conversionRate: cvr * cvrIdx[c.id],
      children: c.sub.map((s) => ({ name: s.name, value: views * s.w, parent: c.name, color: c.color })),
    };
  }).sort((a, b) => b.share - a.share);
}

export function keywordPreferences(agg: Aggregation, category?: string) {
  const cats = categoryPreferences(agg);
  const catShare = Object.fromEntries(cats.map((c) => [c.id, c.share]));
  const base = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight]));
  const raw = KEYWORDS.map((k) => k.weight * (k.category === 'help' ? 1 : (catShare[k.category] ?? 0.1) / (base[k.category] ?? 0.1)));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const latestBoost = agg.start + agg.days > 150 ? 1 : 0.6;
  return KEYWORDS.map((k, i) => ({
    term: k.term, category: k.category, searches: agg.total.searches * 0.62 * raw[i] / sum,
    trend: k.trend * latestBoost, share: raw[i] / sum,
  })).filter((k) => !category || category === 'all' || k.category === category).sort((a, b) => b.searches - a.searches);
}

export function featurePreferences(agg: Aggregation) {
  const mix = segMixWeights(agg, 'sessions');
  return FEATURES.map((f) => ({
    name: f.name,
    usage: Math.min(0.95, mix.reduce((s, { s: seg, w }) => s + w * f.usage * (f.segIdx[seg.id] ?? 1), 0)),
    cvrLift: f.cvrLift,
  })).sort((a, b) => b.usage - a.usage);
}

export function topContent(agg: Aggregation, category?: string) {
  const cats = categoryPreferences(agg);
  const catShare = Object.fromEntries(cats.map((c) => [c.id, c.share]));
  const base = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight]));
  const eng = engagementScore(agg.total) / 50;
  return TOP_CONTENT.map((c) => {
    const f = c.category === 'help' ? 1 : (catShare[c.category] ?? 0.1) / (base[c.category] ?? 0.1);
    return {
      ...c, engaged: c.engaged * Math.pow(eng, 0.4),
      views: agg.total.pageviews * 0.012 * c.views * f,
      score: Math.round(Math.min(99, (c.completion * 55 + c.assist * 120 + c.engaged / 8) * Math.pow(eng, 0.25))),
    };
  }).filter((c) => !category || category === 'all' || c.category === category).sort((a, b) => b.score - a.score);
}

// ───────────────────────────── Simulated predictions ─────────────────────────────

export interface Scenario {
  campaignBudget: number;   // % change -50..100
  personalization: number;  // 0..100
  emailCadence: number;     // per week 0..7 (baseline 2)
  discount: number;         // % 0..30
  pageSpeed: number;        // % improvement 0..50
  retargeting: boolean;
}
export const BASE_SCENARIO: Scenario = { campaignBudget: 0, personalization: 0, emailCadence: 2, discount: 0, pageSpeed: 0, retargeting: false };

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(Math.max(1e-6, p) / Math.max(1e-6, 1 - p));

export interface Probabilities { purchaseIntent: number; churnRisk: number; repeatVisit: number; conversion: number; }

function baseLogits(a: Agg, retention: number) {
  const eng = engagementScore(a) / 100;
  const cartRate = safe(a.addToCart, a.interested);
  const returning = 1 - safe(a.newVisitors, a.visitors);
  return {
    purchaseIntent: -1.6 + 4.0 * cartRate + 1.2 * eng,
    churnRisk: 1.2 - 3.2 * retention - 1.5 * eng,
    repeatVisit: -1.0 + 2.6 * returning + 1.4 * eng,
    conversion: logit(safe(a.conversions, a.sessions)),
  };
}

function scenarioDeltas(s: Scenario) {
  const b = Math.log(1 + s.campaignBudget / 100);
  const e = s.emailCadence - 2;
  return {
    purchaseIntent: 0.35 * b + 0.006 * s.personalization + 0.02 * s.discount + 0.004 * s.pageSpeed + (s.retargeting ? 0.18 : 0),
    churnRisk: -0.1 * b - 0.008 * s.personalization - 0.1 * e + 0.06 * Math.max(0, s.emailCadence - 4) ** 2 - 0.01 * s.discount,
    repeatVisit: 0.15 * b + 0.006 * s.personalization + 0.12 * e - 0.03 * e * e + (s.retargeting ? 0.2 : 0),
    conversion: 0.25 * b + 0.004 * s.personalization + 0.035 * s.discount + 0.008 * s.pageSpeed + (s.retargeting ? 0.12 : 0),
  };
}

export function weightedRetention(agg: Aggregation) {
  let w = 0, r = 0;
  for (const s of SEGMENTS) { const v = agg.bySeg[s.id].visitors; w += v; r += v * s.retention; }
  return safe(r, w);
}

export function predict(a: Agg, retention: number, s: Scenario): Probabilities {
  const b = baseLogits(a, retention);
  const d = scenarioDeltas(s);
  return {
    purchaseIntent: sigmoid(b.purchaseIntent + d.purchaseIntent),
    churnRisk: sigmoid(b.churnRisk + d.churnRisk),
    repeatVisit: sigmoid(b.repeatVisit + d.repeatVisit),
    conversion: sigmoid(b.conversion + d.conversion),
  };
}

export function trafficMultiplier(s: Scenario) {
  return Math.max(0.3, 1 + 0.42 * Math.log(1 + s.campaignBudget / 100) + (s.retargeting ? 0.04 : 0) + 0.04 * (s.emailCadence - 2) / 2);
}

/** Simple, transparent forecast: linear trend over trailing history + day-of-week seasonality. NOT a trained model. */
export function forecast(cells: Cell[], f: Filters, s: Scenario, horizon = 30) {
  const histDays = Math.min(60, f.end + 1);
  const hist = aggregate(cells, f, f.end - histDays + 1, f.end);
  const series = hist.byDay.map((a) => a.conversions);
  const sess = hist.byDay.map((a) => a.sessions);
  const n = series.length;
  const xs = series.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = series.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s2, x, i) => s2 + (x - mx) * (series[i] - my), 0) / (xs.reduce((s2, x) => s2 + (x - mx) ** 2, 0) || 1);
  const icpt = my - slope * mx;
  const dowF = new Array(7).fill(0), dowN = new Array(7).fill(0);
  series.forEach((v, i) => { const dow = new Date(dateAt(hist.start + i) + 'T00:00:00Z').getUTCDay(); const fit = icpt + slope * i; dowF[dow] += v / (fit || 1); dowN[dow]++; });
  const dow = dowF.map((v, i) => (dowN[i] ? v / dowN[i] : 1));
  const resid = series.map((v, i) => v - (icpt + slope * i) * dow[new Date(dateAt(hist.start + i) + 'T00:00:00Z').getUTCDay()]);
  const sd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / Math.max(1, n - 2));
  const ret = weightedRetention(hist);
  const pb = predict(hist.total, ret, BASE_SCENARIO), ps = predict(hist.total, ret, s);
  const lift = (ps.conversion / (pb.conversion || 1)) * trafficMultiplier(s);
  const aovB = safe(hist.total.revenue, hist.total.conversions);
  const aovS = aovB * (1 - s.discount / 100 * 0.85);
  const points: { label: string; date: string; actual?: number; baseline?: number; scenario?: number; band?: [number, number] }[] = [];
  const showHist = Math.min(n, 45);
  for (let i = n - showHist; i < n; i++) {
    const date = dateAt(hist.start + i);
    points.push({ date, label: fmtDate(date), actual: series[i] });
  }
  let baseSum = 0, scenSum = 0, baseSess = 0, scenSess = 0;
  const avgSess = sess.slice(-14).reduce((a, b) => a + b, 0) / Math.min(14, n);
  for (let h = 1; h <= horizon; h++) {
    const idx = f.end + h;
    const date = dateAt(idx);
    const d = new Date(date + 'T00:00:00Z').getUTCDay();
    const base = Math.max(0, (icpt + slope * (n - 1 + h)) * dow[d]);
    const scen = base * lift;
    const w = 1.64 * sd * Math.sqrt(1 + h / 10);
    baseSum += base; scenSum += scen; baseSess += avgSess; scenSess += avgSess * trafficMultiplier(s);
    points.push({ date, label: fmtDate(date), baseline: base, scenario: scen, band: [Math.max(0, scen - w), scen + w] });
  }
  // connect history to forecast visually
  const lastHist = points[showHist - 1];
  lastHist.baseline = lastHist.actual; lastHist.scenario = lastHist.actual; lastHist.band = [lastHist.actual!, lastHist.actual!];
  const last30 = series.slice(-30).reduce((a, b) => a + b, 0);
  return {
    points,
    summary: {
      actualConversions30: last30,
      actualRevenue30: hist.byDay.slice(-30).reduce((a, b) => a + b.revenue, 0),
      baselineConversions: baseSum, scenarioConversions: scenSum,
      baselineRevenue: baseSum * aovB, scenarioRevenue: scenSum * aovS,
      baselineSessions: baseSess, scenarioSessions: scenSess,
      uncertainty: 1.64 * sd * Math.sqrt(horizon),
    },
    base: pb, scen: ps,
  };
}

export function predictedFunnel(a: Agg, retention: number, s: Scenario) {
  const pb = predict(a, retention, BASE_SCENARIO), ps = predict(a, retention, s);
  const traffic = trafficMultiplier(s);
  const landedLift = 1 + s.pageSpeed / 100 * 0.18;
  const cartLift = ps.purchaseIntent / (pb.purchaseIntent || 1);
  const totalLift = ps.conversion / (pb.conversion || 1);
  const restLift = Math.max(0.5, totalLift / (landedLift * cartLift));
  const base = funnel(a);
  const lifts = [1, landedLift, landedLift, landedLift * Math.sqrt(cartLift), landedLift * cartLift, landedLift * cartLift * Math.sqrt(restLift), landedLift * cartLift * restLift];
  return base.map((st, i) => ({ name: st.name, baseline: st.value, scenario: st.value * traffic * Math.min(lifts[i], i === 0 ? 1 : 10) }));
}

export const NEXT_BEST_CONTENT: Record<SegmentId, { signal: string; content: string; channel: string; rationale: string }> = {
  engaged: { signal: 'Deep scroll + high revisit', content: 'Early-access collections & loyalty perks', channel: 'On-site + Email', rationale: 'Reward depth; keep momentum without discounting' },
  first: { signal: 'Shallow first session', content: 'Buying guides & social proof (reviews)', channel: 'On-site', rationale: 'Guides lift exploration for new arrivals' },
  returning: { signal: 'Repeat category browsing', content: 'Personalized “picked for you” carousel', channel: 'On-site', rationale: 'Category affinity is the strongest next-click signal' },
  window: { signal: 'Many product views, few carts', content: 'Comparison tables + price-drop alerts', channel: 'On-site + Push (opt-in)', rationale: 'Resolve choice overload, create a reason to return' },
  intent: { signal: 'Compare/review + cart activity', content: 'Delivery-date promise & checkout reassurance', channel: 'On-site', rationale: 'Remove last-mile friction rather than add offers' },
  atrisk: { signal: 'Declining visit frequency', content: '“What’s new since your last visit” digest', channel: 'Email (opted-in)', rationale: 'Re-engage with novelty before incentives' },
  inactive: { signal: 'Single-page, sub-45s visits', content: 'Lightweight landing with clear value props', channel: 'Landing pages', rationale: 'Reduce bounce with faster, focused entry pages' },
};

// ───────────────────────────── Rule-based insights ─────────────────────────────

export interface Insight {
  id: string; title: string; detail: string; kind: 'opportunity' | 'risk' | 'trend' | 'info';
  metric: string; section: string; recommendation: string; rule: string;
}

export function generateInsights(cells: Cell[], f: Filters, agg: Aggregation, prev: Aggregation | null): Insight[] {
  const out: Insight[] = [];
  const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
  const t = agg.total;
  if (t.sessions < K_ANON) return out;

  // 1. returning vs first-time engagement
  const first = agg.bySeg.first, nonFirst = emptyAgg();
  for (const s of SEGMENTS) if (s.id !== 'first') addInto(nonFirst, agg.bySeg[s.id]);
  if (first.sessions > K_ANON && nonFirst.sessions > K_ANON) {
    const ef = engagementScore(first), er = engagementScore(nonFirst);
    if (er > ef) out.push({
      id: 'ret-vs-new', kind: 'info', section: 'audience', metric: `${er.toFixed(0)} vs ${ef.toFixed(0)}`,
      title: 'Returning visitors show higher engagement than first-time visitors',
      detail: `Engagement score for returning audiences is ${er.toFixed(1)} vs ${ef.toFixed(1)} for first-time visitors (${((er / ef - 1) * 100).toFixed(0)}% higher), with ${(safe(nonFirst.duration, nonFirst.sessions) / 60).toFixed(1)} vs ${(safe(first.duration, first.sessions) / 60).toFixed(1)} min average sessions.`,
      recommendation: 'Invest in first-session onboarding content (guides, reviews) to accelerate the path to a second visit.',
      rule: 'engagement(returning) > engagement(first-time)',
    });
  }

  // 2. mobile checkout abandonment
  const mob = agg.byDev.mobile, desk = agg.byDev.desktop;
  if (mob.addToCart > K_ANON && desk.addToCart > K_ANON) {
    const am = 1 - safe(mob.conversions, mob.addToCart), ad = 1 - safe(desk.conversions, desk.addToCart);
    if (am > ad) out.push({
      id: 'mobile-abandon', kind: 'risk', section: 'journey', metric: `${pct(am)} vs ${pct(ad)}`,
      title: 'Mobile users have a higher checkout abandonment rate',
      detail: `${pct(am)} of mobile carts do not convert compared with ${pct(ad)} on desktop — a ${((am - ad) * 100).toFixed(1)} pt gap. Mobile drives ${pct(safe(mob.sessions, t.sessions), 0)} of sessions.`,
      recommendation: 'Prioritize mobile checkout: express wallets, fewer form fields, persistent cart summary.',
      rule: 'cart_abandonment(mobile) > cart_abandonment(desktop)',
    });
  }

  // 3. comparison pages
  const cmp = nextPageProbs(agg, 'compare').find((x) => x.to === 'cart')?.p ?? 0;
  const prod = nextPageProbs(agg, 'product').find((x) => x.to === 'cart')?.p ?? 0;
  if (cmp > prod) out.push({
    id: 'compare-intent', kind: 'opportunity', section: 'browsing', metric: `${(cmp / Math.max(prod, 1e-6)).toFixed(1)}× cart rate`,
    title: 'Product comparison pages generate strong purchase intent',
    detail: `${pct(cmp)} of comparison page views lead directly to the cart vs ${pct(prod)} from a standard product page. Compare feature users convert ${FEATURES.find((x) => x.name === 'Product Compare')!.cvrLift.toFixed(1)}× more often.`,
    recommendation: 'Surface “Compare” entry points on category listings and in search results.',
    rule: 'P(cart | compare) > P(cart | product)',
  });

  // 4. organic search time
  const ch = channelBreakdown(agg);
  const org = ch.find((c) => c.id === 'organic')!;
  const avgDur = safe(t.duration, t.sessions);
  if (org.avgDuration > avgDur) out.push({
    id: 'organic-time', kind: 'info', section: 'overview', metric: `${(org.avgDuration / 60).toFixed(1)} min`,
    title: 'Visitors arriving from organic search spend more time exploring content',
    detail: `Organic search sessions average ${(org.avgDuration / 60).toFixed(1)} min vs ${(avgDur / 60).toFixed(1)} min site-wide (+${((org.avgDuration / avgDur - 1) * 100).toFixed(0)}%), with a ${pct(org.bounceRate)} bounce rate.`,
    recommendation: 'Expand evergreen buying guides that rank for high-intent queries; link them to comparison pages.',
    rule: 'avg_duration(organic) > avg_duration(all)',
  });

  // 5. best converting channel
  const bestCh = [...ch].filter((c) => c.sessions > K_ANON).sort((a, b) => b.conversionRate - a.conversionRate)[0];
  if (bestCh) out.push({
    id: 'best-channel', kind: 'opportunity', section: 'overview', metric: pct(bestCh.conversionRate, 2),
    title: `${bestCh.name} is the highest-converting traffic source`,
    detail: `${bestCh.name} converts at ${pct(bestCh.conversionRate, 2)} vs ${pct(safe(t.conversions, t.sessions), 2)} overall while contributing ${pct(bestCh.share)} of sessions.`,
    recommendation: `Grow ${bestCh.name.toLowerCase()} reach with consented audiences before scaling lower-yield channels.`,
    rule: 'argmax(conversion_rate by channel)',
  });

  // 6. window shoppers
  const ws = agg.bySeg.window;
  if (ws.sessions > K_ANON) {
    const pvps = safe(ws.productViews, ws.sessions), cart = safe(ws.addToCart, ws.interested);
    out.push({
      id: 'window', kind: 'opportunity', section: 'segments', metric: `${pvps.toFixed(1)} views/session`,
      title: 'Window Shoppers browse deeply but rarely add to cart',
      detail: `This segment views ${pvps.toFixed(1)} products per session but only ${pct(cart)} of interested sessions add to cart (site avg ${pct(safe(t.addToCart, t.interested))}).`,
      recommendation: 'Test comparison tables and opt-in price-drop alerts for this segment.',
      rule: 'segment=window AND cart_rate < site_avg',
    });
  }

  // 7. at-risk trend
  const ar = agg.byDaySeg.atrisk;
  if (ar.length >= 28) {
    const recent = ar.slice(-14).reduce((a, b) => a + b, 0), prior = ar.slice(-28, -14).reduce((a, b) => a + b, 0);
    const g = safe(recent, prior) - 1;
    if (g > 0.01 && recent > K_ANON) out.push({
      id: 'atrisk', kind: 'risk', section: 'predictive', metric: `+${pct(g)}`,
      title: 'At-Risk Customers are growing',
      detail: `At-Risk visitor-days rose ${pct(g)} in the last 14 days vs the prior 14 days. Simulated churn risk for this segment is elevated.`,
      recommendation: 'Trigger a re-engagement digest for opted-in subscribers before offering discounts.',
      rule: 'growth_14d(at-risk) > 1%',
    });
  }

  // 8. peak hours
  const hm = hourlyHeatmap(agg);
  let best = { row: '', h: 0, v: 0 };
  hm.forEach((r) => r.values.forEach((v, h) => { if (v > best.v) best = { row: r.row, h, v }; }));
  out.push({
    id: 'peak', kind: 'info', section: 'preferences', metric: `${best.row} ${String(best.h).padStart(2, '0')}:00`,
    title: `Activity peaks on ${best.row} around ${String(best.h).padStart(2, '0')}:00`,
    detail: `Average sessions in this hour reach ${Math.round(best.v).toLocaleString()} — mobile drives evening peaks while desktop dominates late morning.`,
    recommendation: 'Schedule campaign sends and content launches 30–60 minutes before the peak.',
    rule: 'argmax(sessions by weekday × hour)',
  });

  // 9. region conversion
  const regs = REGIONS.map((r) => ({ r, a: agg.byReg[r.id] })).filter((x) => x.a.sessions > K_ANON);
  if (regs.length > 1) {
    const sorted = regs.sort((a, b) => safe(b.a.conversions, b.a.sessions) - safe(a.a.conversions, a.a.sessions));
    const top = sorted[0], low = sorted[sorted.length - 1];
    out.push({
      id: 'region', kind: 'trend', section: 'audience', metric: pct(safe(top.a.conversions, top.a.sessions), 2),
      title: `${top.r.name} leads regional conversion; ${low.r.name} trails`,
      detail: `${top.r.name} converts at ${pct(safe(top.a.conversions, top.a.sessions), 2)} vs ${pct(safe(low.a.conversions, low.a.sessions), 2)} in ${low.r.name}, where mobile accounts for ${pct(safe(agg.byRegDev[low.r.id + '|mobile']?.sessions ?? 0, low.a.sessions), 0)} of sessions.`,
      recommendation: `Localize payment options and delivery messaging for ${low.r.name}.`,
      rule: 'max/min(conversion_rate by region)',
    });
  }

  // 10. period comparison
  if (prev && prev.total.sessions > K_ANON) {
    const b1 = safe(t.bounces, t.sessions), b0 = safe(prev.total.bounces, prev.total.sessions);
    const c1 = safe(t.conversions, t.sessions), c0 = safe(prev.total.conversions, prev.total.sessions);
    out.push({
      id: 'period', kind: c1 >= c0 ? 'trend' : 'risk', section: 'overview', metric: `${c1 >= c0 ? '+' : ''}${((c1 / c0 - 1) * 100).toFixed(1)}%`,
      title: c1 >= c0 ? 'Conversion rate improved vs the previous period' : 'Conversion rate declined vs the previous period',
      detail: `Conversion rate moved from ${pct(c0, 2)} to ${pct(c1, 2)} and bounce rate from ${pct(b0)} to ${pct(b1)} compared with the preceding ${agg.days} days.`,
      recommendation: c1 >= c0 ? 'Identify which segments drove the lift and protect those journeys.' : 'Drill into the journey funnel to locate the stage with the largest new drop-off.',
      rule: 'Δ conversion_rate (current vs previous period)',
    });
  }

  // 11. campaign landing bounce
  const pages = pageBreakdown(agg);
  const camp = pages.find((p) => p.id === 'campaign')!;
  const avgExit = safe(pages.reduce((s, p) => s + p.exits, 0), pages.reduce((s, p) => s + p.pageviews, 0));
  if (camp.exitRate > avgExit && camp.pageviews > K_ANON) out.push({
    id: 'campaign-exit', kind: 'risk', section: 'behavior', metric: pct(camp.exitRate),
    title: 'Campaign landing page loses visitors faster than average',
    detail: `The Autumn Campaign landing page has a ${pct(camp.exitRate)} exit rate vs ${pct(avgExit)} site-wide, receiving ${Math.round(camp.entries).toLocaleString()} entries.`,
    recommendation: 'A/B test a shorter hero and a direct product grid above the fold.',
    rule: 'exit_rate(campaign LP) > avg exit_rate',
  });

  void cells; void f;
  return out;
}

// ───────────────────────────── helpers ─────────────────────────────

export function fmtDate(date: string) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export { DEVICE_MAP, SEGMENT_MAP };
