# period

```html
<div class="period" role="group" aria-label="Week">
  <button class="btn" type="button" data-variant="ghost" data-icon-only aria-label="The week before"><span data-glyph="chevron-left"></span></button>
  <p class="period-label" aria-live="polite"><span class="visually-hidden">Week 8, build, </span>Sep 28 to Oct 4</p>
  <button class="btn" type="button" data-variant="ghost" data-icon-only aria-label="The week after"><span data-glyph="chevron-right"></span></button>
</div>
```

`.period` (React's `PeriodStepper`): two ghost icon buttons round a label that says which stretch of time is shown. It is not a pager and not a step flow. A press is an explicit act.

- The buttons are `.btn` ghost icon-only with the core `chevron-left` and `chevron-right`, named for the app's words ("The week before"). At the first or last period write `aria-disabled="true"` on the button, never `disabled`, so a keyboard user is not dropped; your script ignores its click.
- The label is 500, tabular, on one line, in a seat of at least 128px, and the polite live region: a hidden prefix says the number and name before the dates. Change the whole text in one write, and not more than once as it settles.
- `data-whole` on `.period` (the view has no periods): both buttons are `visibility: hidden` and keep their room, and the label is the whole span, so nothing moves.
- Under 640px of its container it takes its own row in a bar that wraps (`display: flex; flex-wrap: wrap`): full width, buttons at the ends, 52px tall, a hairline above, each button 44 by 44. The container is yours: `container-type: inline-size` on the bar's parent.
