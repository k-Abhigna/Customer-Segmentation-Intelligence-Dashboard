# DAX measures reference

All measures live in the `_Measures` table, grouped by display folder. Study these — interviewers ask about them.

## 1 Base

### Sessions

```DAX
Sessions =
SUM(FactBehavior[sessions])
```
Format: `#,0`

### Visitor Days

```DAX
Visitor Days =
SUM(FactBehavior[visitors])
```
Format: `#,0`

### New Visitors

```DAX
New Visitors =
SUM(FactBehavior[new_visitors])
```
Format: `#,0`

### Returning Visitors

```DAX
Returning Visitors =
SUM(FactBehavior[returning_visitors])
```
Format: `#,0`

### Page Views

```DAX
Page Views =
SUM(FactBehavior[page_views])
```
Format: `#,0`

### Bounces

```DAX
Bounces =
SUM(FactBehavior[bounces])
```
Format: `#,0`

### Engaged Sessions

```DAX
Engaged Sessions =
SUM(FactBehavior[engaged_sessions])
```
Format: `#,0`

### Product Views

```DAX
Product Views =
SUM(FactBehavior[product_views])
```
Format: `#,0`

### Searches

```DAX
Searches =
SUM(FactBehavior[searches])
```
Format: `#,0`

### Clicks

```DAX
Clicks =
SUM(FactBehavior[clicks])
```
Format: `#,0`

### Scroll Events

```DAX
Scroll Events =
SUM(FactBehavior[scroll_events])
```
Format: `#,0`

### Landed Sessions

```DAX
Landed Sessions =
SUM(FactBehavior[stage_landing])
```
Format: `#,0`

### Exploring Sessions

```DAX
Exploring Sessions =
SUM(FactBehavior[stage_exploration])
```
Format: `#,0`

### Product Interest Sessions

```DAX
Product Interest Sessions =
SUM(FactBehavior[stage_product_interest])
```
Format: `#,0`

### Add to Cart

```DAX
Add to Cart =
SUM(FactBehavior[add_to_cart])
```
Format: `#,0`

### Checkouts

```DAX
Checkouts =
SUM(FactBehavior[checkouts])
```
Format: `#,0`

### Conversions

```DAX
Conversions =
SUM(FactBehavior[conversions])
```
Format: `#,0`

### Session Seconds

```DAX
Session Seconds =
SUM(FactBehavior[total_session_seconds])
```
Format: `#,0`

### Revenue

```DAX
Revenue =
SUM(FactBehavior[revenue])
```
Format: `\$#,0`

### Scroll Depth Sum

```DAX
Scroll Depth Sum =
SUM(FactBehavior[scroll_depth_sum])
```
Format: `#,0`

### Days in Period

```DAX
Days in Period =
DISTINCTCOUNT(FactBehavior[date])
```
Format: `0`

## 2 KPIs

### Total Unique Visitors
Estimated unique visitors. Daily visitor counts cannot simply be summed across days, so returning visitor-days are de-duplicated with each segment's daily revisit probability.

```DAX
Total Unique Visitors =
VAR Days = [Days in Period]
RETURN
    SUMX(
        VALUES(DimSegment[segment_id]),
        VAR p = CALCULATE(MAX(DimSegment[daily_return_prob]))
        VAR nv = CALCULATE([New Visitors])
        VAR rv = CALCULATE([Returning Visitors])
        RETURN nv + DIVIDE(rv, 1 + (Days - 1) * p)
    )
```
Format: `#,0`

### Active Users
Average daily visitors with an engaged session.

```DAX
Active Users =
DIVIDE([Visitor Days] * DIVIDE([Engaged Sessions], [Sessions]), [Days in Period])
```
Format: `#,0`

### Avg Session Duration (min)

```DAX
Avg Session Duration (min) =
DIVIDE([Session Seconds], [Sessions]) / 60
```
Format: `0.00`

### Pages per Session

```DAX
Pages per Session =
DIVIDE([Page Views], [Sessions])
```
Format: `0.00`

### Bounce Rate

```DAX
Bounce Rate =
DIVIDE([Bounces], [Sessions])
```
Format: `0.0%`

### Returning Visitor Rate

