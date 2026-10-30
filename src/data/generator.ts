/**
 * Deterministic synthetic event-aggregate generator.
 *
 * Produces one aggregated "cell" per day × device × region × segment.
 * Cells contain only COUNTS and SUMS — there are no individual records,
 * identifiers, or personal attributes anywhere in the dataset.
 */
import {
  DATA_DAYS, DATA_END, DEVICES, REGIONS, SEGMENTS,
  type DeviceId, type RegionId, type SegmentId,
} from './dimensions';

export interface Cell {
  d: number;          // day index 0..DATA_DAYS-1
  date: string;       // YYYY-MM-DD
  dow: number;        // 0=Sun..6=Sat
  dev: DeviceId;
  reg: RegionId;
  seg: SegmentId;
  visitors: number;
  newVisitors: number;
  sessions: number;
  engagedSessions: number;
  pageviews: number;
  duration: number;   // total session seconds
  bounces: number;
  clicks: number;
  scrolls: number;
  scrollDepthSum: number; // sum over pageviews of max scroll depth (0..1)
  productViews: number;
  searches: number;
  landed: number;
  explored: number;
  interested: number;
  addToCart: number;
  checkouts: number;
  conversions: number;
  revenue: number;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateAt(dayIndex: number): string {
  const end = new Date(DATA_END + 'T00:00:00Z');
  const t = end.getTime() - (DATA_DAYS - 1 - dayIndex) * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export function dayIndexOf(date: string): number {
  const end = new Date(DATA_END + 'T00:00:00Z').getTime();
  const t = new Date(date + 'T00:00:00Z').getTime();
  return DATA_DAYS - 1 - Math.round((end - t) / 86400000);
}

const BASE_DAILY_VISITORS = 42000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function generateCells(seed = 20261029): Cell[] {
  const rnd = mulberry32(seed);
  const noise = (amp: number) => 1 + (rnd() * 2 - 1) * amp;
  const cells: Cell[] = [];

  for (let d = 0; d < DATA_DAYS; d++) {
    const date = dateAt(d);
    const dow = new Date(date + 'T00:00:00Z').getUTCDay();
    const weekend = dow === 0 || dow === 6;
    // campaign window: autumn campaign in the last ~5 weeks, peak mid-October
    const campaign = d >= 140 && d <= 165 ? 1 + 0.22 * Math.sin(((d - 140) / 25) * Math.PI) : 1;
    // a short mid-summer slump
    const summer = d >= 60 && d <= 85 ? 0.92 : 1;
    const dayNoise = noise(0.04);

    for (const reg of REGIONS) {
      for (const dev of DEVICES) {
        const weekendIdx = weekend ? (dev.id === 'desktop' ? 0.76 : dev.id === 'mobile' ? 1.12 : 1.2) : 1;
        for (const seg of SEGMENTS) {
          const growth = 1 + seg.trend * d;
          const campaignIdx = seg.id === 'first' || seg.id === 'intent' ? campaign : 1 + (campaign - 1) * 0.4;
          const visitors = Math.max(0, Math.round(
            BASE_DAILY_VISITORS * reg.weight * reg.deviceMix[dev.id] * seg.share * seg.deviceTilt[dev.id] *
            growth * weekendIdx * campaignIdx * summer * dayNoise * noise(0.07),
          ));
          const newVisitors = Math.round(visitors * (1 - seg.returningShare) * noise(0.03));
          const sessions = Math.max(visitors, Math.round(visitors * seg.sessPerVisitor * noise(0.04)));

          const bounceRate = clamp(seg.bounce * dev.bounceIdx * noise(0.05), 0.03, 0.95);
          const bounces = Math.round(sessions * bounceRate);
          const landed = sessions - bounces;
          const explored = Math.round(landed * clamp(seg.pExplore * noise(0.03), 0, 0.99));
          const interested = Math.round(explored * clamp(seg.pInterest * noise(0.04), 0, 0.99));
          const addToCart = Math.round(interested * clamp(seg.pCart * dev.cartIdx * noise(0.06), 0, 0.95));
          // campaign slightly lifts checkout completion
          const checkouts = Math.round(addToCart * clamp(seg.pCheckout * dev.checkoutIdx * noise(0.06) * (campaign > 1 ? 1.03 : 1), 0, 0.95));
          const conversions = Math.round(checkouts * clamp(seg.pPurchase * reg.cvrIdx * noise(0.05), 0, 0.97));

          const pps = Math.max(1, seg.pps * dev.ppsIdx * noise(0.05));
          const pageviews = Math.round(sessions * pps);
          const duration = Math.round(sessions * seg.dur * dev.durIdx * reg.durIdx * noise(0.06));
          const clicks = Math.round(pageviews * seg.clicksPerPage * noise(0.06));
          const depth = clamp(seg.scrollDepth * (dev.id === 'mobile' ? 1.06 : 1) * noise(0.04), 0.05, 0.98);
          const scrolls = Math.round(pageviews * (1.2 + depth * 3.2) * noise(0.05));
          const productViews = Math.round(interested * (1.4 + seg.pInterest * 3.5) * noise(0.06));
          const searches = Math.round(sessions * seg.searchRate * noise(0.08));
          const engagedSessions = Math.round(landed * clamp(0.55 + seg.scrollDepth * 0.5, 0, 0.98));
          const revenue = Math.round(conversions * seg.aov * reg.aovIdx * noise(0.08));

          cells.push({
            d, date, dow, dev: dev.id, reg: reg.id, seg: seg.id,
            visitors, newVisitors, sessions, engagedSessions, pageviews, duration, bounces, clicks, scrolls,
            scrollDepthSum: pageviews * depth, productViews, searches,
            landed, explored, interested, addToCart, checkouts, conversions, revenue,
          });
        }
      }
    }
  }
  return cells;
}
