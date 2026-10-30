/**
 * Dimension tables and behavioral profiles for the SYNTHETIC dataset.
 *
 * Everything here is invented for demonstration. No real people, sessions,
 * or devices are represented. All downstream metrics are aggregates.
 */

export type DeviceId = 'desktop' | 'mobile' | 'tablet';
export type RegionId = 'na' | 'eu' | 'apac' | 'latam' | 'mea';
export type SegmentId = 'engaged' | 'first' | 'returning' | 'window' | 'intent' | 'atrisk' | 'inactive';
export type ChannelId = 'organic' | 'direct' | 'paid' | 'social' | 'email' | 'referral';
export type PageId =
  | 'home' | 'category' | 'product' | 'compare' | 'search' | 'reviews'
  | 'blog' | 'guides' | 'deals' | 'campaign' | 'cart' | 'checkout' | 'help';

export const DATA_END = '2026-10-29';
export const DATA_DAYS = 180;

export interface DeviceDim { id: DeviceId; name: string; color: string; durIdx: number; ppsIdx: number; bounceIdx: number; cartIdx: number; checkoutIdx: number; }
export const DEVICES: DeviceDim[] = [
  { id: 'desktop', name: 'Desktop', color: '#3b82f6', durIdx: 1.12, ppsIdx: 1.1, bounceIdx: 0.88, cartIdx: 1.04, checkoutIdx: 1.08 },
  { id: 'mobile', name: 'Mobile', color: '#22d3ee', durIdx: 0.8, ppsIdx: 0.86, bounceIdx: 1.16, cartIdx: 0.96, checkoutIdx: 0.74 },
  { id: 'tablet', name: 'Tablet', color: '#8b5cf6', durIdx: 0.94, ppsIdx: 0.97, bounceIdx: 1.04, cartIdx: 1.0, checkoutIdx: 0.9 },
];

export interface RegionDim { id: RegionId; name: string; short: string; weight: number; deviceMix: Record<DeviceId, number>; cvrIdx: number; durIdx: number; aovIdx: number; color: string; }
export const REGIONS: RegionDim[] = [
  { id: 'na', name: 'North America', short: 'NA', weight: 0.34, deviceMix: { desktop: 0.46, mobile: 0.44, tablet: 0.1 }, cvrIdx: 1.08, durIdx: 1.02, aovIdx: 1.12, color: '#3b82f6' },
  { id: 'eu', name: 'Europe', short: 'EU', weight: 0.28, deviceMix: { desktop: 0.42, mobile: 0.48, tablet: 0.1 }, cvrIdx: 1.0, durIdx: 1.05, aovIdx: 1.0, color: '#8b5cf6' },
  { id: 'apac', name: 'Asia Pacific', short: 'APAC', weight: 0.22, deviceMix: { desktop: 0.3, mobile: 0.63, tablet: 0.07 }, cvrIdx: 0.93, durIdx: 0.96, aovIdx: 0.92, color: '#22d3ee' },
  { id: 'latam', name: 'Latin America', short: 'LATAM', weight: 0.1, deviceMix: { desktop: 0.28, mobile: 0.66, tablet: 0.06 }, cvrIdx: 0.86, durIdx: 0.98, aovIdx: 0.78, color: '#10b981' },
  { id: 'mea', name: 'Middle East & Africa', short: 'MEA', weight: 0.06, deviceMix: { desktop: 0.26, mobile: 0.68, tablet: 0.06 }, cvrIdx: 0.88, durIdx: 0.94, aovIdx: 0.85, color: '#f59e0b' },
];

export interface SegmentDim {
  id: SegmentId; name: string; short: string; color: string; description: string; rule: string;
  share: number;          // share of daily visitor pool
  sessPerVisitor: number; // sessions per visitor-day
  dur: number;            // avg session duration (s)
  pps: number;            // pages per session
  bounce: number;
  pExplore: number; pInterest: number; pCart: number; pCheckout: number; pPurchase: number;
  returningShare: number; // share of daily visitors that are returning
  retention: number;      // 30-day retention rate
  dailyReturnProb: number;// prob. a returning visitor revisits on a given day (for unique estimation)
  clicksPerPage: number; scrollDepth: number; searchRate: number;
  aov: number;
  trend: number;          // per-day growth factor offset
  deviceTilt: Record<DeviceId, number>;
}

