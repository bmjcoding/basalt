# chart

```
<figure class="chart">
  <script type="application/json" data-chart>
  { "title": "Training", "source": "Watch", "kind": "bar", "unit": "min", "summary": "Training averaged 54 min a day.",
    "days": ["2026-11-08", "2026-11-09", "2026-11-10"],
    "series": [{ "id": "train", "name": "Training", "values": [48, null, 61], "reasons": [null, "not worn", null] }],
    "plan": { "kind": "value", "label": "Goal", "values": [45, 45, 45] },
    "format": { "suffix": " min", "spoken": " minutes", "maximumFractionDigits": 0 } }
  </script>
</figure>
```

A series over time (`"kind": "line"` or `"bar"`), drawn at its own measured width from the JSON; it adds the legend that is the readout, the key hint, the keyboard, a "View as table" disclosure and the summary. Charts stacked in a `<div class="chart-group">` share one gutter so their plots line up. Synthetic or real data, never invented to fill space.

- **Required:** `title`, `kind`, `days` (ISO dates in UTC, oldest first, every day drawn), `series` (one for bars; up to three for lines) and `summary` (the sentence you write under the chart: direction, extremes, the plan, and each gap with its reason). A series is `id`, `name`, `values` (a number per day, `null` is a day not observed, never zero) and `reasons` (why, per day: "not worn, travel"; said in the lane, the readout, the day's sentence and the table).
- **Format:** `format` is `{ "duration": "minutes" }` ("7 h 23 m") or `Intl.NumberFormat` options with `prefix`, `suffix` and `spoken` (the suffix as spoken). `unit` is written once, on the top tick; `tickDivisor` (60 for hours) scales tick labels; `step` is the gap between gridlines; `fromZero` starts a line chart at zero (bars always do). `partial` is the index of a day that isn't final (hollow, "34 min so far"; `partialLabel`, `partialSuffix`). `plan`: `kind` `value` (`notes` per day) or `band` (`[low, high]` per day), `label`. `source` sits under the title, `heading` is 2 to 6 (default 3), `locale` ("en-US").
- The last day's sentence says "today" only when it is today's UTC date; for a closed range set `"now": "2026-11-12"` or leave it to the clock.
- Ink is the kind of value, shape is which series: no series takes a colour. Greys only.
- `Basalt.chart(figure, options)` draws one from script; there, `format`, `spoken`, `formatTick` and `formatPlan` can be functions. It draws once: a new data set is a new call.
- `"entrance": true` makes it the page's one entrance: on a first visit its marks draw once at load (bars from the baseline, a solid line along its length, other marks fade in); the title, legend, numbers and controls are at rest. Seen before, reduced motion, the hold, a hidden tab, a page opened below its first screen, print and a late script draw it at rest; the hold or printing mid-entrance settles it at once. A new data set (`Basalt.chart` again) mid-entrance glides every mark from where it is drawn. A page change without a reload: call `Basalt.pageChange()` first.
- A number beside a chart is its real value in the first frame and never counts up.
- `Basalt.trailingMean(values, { window, min })` is the trend of a line (React's `trailingMean`): the mean of the last 7 days once 3 readings are in it; one missing day keeps its trend, two stop it; it returns `null` where there is none, never NaN.
