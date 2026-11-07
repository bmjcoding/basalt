# Brand accents

The mineral core is shared. `data-brand` on the same element as the theme replaces the accent
roles. Focus (`border-focus`) and the chart plan stroke follow `accent-text`, so they pick up
the brand without a second override.

```html
<html data-theme="dark" data-brand="sra">
<html data-theme="light" data-brand="n1" style="--basalt-accent-h: 150">
```

Unset `data-brand`, or set `basalt`, for the mineral default. N1's hue defaults to cobalt
(255). Lightness and chroma stay fixed so every hue from 0 to 359 stays inside sRGB and at
least 4.5:1. The fixed chroma is lower than N1's earlier prototype (0.17 / 0.14): those
values leave yellow and orange hues outside sRGB. Swift exposes the same colours on
`Basalt.Brands` and `Basalt.N1.color(lightness:chroma:hue:)`.

Worst case below is the lowest contrast of that colour against the six surfaces, or of
`on-accent` against the accent fill, its hover and its press.

## Mineral core

| Role | Light | Dark |
|---|---|---|
| `surface-page` | `oklch(0.953 0.011 95)` `#f2f0e7` | `oklch(0.132 0.005 95)` `#080806` |
| `surface-sunken` | `oklch(0.932 0.012 95)` `#ebe9e0` | `oklch(0.168 0.006 95)` `#100f0c` |
| `surface-sunken-strong` | `oklch(0.914 0.013 95)` `#e5e3d9` | `oklch(0.198 0.006 95)` `#161613` |
| `surface-raised` | `oklch(0.976 0.007 95)` `#f8f7f2` | `oklch(0.228 0.006 95)` `#1d1c19` |
| `surface-overlay` | `oklch(0.986 0.005 95)` `#fbfaf7` | `oklch(0.262 0.006 95)` `#252421` |
| `surface-top` | `oklch(0.994 0.003 95)` `#fefdfb` | `oklch(0.292 0.007 95)` `#2d2c28` |
| `text-primary` | `oklch(0.25 0.01 95)` `#23221c` · 12.40:1 | `oklch(0.94 0.008 95)` `#edebe5` · 11.76:1 |
| `text-secondary` | `oklch(0.42 0.01 95)` `#4f4d47` · 6.56:1 | `oklch(0.78 0.008 95)` `#b9b7b2` · 7.00:1 |
| `text-tertiary` | `oklch(0.48 0.01 95)` `#5f5e57` · 5.07:1 | `oklch(0.68 0.008 95)` `#9a9893` · 4.87:1 |

## Default Basalt

A warm stone, not a hue. Chroma stays under 0.02 so it reads as neutral and stays clear of status.

| Role | Light | Dark |
|---|---|---|
| accent | `oklch(0.42 0.016 85)` `#514d43` | `oklch(0.78 0.012 90)` `#bab7af` |
| accent-text | `oklch(0.4 0.018 85)` `#4c473d` · 7.14:1 | `oklch(0.8 0.014 90)` `#c1bdb4` · 7.50:1 |

## SRA

Ember, one hue. Tuned from the product's `#b03b0a` / `#ff6b35` so the fills stay inside sRGB on the new surfaces. The counter is the same ember; SRA does not take a second hue.

| | Light | Dark |
|---|---|---|
| accent | `oklch(0.48 0.14 39)` `#9c3914` | `oklch(0.72 0.155 40)` `#f47f55` |
| accent-text | `oklch(0.46 0.13 39)` · 5.86:1 | `oklch(0.75 0.14 42)` · 6.00:1 |
| on-accent, worst fill | 6.51:1 | 5.61:1 |

## Blacksand

No hue. The accent is a grey highlight. `surface-brand` is a flat panel, chroma 0: light `oklch(0.9 0 0)` `#dedede`, dark `oklch(0.21 0 0)`. It is not a glow and it is not applied to controls.

| | Light | Dark |
|---|---|---|
| accent | `oklch(0.4 0 0)` `#484848` | `oklch(0.78 0 0)` `#b7b7b7` |
| accent-text | `oklch(0.38 0 0)` · 7.76:1 | `oklch(0.82 0 0)` · 8.03:1 |
| on-accent, worst fill | 8.44:1 | 6.74:1 |

## N1

Cobalt at hue 255 unless `--basalt-accent-h` is set. Every hue at these lightness and chroma values clears 4.5:1 and sRGB.

| Role | Light L / C | Dark L / C |
|---|---|---|
| accent | 0.48 / 0.08 | 0.74 / 0.10 |
| accent-hover | 0.43 / 0.07 | 0.79 / 0.085 |
| accent-pressed | 0.39 / 0.06 | 0.66 / 0.09 |
| accent-text | 0.46 / 0.075 | 0.76 / 0.095 |

Cobalt accent-text is 5.52:1 in the light theme and 6.54:1 in the dark. Text on the cobalt fills is at least 6.10:1 and 6.46:1.

## Portfolio

Teal on the mineral paper, peach as the small counter. The reference's neon mint is not used: it fails as text and reads as the bright fill the system is avoiding. The second teal shade is the subtle wash.

| | Light | Dark |
|---|---|---|
| accent | `oklch(0.46 0.075 180)` `#18665a` | `oklch(0.76 0.1 180)` `#5fc6b3` |
| accent-text | `oklch(0.45 0.075 180)` · 5.54:1 | `oklch(0.78 0.095 180)` · 7.30:1 |
| counter | `oklch(0.66 0.08 50)` `#ba8466` | `oklch(0.78 0.07 50)` `#ddab90` |
| on-accent, worst fill | 6.39:1 | 7.29:1 |

## Status

| Role | Light | Dark | Worst |
|---|---|---|---|
| danger | `oklch(0.48 0.17 8)` `#a6204b` | `oklch(0.76 0.14 8)` `#fb89a0` | 4.5:1 as text, including on hover and selected washes |
| warning | `oklch(0.52 0.105 102)` `#756a0c` | `oklch(0.84 0.175 105)` `#dcd015` | 4.24:1 / 8.70:1 (dots need 3:1) |
| success | `oklch(0.5 0.13 152)` `#05773b` | `oklch(0.74 0.18 152)` `#2fca6f` | 4.38:1 / 6.53:1 (dots need 3:1) |

Named accents sit at least 24° from these hues. A custom N1 hue inside a status arc (danger near 8, warning near 102, success near 152) will sit next to a status colour; that choice belongs to the product, and the contrast still holds.

## Chart grammar

Plan is an outlined band (`chart-plan` stroke, `chart-plan-fill` wash). Observation is a solid mark (`chart-observation`, the ink). Missing is a hatch (`chart-missing`), not a zero. Grid and axis are neutral. `ChartGrammar` draws one week of this and names each mark in words.
