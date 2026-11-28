# sparkline

A small line with its latest value, for a live number that needs a shape beside it. Not a chart: for axes, days or several series use `chart`.

```html
<div class="sparkline">
  <script type="application/json" data-sparkline>
  { "label": "Requests", "data": [12, 18, 9, 30, 24] }
  </script>
</div>
```

- `label` names it and `data` is the samples, oldest first. The script draws the label, the latest value, the line and a scale at the plot's start from the data's own range (0 to the peak, never a floor of 1); the image is named from the data.
- `times`: one ISO moment a sample, ascending. A sample is drawn where it happened, and a lane under the plot writes the first and last moments. `marks`: up to two `{ "time", "label" }` inside the span, a diamond then a square on the line, with a key under the lane. Never a line through the plot.
- Nothing yet: `"data": []` shows the sentence in `empty` ("No data yet" if you leave it out). Still waiting: `"loading": true` draws a flat line that breathes (a hold on every loop, or reduced motion, stills it).
- No fill, gradient or colour, and no second series; the line is secondary ink. `Basalt.sparkline(el, { label, data })` draws one from script, and again with new options.