export const SEGMENTS: SegmentDim[] = [
  {
    id: 'engaged', name: 'Highly Engaged', short: 'Engaged', color: '#3b82f6',
    description: 'Frequent, deep sessions with strong content and product interaction.',
    rule: '≥5 sessions in 30d AND avg session ≥ 6 min AND scroll depth ≥ 60%',
    share: 0.07, sessPerVisitor: 1.42, dur: 545, pps: 8.4, bounce: 0.11,
    pExplore: 0.88, pInterest: 0.72, pCart: 0.38, pCheckout: 0.63, pPurchase: 0.71,
    returningShare: 0.94, retention: 0.86, dailyReturnProb: 0.11, clicksPerPage: 3.1, scrollDepth: 0.74, searchRate: 0.42, aov: 142, trend: 0.0016,
    deviceTilt: { desktop: 1.25, mobile: 0.88, tablet: 1.05 },
  },
  {
    id: 'first', name: 'First-Time Visitors', short: 'First-Time', color: '#22d3ee',
    description: 'New, anonymous arrivals discovering the brand for the first time.',
    rule: 'No prior session cookie-less signal in 90d (first-party, consented)',
    share: 0.3, sessPerVisitor: 1.06, dur: 98, pps: 2.2, bounce: 0.57,
    pExplore: 0.56, pInterest: 0.5, pCart: 0.2, pCheckout: 0.5, pPurchase: 0.6,
    returningShare: 0.0, retention: 0.21, dailyReturnProb: 0.0, clicksPerPage: 1.6, scrollDepth: 0.38, searchRate: 0.12, aov: 74, trend: 0.0012,
    deviceTilt: { desktop: 0.9, mobile: 1.08, tablet: 0.95 },
  },
  {
    id: 'returning', name: 'Returning Visitors', short: 'Returning', color: '#8b5cf6',
    description: 'Visitors coming back with moderate engagement and steady conversion.',
    rule: '2–4 sessions in 30d AND not matching a higher-priority segment',
    share: 0.18, sessPerVisitor: 1.18, dur: 262, pps: 4.7, bounce: 0.27,
    pExplore: 0.78, pInterest: 0.6, pCart: 0.28, pCheckout: 0.58, pPurchase: 0.66,
    returningShare: 1.0, retention: 0.62, dailyReturnProb: 0.06, clicksPerPage: 2.3, scrollDepth: 0.56, searchRate: 0.26, aov: 96, trend: 0.0013,
    deviceTilt: { desktop: 1.05, mobile: 0.97, tablet: 1.0 },
  },
  {
    id: 'window', name: 'Window Shoppers', short: 'Window', color: '#f472b6',
    description: 'Browse many products and comparisons but rarely add to cart.',
    rule: '≥6 product views in 30d AND add-to-cart rate < 5%',
    share: 0.14, sessPerVisitor: 1.22, dur: 318, pps: 6.4, bounce: 0.21,
    pExplore: 0.9, pInterest: 0.83, pCart: 0.09, pCheckout: 0.42, pPurchase: 0.52,
    returningShare: 0.72, retention: 0.48, dailyReturnProb: 0.05, clicksPerPage: 2.7, scrollDepth: 0.63, searchRate: 0.34, aov: 88, trend: 0.0009,
    deviceTilt: { desktop: 0.95, mobile: 1.05, tablet: 1.12 },
  },
  {
    id: 'intent', name: 'High Purchase Intent', short: 'High Intent', color: '#10b981',
    description: 'Comparison, review and cart activity signal readiness to buy.',
    rule: 'Compare/review page view AND add-to-cart within 7d',
    share: 0.06, sessPerVisitor: 1.34, dur: 412, pps: 7.2, bounce: 0.13,
    pExplore: 0.9, pInterest: 0.86, pCart: 0.46, pCheckout: 0.7, pPurchase: 0.74,
    returningShare: 0.81, retention: 0.74, dailyReturnProb: 0.09, clicksPerPage: 3.4, scrollDepth: 0.69, searchRate: 0.48, aov: 128, trend: 0.0018,
    deviceTilt: { desktop: 1.18, mobile: 0.92, tablet: 1.0 },
  },
  {
    id: 'atrisk', name: 'At-Risk Customers', short: 'At-Risk', color: '#f59e0b',
    description: 'Previously active visitors with declining frequency and depth.',
    rule: 'Session frequency down ≥50% vs prior 30d AND previously converted',
    share: 0.1, sessPerVisitor: 1.04, dur: 124, pps: 2.5, bounce: 0.45,
    pExplore: 0.61, pInterest: 0.46, pCart: 0.17, pCheckout: 0.5, pPurchase: 0.56,
    returningShare: 1.0, retention: 0.31, dailyReturnProb: 0.025, clicksPerPage: 1.7, scrollDepth: 0.41, searchRate: 0.18, aov: 81, trend: 0.0021,
    deviceTilt: { desktop: 0.96, mobile: 1.03, tablet: 1.0 },
  },
  {
    id: 'inactive', name: 'Inactive Visitors', short: 'Inactive', color: '#64748b',
    description: 'Very short, low-interaction visits with minimal content engagement.',
    rule: 'Avg session < 45s AND ≤1 page AND no interaction events',
    share: 0.15, sessPerVisitor: 1.01, dur: 38, pps: 1.2, bounce: 0.79,
    pExplore: 0.34, pInterest: 0.3, pCart: 0.1, pCheckout: 0.4, pPurchase: 0.5,
    returningShare: 0.35, retention: 0.09, dailyReturnProb: 0.015, clicksPerPage: 0.7, scrollDepth: 0.19, searchRate: 0.04, aov: 60, trend: -0.0006,
    deviceTilt: { desktop: 0.85, mobile: 1.12, tablet: 0.95 },
  },
];

