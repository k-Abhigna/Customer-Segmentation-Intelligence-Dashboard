# Human Behavior Intelligence Dashboard (no-code Excel edition)

A dark-themed, interactive behavioral analytics dashboard delivered as a single Excel workbook — **no programming, no macros, no add-ins**. Everything is built with standard spreadsheet features: formulas, dropdown lists, conditional formatting and native charts.

**File:** `Human_Behavior_Intelligence_Dashboard.xlsx` — open it in Microsoft Excel (desktop or web). It also opens in LibreOffice Calc; Excel recalculates fastest.

> **All data is synthetic, anonymized and aggregated.** No personally identifiable information, no individual-level records, no sensitive inference. Forecasts are **simulated** with transparent formulas (not a trained model). "AI Insights" are produced by **predefined analytical rules** — no AI model is called.

## How to use

1. Open the **Overview** sheet.
2. Change the **cyan cells** (dropdowns) at the top: Date range (or *Custom range* + start/end dates), Segment, Device, Region, Trend metric.
3. Every sheet recalculates. Each sheet shows a "Filters in effect" bar with a link back to the filters.
4. **Reset:** Last 30 days · All segments · All devices · All regions.

The tab strip under each sheet title is clickable navigation.

## Sheets

| Sheet | What it contains | Local control |
|---|---|---|
| Overview | 8 KPI tiles with change vs previous period, KPI trend, device donut, new vs returning, engagement vs bounce, traffic sources, weekday × hour heatmap | Global filters, trend metric |
| Audience Intelligence | Segment table, consented-panel age bands, regional distribution, browsers & devices, engagement bands, visit frequency, segment × region/device cross-tab (values < 50 suppressed) | — |
| Behavior Analytics | Page table, page ranking, event × hour heatmap, engagement funnel, click patterns, activity timeline, content engagement, session frequency | Rank pages by |
| Browsing Patterns | Page path explorer (arrives from / goes next to), navigation flow matrix, entry and exit pages, top 3-step paths, page pairs, search behavior | Selected page |
| Customer Segmentation | 7 rule-based segments (size, engagement, duration, conversion, retention), bubble landscape, rules, segment inspector with radar profile and next-best action | Inspect segment |
| Journey Analysis | 7-stage funnel with drop-off and stage timing, stage comparison by device/segment, flow maps (source → landing → outcome), common paths, Sankey-ready link table | Stage |
| Preference Intelligence | Categories & subcategories, content types, keywords with trend, features, device preferences, browsing times, most engaging content | Category focus |
| Predictive Insights | **SIMULATED** what-if: presets or custom levers → probability gauges, 30-day forecast with interval, predicted journey, segment predictions, methodology | Scenario preset & levers |
| AI Recommendations | 11 rule-based insights with evidence, recommendation and the rule that fired | "Generate AI Insights" trigger |
| About & Privacy | Usage guide, privacy notes, limitations | — |
| Data · Daily · Engine · Model · Lists | Fact table, daily series, calculation engine, model parameters, dropdown lists | — |

Excel has no native Sankey or treemap that works with formula-driven ranges, so journey and navigation flows are shown as heat-shaded flow matrices and funnels. The **Journey links** table (source, target, sessions) plugs straight into Sankey visuals in Power BI or Tableau.

## Data for BI and other tools (`/data`)

Star-schema CSV files (UTF-8, ISO dates, snake_case columns) for **Power BI, Tableau, Qlik Sense, Looker Studio, Zoho Analytics**. **Power Automate** can watch the folder to trigger refreshes. No-code prototyping and mockup tools can use the same CSVs as sample data.

| File | Grain |
|---|---|
| `fact_daily_behavior.csv` | date × device × region × segment (18,900 rows of event counts) |
| `dim_segment.csv`, `dim_device.csv`, `dim_region.csv`, `dim_page.csv` | dimensions (join on `*_id`) |
| `agg_daily_kpis.csv`, `agg_segment_summary.csv`, `agg_channel.csv`, `agg_page_metrics.csv` | summaries |
| `agg_navigation_transitions.csv`, `agg_journey_funnel.csv` | flows & funnel (Sankey-ready) |
| `agg_hourly_activity.csv`, `agg_category_preferences.csv`, `agg_search_keywords.csv`, `agg_content_features.csv` | patterns & preferences |

Suggested measures: Conversion rate = conversions ÷ sessions · Bounce rate = bounces ÷ sessions · Avg session duration = total_session_seconds ÷ sessions · Pages per session = page_views ÷ sessions · Returning rate = 1 − new_visitors ÷ visitors.

## Privacy

- Synthetic data, labeled throughout.
- No user IDs, IP addresses, cities, device fingerprints or free-text logs; locations are regional only.
- Age bands come only from a self-declared, opt-in survey panel and are never inferred.
- Any aggregate with fewer than 50 contributors is shown as "<50".

## Using real data later

Replace the rows on the **Data** sheet with consent-based, already-aggregated data in the same columns. Every sheet keeps working. Before using predictions for decisions, replace the simulated formulas with a trained and evaluated model.
