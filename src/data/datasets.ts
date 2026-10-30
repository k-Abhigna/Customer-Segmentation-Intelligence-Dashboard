/**
 * BI-friendly flat tables (star schema: facts + dimensions).
 * Used by the in-app export center and by `npm run export-data`, so Power BI,
 * Tableau, Qlik Sense, Looker Studio, Zoho Analytics, Power Automate, etc.
 * can ingest exactly the same synthetic, aggregated data the dashboard shows.
 */
import type { Row } from '../lib/csv';
import { DEVICES, PAGES, REGIONS, SEGMENTS } from './dimensions';
import {
  aggregate, categoryPreferences, channelBreakdown, contentEngagement, dailySeries, featurePreferences, funnel,
  hourlyHeatmap, keywordPreferences, matches, nextPageProbs, pageBreakdown, segmentMetrics, stageTimes, type Filters,
} from './engine';
import type { Cell } from './generator';

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface DatasetDef { id: string; name: string; description: string; grain: string; build: (cells: Cell[], f: Filters) => Row[]; }

export const DATASETS: DatasetDef[] = [
  {
    id: 'fact_daily_behavior', name: 'Daily behavior facts', grain: 'date × device × region × segment',
    description: 'Additive event counts and sums. Primary fact table for BI models — join to dimensions on *_id.',
    build: (cells, f) => cells.filter((c) => c.d >= f.start && c.d <= f.end && matches(c, f)).map((c) => ({
      date: c.date, device_id: c.dev, region_id: c.reg, segment_id: c.seg,
      visitors: c.visitors, new_visitors: c.newVisitors, returning_visitors: c.visitors - c.newVisitors,
      sessions: c.sessions, engaged_sessions: c.engagedSessions, page_views: c.pageviews, total_session_seconds: c.duration,
      bounces: c.bounces, clicks: c.clicks, scroll_events: c.scrolls, scroll_depth_sum: r1(c.scrollDepthSum),
      product_views: c.productViews, searches: c.searches,
      stage_landing: c.landed, stage_exploration: c.explored, stage_product_interest: c.interested,
      add_to_cart: c.addToCart, checkouts: c.checkouts, conversions: c.conversions, revenue: c.revenue, is_synthetic: true,
    })),
  },
  {
    id: 'dim_segment', name: 'Segment dimension', grain: 'segment', description: 'Behavioral segment definitions and rule logic.',
    build: () => SEGMENTS.map((s) => ({ segment_id: s.id, segment_name: s.name, rule: s.rule, description: s.description, color_hex: s.color, retention_rate_30d: s.retention })),
  },
  {
    id: 'dim_device', name: 'Device dimension', grain: 'device', description: 'Device classes.',
    build: () => DEVICES.map((d) => ({ device_id: d.id, device_name: d.name, color_hex: d.color })),
  },
  {
    id: 'dim_region', name: 'Region dimension', grain: 'region', description: 'Aggregated geographic regions (no city / IP level data).',
    build: () => REGIONS.map((r) => ({ region_id: r.id, region_name: r.name, region_code: r.short })),
  },
  {
    id: 'dim_page', name: 'Page dimension', grain: 'page', description: 'Site page templates (URL patterns, no query strings).',
    build: () => PAGES.map((p) => ({ page_id: p.id, page_name: p.name, url_pattern: p.path })),
  },
  {
    id: 'agg_segment_summary', name: 'Segment summary', grain: 'segment (filtered period)', description: 'Segment KPIs for the selected filters.',
    build: (cells, f) => {
      const a = aggregate(cells, f);
      return SEGMENTS.filter((s) => a.bySeg[s.id].sessions > 0).map((s) => {
        const m = segmentMetrics(a, s.id);
        return {
          segment_id: s.id, segment_name: s.name, est_unique_visitors: Math.round(m.uniqueVisitors), sessions: m.sessions,
          engagement_score: r1(m.engagementScore), avg_session_seconds: r1(m.avgSessionDuration), pages_per_session: r4(m.pagesPerSession),
          bounce_rate: r4(m.bounceRate), conversion_rate: r4(m.conversionRate), retention_rate_30d: s.retention, revenue: m.revenue,
        };
      });
    },
  },
  {
    id: 'agg_daily_kpis', name: 'Daily KPI series', grain: 'date', description: 'Daily KPI time series for the selected filters.',
    build: (cells, f) => dailySeries(aggregate(cells, f)).map((p) => ({
      date: p.date, visitors: p.visitors, new_visitors: p.newVisitors, returning_visitors: p.returningVisitors, sessions: p.sessions,
      avg_session_seconds: r1(p.avgSessionDuration), pages_per_session: r4(p.pagesPerSession), bounce_rate: r4(p.bounceRate),
      conversion_rate: r4(p.conversionRate), engagement_score: r1(p.engagementScore), conversions: p.conversions, revenue: p.revenue,
    })),
  },
  {
    id: 'agg_channel', name: 'Traffic sources', grain: 'channel', description: 'Modeled channel attribution of sessions (aggregate shares).',
    build: (cells, f) => channelBreakdown(aggregate(cells, f)).map((c) => ({
      channel_id: c.id, channel_name: c.name, sessions: Math.round(c.sessions), share: r4(c.share), avg_session_seconds: r1(c.avgDuration),
      bounce_rate: r4(c.bounceRate), conversions: Math.round(c.conversions), conversion_rate: r4(c.conversionRate),
    })),
  },
  {
    id: 'agg_page_metrics', name: 'Page metrics', grain: 'page', description: 'Page-level engagement for the selected filters.',
    build: (cells, f) => pageBreakdown(aggregate(cells, f)).map((p) => ({
      page_id: p.id, page_name: p.name, url_pattern: p.path, page_views: Math.round(p.pageviews), entries: Math.round(p.entries), exits: Math.round(p.exits),
      exit_rate: r4(p.exitRate), avg_time_on_page_seconds: r1(p.avgTime), avg_scroll_depth: r4(p.scrollDepth), clicks_per_view: r4(p.clicksPerView),
    })),
  },
  {
    id: 'agg_navigation_transitions', name: 'Navigation transitions', grain: 'from_page × to_page', description: 'Next-page probabilities (Markov transitions) — ideal for Sankey visuals in BI tools.',
    build: (cells, f) => {
      const a = aggregate(cells, f);
      const pages = pageBreakdown(a);
      return pages.flatMap((p) => nextPageProbs(a, p.id).map((x) => ({
        from_page_id: p.id, to_page_id: x.to, probability: r4(x.p), est_transitions: Math.round(p.pageviews * x.p),
      })));
    },
  },
  {
    id: 'agg_journey_funnel', name: 'Journey funnel', grain: 'stage', description: '7-stage customer journey with conversion, drop-off and time between stages.',
    build: (cells, f) => {
      const a = aggregate(cells, f);
      const times = stageTimes(a);
      return funnel(a.total).map((s, i) => ({
        stage_order: i + 1, stage: s.name, sessions: Math.round(s.value), conversion_from_previous: r4(s.fromPrev),
        drop_off_rate: r4(s.dropOff), conversion_from_start: r4(s.fromStart), avg_seconds_from_previous: i === 0 ? 0 : r1(times[i - 1].seconds),
      }));
    },
  },
  {
    id: 'agg_hourly_activity', name: 'Hourly activity', grain: 'weekday × hour', description: 'Average sessions per weekday-hour.',
    build: (cells, f) => hourlyHeatmap(aggregate(cells, f)).flatMap((r) => r.values.map((v, h) => ({ weekday: r.row, hour: h, avg_sessions: Math.round(v) }))),
  },
  {
    id: 'agg_category_preferences', name: 'Category preferences', grain: 'category × subcategory', description: 'Product-view share by category.',
    build: (cells, f) => categoryPreferences(aggregate(cells, f)).flatMap((c) => c.children.map((s) => ({
      category: c.name, subcategory: s.name, product_views: Math.round(s.value), category_share: r4(c.share), category_conversion_rate: r4(c.conversionRate),
    }))),
  },
  {
    id: 'agg_search_keywords', name: 'Search keywords', grain: 'keyword', description: 'Aggregated on-site search terms (no free-text logs).',
    build: (cells, f) => keywordPreferences(aggregate(cells, f)).map((k) => ({ keyword: k.term, category: k.category, searches: Math.round(k.searches), trend_vs_prior: r4(k.trend) })),
  },
  {
    id: 'agg_content_features', name: 'Content & feature engagement', grain: 'content type / feature', description: 'Content consumption and feature usage.',
    build: (cells, f) => {
      const a = aggregate(cells, f);
      return [
        ...contentEngagement(a).map((c) => ({ kind: 'content', name: c.name, share_or_usage: r4(c.share), completion_rate: r4(c.completion), avg_seconds: r1(c.avgTime), conversion_lift: '' })),
        ...featurePreferences(a).map((x) => ({ kind: 'feature', name: x.name, share_or_usage: r4(x.usage), completion_rate: '', avg_seconds: '', conversion_lift: x.cvrLift })),
      ];
    },
  },
];