export interface ChannelDim {
  id: ChannelId; name: string; color: string;
  segShare: Record<SegmentId, number>;
  mobileTilt: number;
  durIdx: number; bounceIdx: number; cvrIdx: number;
  landing: Record<LandingId, number>;
}

export type LandingId = 'home' | 'category' | 'product' | 'content' | 'campaign';
export const LANDINGS: { id: LandingId; name: string; page: PageId; bounceW: number; productW: number }[] = [
  { id: 'home', name: 'Home', page: 'home', bounceW: 1.0, productW: 1.0 },
  { id: 'category', name: 'Category / Deals', page: 'category', bounceW: 0.85, productW: 1.25 },
  { id: 'product', name: 'Product Page', page: 'product', bounceW: 0.9, productW: 1.9 },
  { id: 'content', name: 'Content & Guides', page: 'guides', bounceW: 0.8, productW: 0.75 },
  { id: 'campaign', name: 'Campaign Landing', page: 'campaign', bounceW: 1.3, productW: 1.1 },
];

export const CHANNELS: ChannelDim[] = [
  {
    id: 'organic', name: 'Organic Search', color: '#3b82f6', mobileTilt: 1.0, durIdx: 1.24, bounceIdx: 0.86, cvrIdx: 1.05,
    segShare: { engaged: 0.3, first: 0.38, returning: 0.3, window: 0.36, intent: 0.28, atrisk: 0.26, inactive: 0.3 },
    landing: { home: 0.12, category: 0.2, product: 0.28, content: 0.36, campaign: 0.04 },
  },
  {
    id: 'direct', name: 'Direct', color: '#8b5cf6', mobileTilt: 0.9, durIdx: 1.08, bounceIdx: 0.9, cvrIdx: 1.22,
    segShare: { engaged: 0.32, first: 0.1, returning: 0.26, window: 0.18, intent: 0.3, atrisk: 0.24, inactive: 0.14 },
    landing: { home: 0.62, category: 0.16, product: 0.14, content: 0.05, campaign: 0.03 },
  },
  {
    id: 'paid', name: 'Paid Search', color: '#22d3ee', mobileTilt: 1.05, durIdx: 0.86, bounceIdx: 1.12, cvrIdx: 1.14,
    segShare: { engaged: 0.08, first: 0.2, returning: 0.12, window: 0.14, intent: 0.17, atrisk: 0.1, inactive: 0.16 },
    landing: { home: 0.06, category: 0.22, product: 0.42, content: 0.04, campaign: 0.26 },
  },
  {
    id: 'social', name: 'Social', color: '#f472b6', mobileTilt: 1.35, durIdx: 0.72, bounceIdx: 1.3, cvrIdx: 0.62,
    segShare: { engaged: 0.08, first: 0.18, returning: 0.08, window: 0.16, intent: 0.06, atrisk: 0.12, inactive: 0.26 },
    landing: { home: 0.1, category: 0.12, product: 0.24, content: 0.22, campaign: 0.32 },
  },
  {
    id: 'email', name: 'Email', color: '#10b981', mobileTilt: 1.1, durIdx: 1.02, bounceIdx: 0.92, cvrIdx: 1.3,
    segShare: { engaged: 0.14, first: 0.02, returning: 0.16, window: 0.1, intent: 0.14, atrisk: 0.22, inactive: 0.08 },
    landing: { home: 0.08, category: 0.3, product: 0.26, content: 0.08, campaign: 0.28 },
  },
  {
    id: 'referral', name: 'Referral', color: '#f59e0b', mobileTilt: 0.95, durIdx: 1.1, bounceIdx: 0.95, cvrIdx: 0.98,
    segShare: { engaged: 0.08, first: 0.12, returning: 0.08, window: 0.06, intent: 0.05, atrisk: 0.06, inactive: 0.06 },
    landing: { home: 0.18, category: 0.1, product: 0.38, content: 0.3, campaign: 0.04 },
  },
];

