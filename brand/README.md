# Brand

The approved logo set for the three SRA Syndicate brands. Every drawing is one outlined path with no text or font,
so it renders the same everywhere. The owner approved these files as they are; don't redraw, re-export or "optimise"
one. The decisions and the council rounds behind them are kept outside this repo.

## Names

| Folder | Brand | Mark | Word |
|---|---|---|---|
| `sra-syndicate/` | SRA Syndicate | **Datum** | SRA Syndicate |
| `blacksand/` | Blacksand | **One bridge** | Blacksand |
| `n1/` | N1 | **N₁** | none; N₁ stands alone |

The wordmark rule: **Geist 600, Title case, −2% tracking, outlined.** "SRA Syndicate" and "Blacksand" are set this way;
N₁ is the mark alone, so it has no `word/` and no lockup.

## What each folder holds

A brand folder has the same layout in all three. Files with no suffix use `currentColor`; `-on-dark` and `-on-light`
are fixed colours for places that can't inherit one.

- `mark.svg`, `mark-16.svg`, `mark-32.svg`: the mark, and the drawings fitted to a 16 and a 32 px grid.
- `lockup*.svg` (Datum and One bridge): mark and word together. `lockup` is display size; `lockup-header-1x` and
  `lockup-header-2x` are fitted to whole pixels for a site header on a 1x and a 2x screen.
- `word/` (Datum and One bridge): the word alone: `word`, `word-header-1x`, `word-header-2x` and `word-card`.
- `favicon.svg`, `favicon-on-dark.ico`, `favicon-on-light.ico`, `favicon-tags.html`: the browser tab.
- `png/`: the favicon PNGs at 16 and 32 for dark and light, plus, for Datum, the SRA avatar (`avatar-512`) and, for N₁,
  the app tile (`app-512`). Their SVGs are `avatar-512.svg` and `app-512.svg` in the brand folder. Blacksand has neither.
- `icons/`: app icons for dark and light (`-on-dark`, `-on-light`): `app-icon-1024` and `-512` (stores and asset
  catalogs, which apply their own mask), `apple-touch-icon` (180), `maskable-512`, and `tile-512` and `-192` (the
  manifest's `any` icons). `src/` holds the SVG sources; `manifest-dark.webmanifest`, `manifest-light.webmanifest` and
  `head-tags.html` wire them in.
- `social-card-on-dark.png`, `social-card-on-light.png`: 1200 × 630 share cards.
- `hero.html`: the first-screen mark with its motion hook, exactly as the approved pages ship it.

`motion/` holds the entrance (below). `test/` holds the tests: `npm run test:brand`.

## Using them

**Paths.** Serve a brand folder as the web root. If you serve it elsewhere, keep the `/icons/` path: the head tags and
manifests name `/icons/…` and `/favicon…` absolutely.

**Head tags.** Paste `icons/head-tags.html` into the page's `<head>`. It links the tab icons (Chrome follows the colour
scheme live), the apple-touch-icon and the manifest, and sets `theme-color`. **Dark is the default icon** wherever a
platform keeps only one (a home-screen icon, an installed web app). A small script swaps both to the light files when
the device is in light mode at load. `favicon-tags.html` is the tab icons alone, with relative paths.

**The header word.** The two header files are fitted to whole pixels, so they are not interchangeable. Show the 1x file
by default and the 2x file from `min-resolution: 2dppx`:

```css
.word-2x { display: none; }
@media (min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 2) {
  .word-1x { display: none; }
  .word-2x { display: block; }
}
```

An `<img>` can use `srcset` instead. The same goes for `lockup-header-1x` and `-2x`.

**The motion.** The hero marks play a short entrance on Basalt's motion tokens, are at rest by 300 ms, and show the
resting mark under `prefers-reduced-motion`.

- `motion/logo-motion.js` is the player for Datum and N₁. Load it before the hero. It reads `--basalt-duration-*` and
  `--basalt-ease-out`, so the page needs Basalt's tokens (`@srasyndicate/basalt-tokens/tokens.css`). Without them it
  leaves the mark at rest.
- `motion/one-bridge.css` is One bridge's entrance (CSS only, no script), also on the tokens.
- `<brand>/hero.html` is the markup to use: the inline `<svg>` and, for Datum and N₁, the
  `<script>LogoMotion.arm(…)</script>` after it. One bridge's hero has no script and needs `one-bridge.css`.

## Still open

Adoption gates, from the owner's approval of the family:

- trademark clearance;
- Safari and Firefox (only Chromium and Chrome were tested, at 1x and 2x);
- a physical 1x screen;
- platform icon packaging (the home-screen, store and launcher icon masks were mocked, not tested on devices).

Follow-ups the council noted (decision 12), not decided:

- the 1x header file at 3 dppx (the header switch stays at 2 dppx; Muse wanted 1.5, Grok wanted 3 on the 1x file);
- a pixel-fitted 180 apple-touch-icon for all three brands.
