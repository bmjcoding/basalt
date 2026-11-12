# art

Tokens only, no classes: a page gets them when its own `<style>` names one.

- Art tones, both themes: `--basalt-art-field` (the page colour), `--basalt-art-tone-1` to `--basalt-art-tone-4`, `--basalt-art-mark` (the primary ink), `--basalt-art-quiet-limit`.
- Chart roles and lengths: `--basalt-chart-*` and `--basalt-size-chart-*`.
- Aspect ratios: `--basalt-aspect-square`, `--basalt-aspect-photo` (3:2, the default), `--basalt-aspect-screen` (16:10), `--basalt-aspect-wide` (16:9). `--basalt-size-stage-headroom` is 80px.

Drawn art is monochrome: greys from the tones, gradients only between neighbouring tones, nothing past `--basalt-art-mark`, no accent.