export interface PageDim {
  id: PageId; name: string; path: string;
  weight: number; avgTime: number; scroll: number; clicksPerView: number; exitRate: number;
  segIdx: Partial<Record<SegmentId, number>>;
}

export const PAGES: PageDim[] = [
  { id: 'home', name: 'Home', path: '/', weight: 0.16, avgTime: 38, scroll: 0.46, clicksPerView: 2.4, exitRate: 0.31, segIdx: { first: 1.4, inactive: 2.2 } },
  { id: 'category', name: 'Category Listing', path: '/c/*', weight: 0.17, avgTime: 52, scroll: 0.62, clicksPerView: 3.1, exitRate: 0.22, segIdx: { window: 1.25 } },
  { id: 'product', name: 'Product Detail', path: '/p/*', weight: 0.2, avgTime: 86, scroll: 0.68, clicksPerView: 2.9, exitRate: 0.28, segIdx: { window: 1.4, intent: 1.3, engaged: 1.15 } },
  { id: 'compare', name: 'Product Comparison', path: '/compare', weight: 0.035, avgTime: 124, scroll: 0.78, clicksPerView: 3.8, exitRate: 0.18, segIdx: { intent: 2.6, window: 1.8, engaged: 1.5, first: 0.5 } },
  { id: 'search', name: 'Search Results', path: '/search', weight: 0.08, avgTime: 34, scroll: 0.51, clicksPerView: 2.2, exitRate: 0.19, segIdx: { engaged: 1.4, intent: 1.5 } },
  { id: 'reviews', name: 'Reviews', path: '/p/*/reviews', weight: 0.04, avgTime: 98, scroll: 0.72, clicksPerView: 1.6, exitRate: 0.21, segIdx: { intent: 1.9, window: 1.3 } },
  { id: 'blog', name: 'Blog & Stories', path: '/blog/*', weight: 0.06, avgTime: 142, scroll: 0.64, clicksPerView: 1.1, exitRate: 0.47, segIdx: { first: 1.3, engaged: 1.3 } },
  { id: 'guides', name: 'Buying Guides', path: '/guides/*', weight: 0.045, avgTime: 168, scroll: 0.71, clicksPerView: 1.9, exitRate: 0.33, segIdx: { first: 1.2, window: 1.2 } },
  { id: 'deals', name: 'Deals & Offers', path: '/deals', weight: 0.05, avgTime: 61, scroll: 0.66, clicksPerView: 3.3, exitRate: 0.26, segIdx: { atrisk: 1.8, window: 1.2 } },
  { id: 'campaign', name: 'Autumn Campaign LP', path: '/lp/autumn', weight: 0.035, avgTime: 44, scroll: 0.49, clicksPerView: 1.8, exitRate: 0.42, segIdx: { first: 1.5, inactive: 1.8 } },
  { id: 'cart', name: 'Cart', path: '/cart', weight: 0.035, avgTime: 72, scroll: 0.58, clicksPerView: 2.6, exitRate: 0.24, segIdx: { intent: 2.4, engaged: 1.6, window: 0.4, first: 0.6 } },
  { id: 'checkout', name: 'Checkout', path: '/checkout', weight: 0.022, avgTime: 164, scroll: 0.81, clicksPerView: 4.2, exitRate: 0.29, segIdx: { intent: 2.6, engaged: 1.8, window: 0.3, first: 0.5 } },
  { id: 'help', name: 'Help & Shipping', path: '/help/*', weight: 0.03, avgTime: 74, scroll: 0.55, clicksPerView: 1.3, exitRate: 0.38, segIdx: { atrisk: 1.6 } },
];

