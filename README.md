# BehaviorIQ — Human Behavior Intelligence Dashboard

A premium, dark-themed, fully interactive behavioral analytics platform built on **synthetic, anonymized, aggregated** customer event data. It covers audience, behavior, browsing paths, segmentation, customer journeys, preferences, simulated predictions and rule-based insights — with an interactive **customer journey Sankey** as the centerpiece.

> **All data is synthetic.** No personally identifiable information, no individual-level records, no sensitive inference. Forecasts are **simulated** (transparent heuristics, not a trained model). "AI Insights" are produced by **predefined analytical rules** — no external AI model is called.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static build in dist/ (relative paths, host anywhere)
npm run export-data  # regenerate the BI CSVs in /data
```

Stack: React 18 + TypeScript + Vite, Tailwind CSS, **Recharts** (charts), **Framer Motion** (animations), **Lucide React** (icons), local React state (context) for all interactivity. The Sankey diagrams are a custom dependency-free SVG component.

## Sections

| # | Section | Highlights |
|---|---------|-----------|
| 1 | Overview | 8 clickable KPI cards with Δ vs previous period + sparklines, KPI trend vs previous period, journey map preview, new vs returning, engagement trend, device donut (click to filter), traffic sources, weekday × hour heatmap |
| 2 | Audience Intelligence | Segment explorer chips, consented-panel age bands, regional tiles (click to filter), browsers, new vs returning, engagement bands, visit frequency, segment × region/device cross-tab with k-anonymity suppression |
| 3 | Behavior Analytics | Page ranking (views / time / scroll / exit), page drill-down, event × hour heatmap, engagement funnel, click patterns, session activity timeline, content engagement radar, sortable/searchable page table |
| 4 | Browsing Patterns | Interactive navigation Sankey (entry → step 4), page path explorer (arrives-from / goes-next-to), entry pages, top 3-step paths, page pairs, abandonment pages, search behavior |
| 5 | Customer Segmentation | 7 rule-based segments, click-to-inspect aggregated profile (radar vs average, device/channel mix, funnel, categories, next-best action), bubble landscape, comparison table |
| 6 | Journey Analysis | **Centerpiece Sankey** (source → landing → engagement → cart → checkout → outcome) with node inspector, 7-stage interactive funnel, stage comparison by device/segment, time between stages, common journey paths, completion rate |
| 7 | Preference Intelligence | Category treemap + ranking, content-type donut, keywords with trend, feature usage & lift, device preferences, browsing dayparts, most engaging content table — all with category filter |
| 8 | Predictive Insights | **Simulated** what-if: sliders (budget, personalization, email cadence, discount, page speed, retargeting) + presets → gauges, 30-day forecast with interval, predicted journey, segment predictions, next-best content, methodology |
| 9 | AI Recommendations | “Generate AI Insights” runs 11 explainable rules over the filtered data; each card shows evidence, recommendation and the exact rule |

**Global interactivity:** date range presets + custom range, segment / device / region filters (with chips and reset), command palette search (`Ctrl/⌘+K` or `/`), number keys `1–9` to switch sections, `R` to reset, CSV export on every chart/table, an Export Center with star-schema files, notifications, profile menu, collapsible sidebar / mobile drawer. Every filter feeds one aggregation engine, so all metrics and charts stay consistent.

## Data model

`src/data/generator.ts` deterministically generates one aggregated cell per **day × device × region × segment** (180 days × 3 × 5 × 7 = 18,900 rows). Each cell holds only counts and sums of events: page views, clicks, scroll events, product views, searches, add-to-cart, checkouts, conversions, plus journey-stage counts, durations and revenue. `src/data/engine.ts` derives every metric, breakdown, flow, forecast and insight from those aggregates.

### Privacy guarantees
- Synthetic data, clearly labeled throughout the UI and in every export (`is_synthetic`).
- No user IDs, IPs, cities, device fingerprints, or free-text logs; locations are regional.
- Demographics (age bands) appear only as a **self-declared, opt-in panel**; nothing is inferred.
- Any aggregate below **k = 50** contributors is suppressed (`<50`).
- Segments are inspected only as cohorts.

## BI & AI-tool friendly data (`/data`)

Star schema CSVs (UTF-8, RFC-4180, snake_case, ISO dates) — import into **Power BI, Tableau, Qlik Sense, Looker Studio, Zoho Analytics**, or watch the folder from **Power Automate** flows. The same files can be exported from the app, scoped to the current filters.

| File | Grain | Join keys |
|------|-------|-----------|
| `fact_daily_behavior.csv` | date × device × region × segment | `device_id`, `region_id`, `segment_id` |
| `dim_segment.csv`, `dim_device.csv`, `dim_region.csv`, `dim_page.csv` | dimension | `*_id` |
| `agg_daily_kpis.csv` | date | `date` |
| `agg_segment_summary.csv` | segment | `segment_id` |
| `agg_channel.csv` | traffic channel | `channel_id` |
| `agg_page_metrics.csv` | page | `page_id` |
| `agg_navigation_transitions.csv` | from_page × to_page (Sankey-ready) | `from_page_id`, `to_page_id` |
| `agg_journey_funnel.csv` | journey stage | `stage_order` |
| `agg_hourly_activity.csv` | weekday × hour | — |
| `agg_category_preferences.csv`, `agg_search_keywords.csv`, `agg_content_features.csv` | preference aggregates | — |

Suggested measures (DAX-style): `Conversion Rate = SUM(conversions)/SUM(sessions)`, `Bounce Rate = SUM(bounces)/SUM(sessions)`, `Avg Session Duration = SUM(total_session_seconds)/SUM(sessions)`, `Pages per Session = SUM(page_views)/SUM(sessions)`, `Returning Rate = 1 - SUM(new_visitors)/SUM(visitors)`.

### Design tokens (for prototyping / mockup AI tools)
Background `#05070f` / `#0a0e1a`, cards `rgba(23,31,52,0.72)` glass with `1px rgba(255,255,255,0.06)` border, radius 16px; accents electric blue `#3b82f6`, violet `#8b5cf6`, cyan `#22d3ee`; success `#10b981`, risk `#fb7185`, simulated `#f59e0b`. Type: Space Grotesk (display), Inter (UI), JetBrains Mono (numbers).

## Connecting real data later
Replace `generateCells()` with a loader that returns the same `Cell[]` shape from a consent-based analytics warehouse (already aggregated, k≥50). Everything else — filters, charts, exports — works unchanged. Replace the heuristic `predict()`/`forecast()` with a trained and evaluated model before using predictions for decisions.