```DAX
Returning Visitor Rate =
1 - DIVIDE([New Visitors], [Visitor Days])
```
Format: `0.0%`

### Conversion Rate

```DAX
Conversion Rate =
DIVIDE([Conversions], [Sessions])
```
Format: `0.00%`

### Engagement Score
Composite 0–100 score: session duration, depth, bounce, scroll depth and engaged sessions.

```DAX
Engagement Score =
VAR s = [Sessions]
RETURN
    IF(
        s > 0,
        100 * (
            0.30 * MIN(1, DIVIDE([Session Seconds], s) / 480)
            + 0.20 * MIN(1, DIVIDE([Page Views], s) / 8)
            + 0.20 * (1 - DIVIDE([Bounces], s))
            + 0.15 * DIVIDE([Scroll Depth Sum], [Page Views])
            + 0.15 * DIVIDE([Engaged Sessions], s)
        )
    )
```
Format: `0.0`

### Avg Scroll Depth

```DAX
Avg Scroll Depth =
DIVIDE([Scroll Depth Sum], [Page Views])
```
Format: `0%`

### Clicks per Session

```DAX
Clicks per Session =
DIVIDE([Clicks], [Sessions])
```
Format: `0.0`

### Searches per Session

```DAX
Searches per Session =
DIVIDE([Searches], [Sessions])
```
Format: `0.00`

### Cart Rate
Share of product-interest sessions that add to cart.

```DAX
Cart Rate =
DIVIDE([Add to Cart], [Product Interest Sessions])
```
Format: `0.0%`

### Cart Abandonment

```DAX
Cart Abandonment =
1 - DIVIDE([Conversions], [Add to Cart])
```
Format: `0.0%`

### Checkout Abandonment

```DAX
Checkout Abandonment =
1 - DIVIDE([Conversions], [Checkouts])
```
Format: `0.0%`

### Average Order Value

```DAX
Average Order Value =
DIVIDE([Revenue], [Conversions])
```
Format: `\$#,0.00`

### Retention Rate 30d

```DAX
Retention Rate 30d =
DIVIDE(SUMX(VALUES(DimSegment[segment_id]), CALCULATE([Visitor Days]) * CALCULATE(MAX(DimSegment[retention_rate_30d]))), [Visitor Days])
```
Format: `0%`

## 3 Period comparison

### Total Unique Visitors PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Total Unique Visitors PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Total Unique Visitors], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `#,0`

### Total Unique Visitors Change %