/** Page → next page transition weights (the remainder after exitRate is distributed by these weights). */
export const TRANSITIONS: Record<PageId, Partial<Record<PageId, number>>> = {
  home: { category: 0.34, product: 0.16, search: 0.14, deals: 0.12, blog: 0.07, campaign: 0.06, guides: 0.05, help: 0.03, cart: 0.03 },
  category: { product: 0.58, category: 0.0, search: 0.1, compare: 0.07, deals: 0.08, home: 0.07, cart: 0.06, guides: 0.04 },
  product: { reviews: 0.18, compare: 0.14, cart: 0.22, category: 0.18, product: 0.0, search: 0.09, home: 0.06, help: 0.04, guides: 0.04, deals: 0.05 },
  compare: { product: 0.52, cart: 0.22, reviews: 0.14, category: 0.08, guides: 0.04 },
  search: { product: 0.62, category: 0.16, compare: 0.06, search: 0.0, home: 0.06, deals: 0.05, help: 0.05 },
  reviews: { product: 0.44, cart: 0.26, compare: 0.18, category: 0.08, help: 0.04 },
  blog: { product: 0.24, guides: 0.22, category: 0.18, home: 0.18, blog: 0.0, deals: 0.08, campaign: 0.1 },
  guides: { product: 0.38, compare: 0.22, category: 0.2, blog: 0.08, home: 0.06, deals: 0.06 },
  deals: { product: 0.48, category: 0.22, cart: 0.14, home: 0.08, search: 0.08 },
  campaign: { product: 0.42, category: 0.26, deals: 0.14, home: 0.12, guides: 0.06 },
  cart: { checkout: 0.6, product: 0.16, category: 0.08, deals: 0.06, help: 0.1 },
  checkout: { help: 0.3, cart: 0.5, home: 0.2 },
  help: { home: 0.3, product: 0.24, cart: 0.2, category: 0.16, checkout: 0.1 },
};

export interface CategoryDim { id: string; name: string; color: string; weight: number; segIdx: Partial<Record<SegmentId, number>>; regionIdx: Partial<Record<RegionId, number>>; sub: { name: string; w: number }[]; }
export const CATEGORIES: CategoryDim[] = [
  { id: 'electronics', name: 'Electronics', color: '#3b82f6', weight: 0.24, segIdx: { intent: 1.3, engaged: 1.2, window: 1.25 }, regionIdx: { apac: 1.3, na: 1.1 }, sub: [{ name: 'Headphones', w: 0.26 }, { name: 'Smart Home', w: 0.22 }, { name: 'Laptops', w: 0.2 }, { name: 'Wearables', w: 0.18 }, { name: 'Cameras', w: 0.14 }] },
  { id: 'home', name: 'Home & Living', color: '#8b5cf6', weight: 0.19, segIdx: { returning: 1.2, atrisk: 1.1 }, regionIdx: { eu: 1.25, na: 1.05 }, sub: [{ name: 'Furniture', w: 0.3 }, { name: 'Kitchen', w: 0.28 }, { name: 'Lighting', w: 0.18 }, { name: 'Decor', w: 0.24 }] },
  { id: 'fashion', name: 'Fashion', color: '#f472b6', weight: 0.18, segIdx: { window: 1.4, first: 1.15 }, regionIdx: { latam: 1.3, mea: 1.2, eu: 1.1 }, sub: [{ name: 'Outerwear', w: 0.32 }, { name: 'Footwear', w: 0.3 }, { name: 'Accessories', w: 0.22 }, { name: 'Basics', w: 0.16 }] },
  { id: 'sports', name: 'Sports & Outdoors', color: '#10b981', weight: 0.12, segIdx: { engaged: 1.2 }, regionIdx: { na: 1.15, eu: 1.1 }, sub: [{ name: 'Fitness', w: 0.38 }, { name: 'Camping', w: 0.26 }, { name: 'Cycling', w: 0.2 }, { name: 'Running', w: 0.16 }] },
  { id: 'beauty', name: 'Beauty & Care', color: '#f59e0b', weight: 0.1, segIdx: { returning: 1.25, intent: 1.1 }, regionIdx: { apac: 1.25, latam: 1.2 }, sub: [{ name: 'Skincare', w: 0.44 }, { name: 'Fragrance', w: 0.3 }, { name: 'Haircare', w: 0.26 }] },
  { id: 'books', name: 'Books & Media', color: '#22d3ee', weight: 0.08, segIdx: { engaged: 1.35, first: 0.9 }, regionIdx: { eu: 1.2 }, sub: [{ name: 'Non-fiction', w: 0.4 }, { name: 'Fiction', w: 0.36 }, { name: 'Audio', w: 0.24 }] },
  { id: 'toys', name: 'Toys & Games', color: '#a78bfa', weight: 0.06, segIdx: { atrisk: 1.2 }, regionIdx: { latam: 1.15, mea: 1.15 }, sub: [{ name: 'Board Games', w: 0.4 }, { name: 'STEM Kits', w: 0.34 }, { name: 'Puzzles', w: 0.26 }] },
  { id: 'grocery', name: 'Gourmet & Grocery', color: '#34d399', weight: 0.03, segIdx: { returning: 1.3 }, regionIdx: { na: 1.1 }, sub: [{ name: 'Coffee & Tea', w: 0.56 }, { name: 'Pantry', w: 0.44 }] },
];

