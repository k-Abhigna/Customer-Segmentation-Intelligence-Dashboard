# BehaviorIQ: Power BI project

A 10-page Power BI report built on the synthetic, aggregated behavioral dataset in `data/`. It is delivered as a Power BI Project (`.pbip`), which is Microsoft's open, text-based format. You open it in Power BI Desktop, then save it as a `.pbix`.

| | |
|---|---|
| Semantic model | 23 tables in a star schema, 10 relationships, 117 DAX measures in display folders, 1 RLS role |
| Power Query | CSV import with typed columns, a `DataFolder` parameter, lookup columns, inline mapping tables |
| Report | 10 pages, 135 visuals, synced slicers, dark custom theme, a default date filter of the last 30 days |

## 1. Open it (about 5 minutes)

**Requirements:** Power BI Desktop, June 2025 release or newer. The latest release from the Microsoft Store is best.

1. Unzip so the files are at `C:\BehaviorIQ\`, with the CSVs at `C:\BehaviorIQ\data\`.
2. Double-click **`BehaviorIQ.pbip`**.
3. The model opens empty because a project stores no data. Click **Refresh** on the Home ribbon.
   - If you put the files somewhere else: **Home → Transform data → Edit parameters → `DataFolder`**. Enter your folder path ending with a backslash, e.g. `D:\Projects\BehaviorIQ\data\`. Then click **Refresh**.
4. **File → Save as → Save as type: Power BI file (\*.pbix).** You now have `BehaviorIQ.pbix`.

> On an older Desktop version that refuses to open the project, enable all three preview features under **File → Options → Preview features**: *Power BI Project (.pbip) save option*, *Store semantic model using TMDL format*, and *Store reports using enhanced metadata format (PBIR)*. Then restart Desktop.

## 2. Add the Sankey diagram (2 minutes)

A Sankey is a custom visual, so it can't be included in the project files.
1. In **Browsing Patterns**, go to **Visualizations → … → Get more visuals**, search for **Sankey Chart** (by Microsoft) and add it.
2. Set **Source** = `DimPage[page_name]`, **Destination** = `Transitions[to_page_name]`, and **Weight** = `[Est. Transitions]`.

The *Journey links* idea from the Excel version works the same way: a source, a target and a weight.

## 3. Check your numbers

With the default filter (Sep 30 – Oct 29, 2026, all segments, devices and regions), the Overview page should show:

| KPI | Value | vs previous 30 days |
|---|---|---|
| Total Unique Visitors | 1,041,911 | ▲ 4.6% |
| Active Users | 25,044 | ▲ 4.8% |
| Avg Session Duration (min) | 3.52 | ▲ 0.2% |
| Pages per Session | 4.03 | ▲ 0.1% |
| Bounce Rate | 41.4% | ▼ 0.4% (green, because lower is better) |
| Returning Visitor Rate | 55.8% | ▼ 0.3% |
| Conversion Rate | 3.01% | ▲ 1.7% |
| Engagement Score | 51.3 | ▲ 0.2% |

Sessions in scope: 1,770,614. If your numbers match, the model works.

## 4. What's in the report

| Page | Highlights |
|---|---|
| Overview | 8 KPI cards with period-over-period change, a KPI selector driving a trend chart, device donut, new vs returning, engagement vs bounce, traffic sources, weekday × hour heatmap |
| Audience Intelligence | Regions, segment × region matrix, new vs returning by segment, device performance |
| Behavior Analytics | Page ranking, page interaction table, activity timeline, engagement funnel |
| Browsing Patterns | Page picker → next destinations, entry pages, from → to flow matrix, exit pages, search keywords |
| Customer Segmentation | Segment comparison table, engagement vs conversion bubble chart, rules, traffic sources per segment |
| Journey Analysis | 7-stage funnel, stage conversion and drop-off, stage conversion by device, conversion by channel |
| Preference Intelligence | Category treemap, keywords, content and features, preferred browsing hours |
| Predictive Insights | **Simulated** what-if parameters for budget, personalization, discount, email and retargeting → 4 gauges, 30-day projections, segment predictions |
| AI Recommendations | 9 rule-based insights with evidence that updates with filters. No AI model is called. |
| About & Data Privacy | Data, model, privacy and limitations notes |

## 5. The data model

```
                  DimDate (marked date table, DAX CALENDAR)
                        │ 1
DimDevice ─1──*─ FactBehavior ─*──1─ DimRegion
                        │ *
                        1
                    DimSegment ─1──*─ ChannelMix / PageMix / CategoryMix  (modeled shares)
DimPage ─1──*─ Transitions, PageMix, PageMetrics
Disconnected: JourneyStages, KPISelector, InsightRules, Param* (what-if)
```

Design choices you can explain in an interview:
- **Star schema.** One fact table with single-direction one-to-many relationships. Raw fact columns are hidden, implicit measures are discouraged, and all logic lives in `_Measures`.
- **Unique visitors aren't additive.** The data is aggregated per day, so summing daily visitors double-counts. `Total Unique Visitors` de-duplicates returning visitor-days using each segment's revisit probability, and is labeled as an estimate.
- **Period-over-period comparison** with REMOVEFILTERS and DATESBETWEEN over an equal-length window. It works for any date range, not just months.
- **Disconnected tables with SWITCH** drive the funnel, the KPI selector and the rule engine.
- **Modeled attribution.** `ChannelMix`, `PageMix` and `CategoryMix` use TREATAS so channel, page and category breakdowns respond to every filter.
- **Row-level security.** The *Europe Manager* role restricts DimRegion to Europe. Test it with **Modeling → View as**.

Every measure is listed with its DAX in **`MEASURES.md`**.

## 6. If something doesn't open

I generated these files against Microsoft's published PBIR schemas (all 151 report files validate) and cross-checked every DAX reference. I could not open them in Power BI Desktop, because it doesn't run in the environment where I built them. If Desktop shows an error, it names the file and the problem; send me that message and I'll fix it.

## 7. Making it yours for your resume

Interviewers will ask how you built it, so rebuild it yourself once. Use this project as the answer key:
1. Start a new `.pbix` and import the CSVs with **Get data → Text/CSV**.
2. Build DimDate in DAX, mark it as the date table, and create the relationships.
3. Write the measures from `MEASURES.md` by hand. Start with Base and KPIs, then period comparison, then the rest.
4. Build the pages, then compare your numbers with section 3.

The data is synthetic, and the predictions are simulated what-if formulas. Say both plainly on your resume and in interviews.
