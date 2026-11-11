# toggle

A pressed toggle is a `.btn` with `aria-pressed`. Only the secondary (default) and ghost buttons toggle; a latched primary reads as the action, a latched danger as an error.

```html
<button class="btn" aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Pause animations</button>
<button class="btn" data-variant="ghost" data-icon-only aria-pressed="false" aria-label="Expand"><i data-icon="Plus"></i></button>
```

- A text toggle has the 16px `.btn-check` seat first (it shows a check while pressed, so both states are one width); an icon-only toggle has none.
- A click doesn't switch it. Your script sets `aria-pressed="true"` or `"false"`. Pressed is a solid plate and primary ink, never a bar.
- Name it with a fixed label, not one that flips with the state. For on/off text with no button look, use a switch (see choice).