export const KEYWORDS: { term: string; category: string; weight: number; trend: number }[] = [
  { term: 'wireless headphones', category: 'electronics', weight: 1.0, trend: 0.12 },
  { term: 'winter jacket', category: 'fashion', weight: 0.92, trend: 0.38 },
  { term: 'smart thermostat', category: 'electronics', weight: 0.61, trend: 0.21 },
  { term: 'running shoes', category: 'fashion', weight: 0.72, trend: -0.04 },
  { term: 'standing desk', category: 'home', weight: 0.58, trend: 0.06 },
  { term: 'espresso machine', category: 'home', weight: 0.54, trend: 0.17 },
  { term: 'laptop 14 inch', category: 'electronics', weight: 0.66, trend: 0.09 },
  { term: 'yoga mat', category: 'sports', weight: 0.41, trend: -0.08 },
  { term: 'vitamin c serum', category: 'beauty', weight: 0.47, trend: 0.14 },
  { term: 'board games', category: 'toys', weight: 0.36, trend: 0.29 },
  { term: 'led floor lamp', category: 'home', weight: 0.33, trend: 0.11 },
  { term: 'camping tent', category: 'sports', weight: 0.28, trend: -0.22 },
  { term: 'smartwatch', category: 'electronics', weight: 0.57, trend: 0.05 },
  { term: 'leather boots', category: 'fashion', weight: 0.49, trend: 0.31 },
  { term: 'cookbook', category: 'books', weight: 0.24, trend: 0.08 },
  { term: 'perfume gift set', category: 'beauty', weight: 0.31, trend: 0.42 },
  { term: 'coffee beans', category: 'grocery', weight: 0.22, trend: 0.03 },
  { term: 'noise cancelling', category: 'electronics', weight: 0.44, trend: 0.16 },
  { term: 'stem kit', category: 'toys', weight: 0.19, trend: 0.24 },
  { term: 'free shipping', category: 'help', weight: 0.38, trend: 0.02 },
];

export const CONTENT_TYPES: { id: string; name: string; color: string; share: number; completion: number; avgTime: number; assist: number; segIdx: Partial<Record<SegmentId, number>> }[] = [
  { id: 'video', name: 'Product Videos', color: '#3b82f6', share: 0.22, completion: 0.58, avgTime: 74, assist: 0.19, segIdx: { intent: 1.3, window: 1.2 } },
  { id: 'reviews', name: 'Customer Reviews', color: '#10b981', share: 0.21, completion: 0.66, avgTime: 61, assist: 0.24, segIdx: { intent: 1.5 } },
  { id: 'guides', name: 'Buying Guides', color: '#8b5cf6', share: 0.16, completion: 0.49, avgTime: 168, assist: 0.17, segIdx: { first: 1.3, window: 1.2 } },
  { id: 'compare', name: 'Comparison Tables', color: '#22d3ee', share: 0.12, completion: 0.71, avgTime: 112, assist: 0.27, segIdx: { intent: 1.7, window: 1.4 } },
  { id: 'blog', name: 'Editorial Stories', color: '#f472b6', share: 0.14, completion: 0.41, avgTime: 142, assist: 0.06, segIdx: { engaged: 1.4, first: 1.2 } },
  { id: 'lookbook', name: 'Lookbooks & Galleries', color: '#f59e0b', share: 0.09, completion: 0.53, avgTime: 58, assist: 0.09, segIdx: { window: 1.4 } },
  { id: 'faq', name: 'FAQ & Help', color: '#64748b', share: 0.06, completion: 0.62, avgTime: 49, assist: 0.11, segIdx: { atrisk: 1.6 } },
];

