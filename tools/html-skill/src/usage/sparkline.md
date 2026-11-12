# sparkline

A small line with its latest value, for a live number that needs a shape beside it. Not a chart: for axes, days or several series use `chart`.

```html
<div class="sparkline">
  <script type="application/json" data-sparkline>
  { "label": "Requests", "data": [12, 18, 9, 30, 24] }
  </script>
</div>
```

- `label` names it and `data` is the samples, oldest first. The script draws the label, the latest value, the line and an axis from 0 to the peak; the image is named "label, latest".
- Nothing yet: `"data": []` shows the sentence in `empty` ("No data yet" if you leave it out). Still waiting: `"loading": true` draws a flat line that breathes (a hold on every loop, or reduced motion, stills it).
- No fill, gradient or colour, and no second series; the line is secondary ink. `Basalt.sparkline(el, { label, data })` draws one from script, and again with new options.