```DAX
Total Unique Visitors Change % =
IF(NOT ISBLANK([Total Unique Visitors PP]), DIVIDE([Total Unique Visitors] - [Total Unique Visitors PP], [Total Unique Visitors PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Total Unique Visitors Change Label

```DAX
Total Unique Visitors Change Label =
VAR d = [Total Unique Visitors Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Total Unique Visitors Change Color

```DAX
Total Unique Visitors Change Color =
VAR d = [Total Unique Visitors Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Active Users PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Active Users PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Active Users], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `#,0`

### Active Users Change %

```DAX
Active Users Change % =
IF(NOT ISBLANK([Active Users PP]), DIVIDE([Active Users] - [Active Users PP], [Active Users PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Active Users Change Label

```DAX
Active Users Change Label =
VAR d = [Active Users Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Active Users Change Color

```DAX
Active Users Change Color =
VAR d = [Active Users Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Avg Session Duration (min) PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Avg Session Duration (min) PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Avg Session Duration (min)], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `0.00`

### Avg Session Duration (min) Change %

```DAX
Avg Session Duration (min) Change % =
IF(NOT ISBLANK([Avg Session Duration (min) PP]), DIVIDE([Avg Session Duration (min)] - [Avg Session Duration (min) PP], [Avg Session Duration (min) PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Avg Session Duration (min) Change Label

```DAX
Avg Session Duration (min) Change Label =
VAR d = [Avg Session Duration (min) Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Avg Session Duration (min) Change Color

```DAX
Avg Session Duration (min) Change Color =
VAR d = [Avg Session Duration (min) Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Pages per Session PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Pages per Session PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Pages per Session], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `0.00`

### Pages per Session Change %

```DAX
Pages per Session Change % =
IF(NOT ISBLANK([Pages per Session PP]), DIVIDE([Pages per Session] - [Pages per Session PP], [Pages per Session PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Pages per Session Change Label

```DAX
Pages per Session Change Label =
VAR d = [Pages per Session Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Pages per Session Change Color

```DAX
Pages per Session Change Color =
VAR d = [Pages per Session Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Bounce Rate PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Bounce Rate PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Bounce Rate], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `0.0%`

### Bounce Rate Change %

```DAX
Bounce Rate Change % =
IF(NOT ISBLANK([Bounce Rate PP]), DIVIDE([Bounce Rate] - [Bounce Rate PP], [Bounce Rate PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Bounce Rate Change Label

```DAX
Bounce Rate Change Label =
VAR d = [Bounce Rate Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Bounce Rate Change Color

```DAX
Bounce Rate Change Color =
VAR d = [Bounce Rate Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d < 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Returning Visitor Rate PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Returning Visitor Rate PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Returning Visitor Rate], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `0.0%`

### Returning Visitor Rate Change %

```DAX
Returning Visitor Rate Change % =
IF(NOT ISBLANK([Returning Visitor Rate PP]), DIVIDE([Returning Visitor Rate] - [Returning Visitor Rate PP], [Returning Visitor Rate PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Returning Visitor Rate Change Label

```DAX
Returning Visitor Rate Change Label =
VAR d = [Returning Visitor Rate Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Returning Visitor Rate Change Color

```DAX
Returning Visitor Rate Change Color =
VAR d = [Returning Visitor Rate Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Conversion Rate PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Conversion Rate PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Conversion Rate], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `0.00%`

### Conversion Rate Change %

```DAX
Conversion Rate Change % =
IF(NOT ISBLANK([Conversion Rate PP]), DIVIDE([Conversion Rate] - [Conversion Rate PP], [Conversion Rate PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Conversion Rate Change Label

```DAX
Conversion Rate Change Label =
VAR d = [Conversion Rate Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Conversion Rate Change Color

```DAX
Conversion Rate Change Color =
VAR d = [Conversion Rate Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

### Engagement Score PP
Same KPI for the equal-length period immediately before the selected dates.

```DAX
Engagement Score PP =
VAR MinD = MIN(DimDate[Date])
VAR MaxD = MAX(DimDate[Date])
VAR N = INT(MaxD - MinD) + 1
VAR DataStart = CALCULATE(MIN(DimDate[Date]), REMOVEFILTERS(DimDate))
RETURN
    IF(MinD - N >= DataStart, CALCULATE([Engagement Score], REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1)))
```
Format: `0.0`

### Engagement Score Change %

```DAX
Engagement Score Change % =
IF(NOT ISBLANK([Engagement Score PP]), DIVIDE([Engagement Score] - [Engagement Score PP], [Engagement Score PP]))
```
Format: `+0.0%;-0.0%;0.0%`

### Engagement Score Change Label

```DAX
Engagement Score Change Label =
VAR d = [Engagement Score Change %]
RETURN
    IF(ISBLANK(d), "no prior period in data", IF(d >= 0, "▲ ", "▼ ") & FORMAT(ABS(d), "0.0%") & " vs previous period")
```

### Engagement Score Change Color

```DAX
Engagement Score Change Color =
VAR d = [Engagement Score Change %]
RETURN
    SWITCH(TRUE(), ISBLANK(d), "#8792B0", d > 0, "#34D399", d = 0, "#8792B0", "#FB7185")
```

## 2 KPIs

### Selected KPI
Value of the KPI picked in the KPI selector slicer.

```DAX
Selected KPI =
SWITCH(
    SELECTEDVALUE(KPISelector[KPI], "Total Unique Visitors"),
    "Total Unique Visitors", [Total Unique Visitors],
    "Active Users", [Active Users],
    "Avg Session Duration (min)", [Avg Session Duration (min)],
    "Pages per Session", [Pages per Session],
    "Bounce Rate", [Bounce Rate],
    "Returning Visitor Rate", [Returning Visitor Rate],
    "Conversion Rate", [Conversion Rate],
    "Engagement Score", [Engagement Score],
    BLANK()
)
```
Format: `#,0.00`

### Selected KPI Title

```DAX
Selected KPI Title =
"Daily trend — " & SELECTEDVALUE(KPISelector[KPI], "Total Unique Visitors")
```

## 4 Channels

### Channel Sessions
Sessions attributed to traffic sources via the modeled segment × channel mix.

```DAX
Channel Sessions =
SUMX(ChannelMix, ChannelMix[share] * CALCULATE([Sessions], TREATAS({ChannelMix[segment_id]}, DimSegment[segment_id])))
```
Format: `#,0`

### Channel Conversions

```DAX
Channel Conversions =
SUMX(ChannelMix, ChannelMix[conv_coef] * CALCULATE([Conversions], TREATAS({ChannelMix[segment_id]}, DimSegment[segment_id])))
```
Format: `#,0`

### Channel Avg Duration (min)

```DAX
Channel Avg Duration (min) =
DIVIDE(SUMX(ChannelMix, ChannelMix[dur_coef] * CALCULATE([Session Seconds], TREATAS({ChannelMix[segment_id]}, DimSegment[segment_id]))), [Channel Sessions]) / 60
```
Format: `0.00`

### Channel Bounce Rate

```DAX
Channel Bounce Rate =
DIVIDE(SUMX(ChannelMix, ChannelMix[bounce_coef] * CALCULATE([Bounces], TREATAS({ChannelMix[segment_id]}, DimSegment[segment_id]))), [Channel Sessions])
```
Format: `0.0%`

### Channel Conversion Rate

```DAX
Channel Conversion Rate =
DIVIDE([Channel Conversions], [Channel Sessions])
```
Format: `0.00%`

## 5 Pages & navigation

### Page Views (modeled)
Filtered page views distributed to page templates using the segment page mix.

```DAX
Page Views (modeled) =
SUMX(PageMix, PageMix[weight] * CALCULATE([Page Views], TREATAS({PageMix[segment_id]}, DimSegment[segment_id])))
```
Format: `#,0`

### Est. Transitions
Estimated page-to-page transitions = filtered page views × transition probability.

```DAX
Est. Transitions =
SUMX(Transitions, Transitions[probability] * CALCULATE([Page Views (modeled)], TREATAS({Transitions[from_page_id]}, DimPage[page_id])))
```
Format: `#,0`

### Transition Probability

```DAX
Transition Probability =
DIVIDE([Est. Transitions], [Page Views (modeled)])
```
Format: `0.0%`

## 6 Preferences

### Product Views (modeled)

```DAX
Product Views (modeled) =
SUMX(CategoryMix, CategoryMix[weight] * CALCULATE([Product Views], TREATAS({CategoryMix[segment_id]}, DimSegment[segment_id])))
```
Format: `#,0`

### Category Share

```DAX
Category Share =
DIVIDE([Product Views (modeled)], CALCULATE([Product Views (modeled)], REMOVEFILTERS(CategoryMix[category], CategoryMix[subcategory])))
```
Format: `0.0%`

## 7 Journey

### Stage Sessions

```DAX
Stage Sessions =
SWITCH(
    SELECTEDVALUE(JourneyStages[Stage Order]),
    1, [Sessions],
    2, [Landed Sessions],
    3, [Exploring Sessions],
    4, [Product Interest Sessions],
    5, [Add to Cart],
    6, [Checkouts],
    7, [Conversions]
)
```
Format: `#,0`

### Stage Conversion from Previous

```DAX
Stage Conversion from Previous =
VAR o = SELECTEDVALUE(JourneyStages[Stage Order])
VAR prev = CALCULATE([Stage Sessions], REMOVEFILTERS(JourneyStages), JourneyStages[Stage Order] = o - 1)
RETURN
    IF(o = 1, 1, DIVIDE([Stage Sessions], prev))
```
Format: `0.0%`

### Stage Drop-off

```DAX
Stage Drop-off =
IF(NOT ISBLANK([Stage Sessions]), 1 - [Stage Conversion from Previous])
```
Format: `0.0%`

### Stage Share of Sessions

```DAX
Stage Share of Sessions =
DIVIDE([Stage Sessions], [Sessions])
```
Format: `0.00%`

### Journey Completion Rate

```DAX
Journey Completion Rate =
DIVIDE([Conversions], [Sessions])
```
Format: `0.00%`

## 8 Simulated predictions

### Budget Change Value

```DAX
Budget Change Value =
SELECTEDVALUE(ParamBudget[Budget Change %], 0)
```
Format: `0`

### Personalization Value

```DAX
Personalization Value =
SELECTEDVALUE(ParamPersonalization[Personalization Level], 0)
```
Format: `0`

### Discount Value

```DAX
Discount Value =
SELECTEDVALUE(ParamDiscount[Discount %], 0)
```
Format: `0`

### Email Cadence Value

```DAX
Email Cadence Value =
SELECTEDVALUE(ParamEmail[Emails per Week], 2)
```
Format: `0`

### Retargeting On

```DAX
Retargeting On =
IF(SELECTEDVALUE(ParamRetargeting[Consented Retargeting], "No") = "Yes", 1, 0)
```
Format: `0`

### Baseline Purchase Intent
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Baseline Purchase Intent =
IF([Sessions] > 0, 1 / (1 + EXP(-(-1.6 + 4 * [Cart Rate] + 1.2 * [Engagement Score] / 100))))
```
Format: `0.0%`

### Scenario Purchase Intent
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario Purchase Intent =
IF([Sessions] > 0, 1 / (1 + EXP(-(-1.6 + 4 * [Cart Rate] + 1.2 * [Engagement Score] / 100 + 0.35 * LN(1 + [Budget Change Value] / 100) + 0.006 * [Personalization Value] + 0.02 * [Discount Value] + 0.18 * [Retargeting On]))))
```
Format: `0.0%`

### Purchase Intent Change (pts)
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Purchase Intent Change (pts) =
([Scenario Purchase Intent] - [Baseline Purchase Intent]) * 100
```
Format: `+0.0;-0.0;0.0`

### Baseline Churn Risk
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Baseline Churn Risk =
IF([Sessions] > 0, 1 / (1 + EXP(-(1.2 - 3.2 * [Retention Rate 30d] - 1.5 * [Engagement Score] / 100))))
```
Format: `0.0%`

### Scenario Churn Risk
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario Churn Risk =
IF([Sessions] > 0, 1 / (1 + EXP(-(1.2 - 3.2 * [Retention Rate 30d] - 1.5 * [Engagement Score] / 100 + -0.1 * LN(1 + [Budget Change Value] / 100) - 0.008 * [Personalization Value] - 0.1 * ([Email Cadence Value] - 2) + 0.06 * POWER(MAX(0, [Email Cadence Value] - 4), 2) - 0.01 * [Discount Value]))))
```
Format: `0.0%`

### Churn Risk Change (pts)
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Churn Risk Change (pts) =
([Scenario Churn Risk] - [Baseline Churn Risk]) * 100
```
Format: `+0.0;-0.0;0.0`

### Baseline Repeat Visit Likelihood
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Baseline Repeat Visit Likelihood =
IF([Sessions] > 0, 1 / (1 + EXP(-(-1 + 2.6 * [Returning Visitor Rate] + 1.4 * [Engagement Score] / 100))))
```
Format: `0.0%`

### Scenario Repeat Visit Likelihood
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario Repeat Visit Likelihood =
IF([Sessions] > 0, 1 / (1 + EXP(-(-1 + 2.6 * [Returning Visitor Rate] + 1.4 * [Engagement Score] / 100 + 0.15 * LN(1 + [Budget Change Value] / 100) + 0.006 * [Personalization Value] + 0.12 * ([Email Cadence Value] - 2) - 0.03 * POWER([Email Cadence Value] - 2, 2) + 0.2 * [Retargeting On]))))
```
Format: `0.0%`

### Repeat Visit Likelihood Change (pts)
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Repeat Visit Likelihood Change (pts) =
([Scenario Repeat Visit Likelihood] - [Baseline Repeat Visit Likelihood]) * 100
```
Format: `+0.0;-0.0;0.0`

### Baseline Conversion Probability
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Baseline Conversion Probability =
IF([Sessions] > 0, 1 / (1 + EXP(-(LN(DIVIDE(MAX(0.000001, [Conversion Rate]), 1 - [Conversion Rate]))))))
```
Format: `0.00%`

### Scenario Conversion Probability
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario Conversion Probability =
IF([Sessions] > 0, 1 / (1 + EXP(-(LN(DIVIDE(MAX(0.000001, [Conversion Rate]), 1 - [Conversion Rate])) + 0.25 * LN(1 + [Budget Change Value] / 100) + 0.004 * [Personalization Value] + 0.035 * [Discount Value] + 0.12 * [Retargeting On]))))
```
Format: `0.00%`

### Conversion Probability Change (pts)
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Conversion Probability Change (pts) =
([Scenario Conversion Probability] - [Baseline Conversion Probability]) * 100
```
Format: `+0.0;-0.0;0.0`

### Gauge Max 100%

```DAX
Gauge Max 100% =
1
```
Format: `0%`

### Gauge Max 10%

```DAX
Gauge Max 10% =
0.1
```
Format: `0%`

### Traffic Multiplier
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Traffic Multiplier =
MAX(0.3, 1 + 0.42 * LN(1 + [Budget Change Value] / 100) + 0.04 * [Retargeting On] + 0.04 * ([Email Cadence Value] - 2) / 2)
```
Format: `0.00`

### Baseline 30d Conversions
Run-rate of the selected period scaled to 30 days. SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Baseline 30d Conversions =
DIVIDE([Conversions], [Days in Period]) * 30
```
Format: `#,0`

### Scenario 30d Conversions
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario 30d Conversions =
[Baseline 30d Conversions] * DIVIDE([Scenario Conversion Probability], [Baseline Conversion Probability]) * [Traffic Multiplier]
```
Format: `#,0`

### Baseline 30d Revenue
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Baseline 30d Revenue =
[Baseline 30d Conversions] * [Average Order Value]
```
Format: `\$#,0`

### Scenario 30d Revenue
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario 30d Revenue =
[Scenario 30d Conversions] * [Average Order Value] * (1 - [Discount Value] / 100 * 0.85)
```
Format: `\$#,0`

### Scenario Conversions Change %
SIMULATED — heuristic formula, not a trained or validated model.

```DAX
Scenario Conversions Change % =
DIVIDE([Scenario 30d Conversions], [Baseline 30d Conversions]) - 1
```
Format: `+0.0%;-0.0%;0.0%`

### Simulation Disclaimer

```DAX
Simulation Disclaimer =
"SIMULATED what-if forecast: transparent heuristic formulas over synthetic history. Not a validated AI/ML prediction."
```

## 9 Rule-based insights

### Insight Evidence
Evidence text for each predefined analytical rule. No AI model is called.

```DAX
Insight Evidence =
VAR id = SELECTEDVALUE(InsightRules[Rule ID])
RETURN
    SWITCH(
        id,
        1,
            VAR f = CALCULATE([Engagement Score], DimSegment[segment_id] = "first")
            VAR r = CALCULATE([Engagement Score], DimSegment[segment_id] <> "first")
            RETURN IF(NOT ISBLANK(f) && NOT ISBLANK(r) && r > f, "Returning audiences score " & FORMAT(r, "0.0") & " on engagement vs " & FORMAT(f, "0.0") & " for first-time visitors.", "Not triggered for current filters"),
        2,
            VAR m = CALCULATE([Cart Abandonment], DimDevice[device_id] = "mobile")
            VAR d = CALCULATE([Cart Abandonment], DimDevice[device_id] = "desktop")
            VAR ok = CALCULATE([Add to Cart], DimDevice[device_id] = "mobile") > 50 && CALCULATE([Add to Cart], DimDevice[device_id] = "desktop") > 50
            RETURN IF(ok && m > d, FORMAT(m, "0.0%") & " of mobile carts do not convert vs " & FORMAT(d, "0.0%") & " on desktop.", "Not triggered for current filters"),
        3,
            VAR c = CALCULATE(MAX(Transitions[probability]), Transitions[from_page_id] = "compare", Transitions[to_page_id] = "cart")
            VAR p = CALCULATE(MAX(Transitions[probability]), Transitions[from_page_id] = "product", Transitions[to_page_id] = "cart")
            RETURN IF(c > p, FORMAT(c, "0.0%") & " of comparison views go straight to the cart vs " & FORMAT(p, "0.0%") & " from a product page.", "Not triggered for current filters"),
        4,
            VAR o = CALCULATE([Channel Avg Duration (min)], ChannelMix[channel] = "Organic Search")
            VAR a = [Avg Session Duration (min)]
            RETURN IF(o > a, "Organic sessions average " & FORMAT(o, "0.0") & " min vs " & FORMAT(a, "0.0") & " min site-wide.", "Not triggered for current filters"),
        5,
            VAR t = TOPN(1, VALUES(ChannelMix[channel]), [Channel Conversion Rate], DESC)
            VAR nm = MAXX(t, ChannelMix[channel])
            VAR v = MAXX(t, [Channel Conversion Rate])
            RETURN IF(NOT ISBLANK(v), nm & " converts at " & FORMAT(v, "0.00%") & " vs " & FORMAT([Conversion Rate], "0.00%") & " overall.", "Not triggered for current filters"),
        6,
            VAR w = CALCULATE([Cart Rate], DimSegment[segment_id] = "window")
            VAR s = [Cart Rate]
            RETURN IF(NOT ISBLANK(w) && w < s, "Only " & FORMAT(w, "0.0%") & " of interested Window Shopper sessions add to cart (site " & FORMAT(s, "0.0%") & ").", "Not triggered for current filters"),
        7,
            VAR regs = FILTER(VALUES(DimRegion[region_name]), [Sessions] > 50)
            VAR hi = TOPN(1, regs, [Conversion Rate], DESC)
            VAR lo = TOPN(1, regs, [Conversion Rate], ASC)
            RETURN IF(COUNTROWS(regs) > 1, MAXX(hi, DimRegion[region_name]) & " leads at " & FORMAT(MAXX(hi, [Conversion Rate]), "0.00%") & "; " & MAXX(lo, DimRegion[region_name]) & " trails at " & FORMAT(MAXX(lo, [Conversion Rate]), "0.00%") & ".", "Not triggered for current filters"),
        8,
            VAR c1 = [Conversion Rate]
            VAR c0 = [Conversion Rate PP]
            RETURN IF(NOT ISBLANK(c0), "Conversion rate " & IF(c1 >= c0, "improved", "declined") & " from " & FORMAT(c0, "0.00%") & " to " & FORMAT(c1, "0.00%") & ".", "Not triggered for current filters"),
        9,
            VAR MinD = MIN(DimDate[Date])
            VAR N = INT(MAX(DimDate[Date]) - MinD) + 1
            VAR cur = CALCULATE([Visitor Days], DimSegment[segment_id] = "atrisk")
            VAR prv = CALCULATE([Visitor Days], DimSegment[segment_id] = "atrisk", REMOVEFILTERS(DimDate), DATESBETWEEN(DimDate[Date], MinD - N, MinD - 1))
            RETURN IF(prv > 0 && cur > prv * 1.01, "At-Risk visitor-days grew " & FORMAT(cur / prv - 1, "0.0%") & " vs the previous period.", "Not triggered for current filters"),
        "Not triggered for current filters"
    )
```

### Insight Triggered

```DAX
Insight Triggered =
IF(ISBLANK(SELECTEDVALUE(InsightRules[Rule ID])), BLANK(), IF([Insight Evidence] = "Not triggered for current filters", "No", "Yes"))
```

### Insights Triggered Count

```DAX
Insights Triggered Count =
COUNTROWS(FILTER(VALUES(InsightRules[Rule ID]), [Insight Evidence] <> "Not triggered for current filters"))
```
Format: `0`

### Insights Summary

```DAX
Insights Summary =
[Insights Triggered Count] & " of " & COUNTROWS(InsightRules) & " rules triggered for " & FORMAT([Sessions], "#,0") & " sessions in scope"
```

## 2 KPIs

### Scope Label

```DAX
Scope Label =
"Synthetic data · " & FORMAT(MIN(DimDate[Date]), "mmm d") & " – " & FORMAT(MAX(DimDate[Date]), "mmm d, yyyy") & " · " & FORMAT([Sessions], "#,0") & " sessions in scope"
```