export const FEATURES: { name: string; usage: number; segIdx: Partial<Record<SegmentId, number>>; cvrLift: number }[] = [
  { name: 'Faceted Filters', usage: 0.46, segIdx: { engaged: 1.3, window: 1.3 }, cvrLift: 1.32 },
  { name: 'Product Compare', usage: 0.14, segIdx: { intent: 2.4, window: 1.6 }, cvrLift: 2.1 },
  { name: 'Wishlist', usage: 0.18, segIdx: { window: 2.0, engaged: 1.5 }, cvrLift: 1.45 },
  { name: 'Size / Fit Guide', usage: 0.12, segIdx: { first: 1.2 }, cvrLift: 1.38 },
  { name: 'Reviews Sort', usage: 0.21, segIdx: { intent: 1.8 }, cvrLift: 1.62 },
  { name: 'Live Chat', usage: 0.05, segIdx: { atrisk: 1.8, intent: 1.3 }, cvrLift: 1.74 },
  { name: 'Price Alerts', usage: 0.07, segIdx: { window: 2.2, atrisk: 1.4 }, cvrLift: 1.21 },
  { name: 'AR Preview', usage: 0.04, segIdx: { engaged: 1.6 }, cvrLift: 1.9 },
];

export const TOP_CONTENT: { title: string; type: string; category: string; engaged: number; completion: number; assist: number; views: number }[] = [
  { title: 'The 2026 Noise-Cancelling Headphones Guide', type: 'Buying Guides', category: 'electronics', engaged: 212, completion: 0.61, assist: 0.22, views: 1.0 },
  { title: 'Laptop Comparison: Ultrabooks vs Creator Laptops', type: 'Comparison Tables', category: 'electronics', engaged: 186, completion: 0.74, assist: 0.31, views: 0.82 },
  { title: 'How to Layer for Winter (Lookbook)', type: 'Lookbooks & Galleries', category: 'fashion', engaged: 96, completion: 0.57, assist: 0.12, views: 0.94 },
  { title: 'Small-Space Living Room Ideas', type: 'Editorial Stories', category: 'home', engaged: 158, completion: 0.44, assist: 0.08, views: 0.71 },
  { title: 'Espresso Machines Tested: Video Review', type: 'Product Videos', category: 'home', engaged: 132, completion: 0.63, assist: 0.24, views: 0.66 },
  { title: 'Smart Thermostat Setup in 5 Minutes', type: 'Product Videos', category: 'electronics', engaged: 118, completion: 0.69, assist: 0.18, views: 0.58 },
  { title: 'Trail Running Shoe Finder', type: 'Buying Guides', category: 'sports', engaged: 174, completion: 0.52, assist: 0.2, views: 0.49 },
  { title: 'Skincare Routine Builder', type: 'Buying Guides', category: 'beauty', engaged: 149, completion: 0.58, assist: 0.19, views: 0.47 },
  { title: 'Top-Rated Board Games This Season', type: 'Customer Reviews', category: 'toys', engaged: 88, completion: 0.66, assist: 0.17, views: 0.39 },
  { title: 'Shipping & Returns Explained', type: 'FAQ & Help', category: 'help', engaged: 52, completion: 0.71, assist: 0.09, views: 0.44 },
];

