# framed-art

`.framed`: a picture in the flow with a rim, radius 12 and no shadow (React's `FramedArt`). A photograph with one version goes here.

```html
<figure class="framed" data-aspect="photo">
  <div class="framed-frame"><img src="dunes.webp" alt="Dunes at dusk" loading="lazy" decoding="async"></div>
  <figcaption>Dunes at the end of the day.<span class="framed-credit">Synthetic art</span></figcaption>
</figure>
```

- `data-aspect` is `square`, `photo` (3:2, the default), `screen` (16:10) or `wide` (16:9). The frame reserves that box before the picture loads, so nothing shifts; the picture fills it, cropped.
- Always write `alt`. If the file fails it shows in the frame; `alt=""` means decoration and shows nothing.
- The frame shows a plain placeholder while the picture loads and fades it in once decoded; the script sets `data-phase`. With no script the picture just shows.
- `figcaption` and `.framed-credit` are optional: what the picture shows, then its credit on its own line. Under the frame, never over the picture.
- It prints, and its rim is `CanvasText` in forced colours. In a `.card` it takes the card's padding off its radius.
