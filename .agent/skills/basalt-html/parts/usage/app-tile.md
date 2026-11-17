# app-tile

```html
<span class="app-tile" data-size="40" aria-hidden="true"><img src="app.png" alt="" width="200" height="200" draggable="false"></span> Company name
```

`.app-tile` (React's `AppTile`): the picture an app gives, clipped to a superellipse of exponent 5 (it takes no radius), with a 1px `--basalt-border-hairline` rim that follows the shape. Flat: no shadow, nothing drawn over the picture, none of it recoloured, dimmed, cropped, turned or animated.

- It is decorative: `aria-hidden="true"` on the span, `alt=""` on the image, and the company's name always in words beside it. It is not drawn in forced colours.
- `data-size` is 20, 32, 36, 40, 44, 48 or 52; left out, the tile is as wide as its box and square. Its box is reserved, so nothing moves when the picture arrives. There is no fallback for a picture that fails.
- **Never ship a company's icon file in the skill or an example**: the tile shows what the page has the right to show. Use a plain neutral image of your own.