export const CLICK_TARGETS: { name: string; share: number; ctr: number }[] = [
  { name: 'Product Cards', share: 0.27, ctr: 0.18 },
  { name: 'Navigation Menu', share: 0.18, ctr: 0.42 },
  { name: 'Primary CTA Buttons', share: 0.14, ctr: 0.31 },
  { name: 'Filters & Sorting', share: 0.13, ctr: 0.26 },
  { name: 'Image Gallery', share: 0.1, ctr: 0.12 },
  { name: 'Search Bar', share: 0.08, ctr: 0.54 },
  { name: 'Tabs & Accordions', share: 0.06, ctr: 0.22 },
  { name: 'Footer Links', share: 0.04, ctr: 0.07 },
];

export const AGE_BANDS = ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'] as const;
/** Age distributions are from a SELF-DECLARED, opt-in survey panel only. Never inferred. */
export const AGE_DIST: Record<SegmentId, number[]> = {
  engaged: [0.14, 0.33, 0.26, 0.15, 0.08, 0.04],
  first: [0.22, 0.31, 0.21, 0.13, 0.08, 0.05],
  returning: [0.15, 0.3, 0.26, 0.16, 0.09, 0.04],
  window: [0.26, 0.34, 0.2, 0.11, 0.06, 0.03],
  intent: [0.12, 0.31, 0.29, 0.17, 0.08, 0.03],
  atrisk: [0.14, 0.26, 0.24, 0.18, 0.11, 0.07],
  inactive: [0.24, 0.29, 0.19, 0.13, 0.09, 0.06],
};
export const AGE_CONSENT_RATE = 0.36;

export const BROWSERS: Record<DeviceId, Record<string, number>> = {
  desktop: { Chrome: 0.63, Edge: 0.14, Safari: 0.13, Firefox: 0.08, Other: 0.02 },
  mobile: { Chrome: 0.5, Safari: 0.42, 'Samsung Internet': 0.06, Other: 0.02 },
  tablet: { Safari: 0.6, Chrome: 0.34, Other: 0.06 },
};

export const FREQ_BANDS = ['1 visit', '2–3 visits', '4–7 visits', '8–15 visits', '16+ visits'] as const;
export const FREQ_DIST: Record<SegmentId, number[]> = {
  engaged: [0.0, 0.06, 0.34, 0.38, 0.22],
  first: [0.86, 0.14, 0.0, 0.0, 0.0],
  returning: [0.0, 0.62, 0.32, 0.06, 0.0],
  window: [0.12, 0.38, 0.32, 0.14, 0.04],
  intent: [0.06, 0.3, 0.38, 0.2, 0.06],
  atrisk: [0.08, 0.58, 0.26, 0.07, 0.01],
  inactive: [0.66, 0.26, 0.07, 0.01, 0.0],
};

export const ENGAGEMENT_BANDS = ['Very High', 'High', 'Medium', 'Low', 'Minimal'] as const;
export const ENGAGEMENT_DIST: Record<SegmentId, number[]> = {
  engaged: [0.48, 0.36, 0.12, 0.03, 0.01],
  first: [0.03, 0.12, 0.3, 0.32, 0.23],
  returning: [0.12, 0.32, 0.36, 0.15, 0.05],
  window: [0.14, 0.38, 0.32, 0.12, 0.04],
  intent: [0.36, 0.4, 0.17, 0.05, 0.02],
  atrisk: [0.03, 0.11, 0.31, 0.35, 0.2],
  inactive: [0.0, 0.02, 0.1, 0.3, 0.58],
};

/** Event-type hourly activity profile (weights per hour 0..23) */
export const EVENT_TYPES = ['Page Views', 'Clicks', 'Scrolls', 'Product Views', 'Searches', 'Add to Cart', 'Checkouts', 'Conversions'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const SEGMENT_MAP = Object.fromEntries(SEGMENTS.map((s) => [s.id, s])) as Record<SegmentId, SegmentDim>;
export const DEVICE_MAP = Object.fromEntries(DEVICES.map((s) => [s.id, s])) as Record<DeviceId, DeviceDim>;
export const REGION_MAP = Object.fromEntries(REGIONS.map((s) => [s.id, s])) as Record<RegionId, RegionDim>;
export const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((s) => [s.id, s])) as Record<ChannelId, ChannelDim>;
export const PAGE_MAP = Object.fromEntries(PAGES.map((s) => [s.id, s])) as Record<PageId, PageDim>;

/** k-anonymity threshold: any aggregate with fewer contributors than this is suppressed. */
export const K_ANON = 50;
