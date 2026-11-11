# Sites

The pages of the four sites, built on Basalt with the HTML skill. **Basalt is the authority**: nothing here changes a Basalt
component, token or foundation. A need Basalt doesn't meet is **logged, not built here** (a gap for Basalt's own backlog; the page
waits or does without). A page is an HTML-skill page: one self-contained file, no network, dark and light, so read
`.agent/skills/basalt-html/SKILL.md` first.

## Layout

```
sites/
  SITE/                  one folder per site
    PAGE.body.html       a page: the body the skill's compose.mjs builds (a folder inside a site is fine: docs/intro.body.html)
    PAGE.css, PAGE.js    the page's own CSS and script, beside the body so Stylelint reads the CSS
  shared/                stand-ins, see below
  test/                  the checks every page runs, and the fixtures (sample, stage, brand) that prove them
  build.mjs              builds the pages
  dist/                  the built pages (git-ignored): dist/SITE/PAGE.html
```

## Build

```
node sites/build.mjs            every page of every site
node sites/build.mjs SITE       one site's pages
```

`build.mjs` resolves a page's includes, runs the skill's `compose.mjs` on the result and writes `sites/dist/SITE/PAGE.html`. It
fails, naming the page and the include, when an included file is missing. The includes are HTML comments:

| Include | Becomes |
|---|---|
| `<!-- @include page.css -->` | the file as a `<style>` (`.js` as a `<script>`; `.svg` and `.html` as they are) |
| `<!-- @include shared/NAME -->` | a stand-in from `sites/shared/`, the same way |
| `<!-- @include brand/PATH -->` | a file from `brand/`, inlined **byte for byte** (an inline SVG, `hero.html`, `motion/logo-motion.js`, `motion/one-bridge.css`) |
| `<!-- @data brand/PATH -->` | an image as a `data:` URL, for an attribute: `<img alt="" src="<!-- @data brand/blacksand/png/favicon-32-on-dark.png -->">` |

A path with no `shared/` or `brand/` in front is relative to the page and must stay inside its site. Nothing inside an included file is
resolved. A built page has no path into the repo and makes no network request. The files in `brand/` are never redrawn, recoloured,
cropped or edited, not even to drop an element (`brand/README.md`).

## Add a site, or a page

1. Make `sites/SITE/index.body.html` (the skill's SKILL.md says what a body is). Put its own CSS and script in files beside it and
   include them. Include `shared/site-header.css` and `shared/site-header.js` for the header, and `shared/stage.css` for a stage.
   Copy the header's markup from `sites/test/fixtures/sample/index.body.html` and the stage's from `.../stage/index.body.html`.
2. `node sites/build.mjs SITE`, then open `sites/dist/SITE/index.html` in both themes at 1440 and 390.
3. `npm run test:sites`. The checks in `sites/test/pages.test.mjs` run on every page under `sites/` without being written again:
   it builds, no network, no reference into the repo, the system theme and the toggle, no console error or warning, axe in both
   themes at 1440 and 390 and with the menu open, no sideways scroll at 320, 390, 720 and 1440, 44 by 44 touch targets on a coarse
   pointer, forced colours, reduced motion, a real print (`page.pdf`), every `brand/` file byte for byte, and the headroom check
   for a page with a stage. Nothing to add: a page that fails one is fixed, never skipped.
4. Anything a page needs that Basalt doesn't have is written down for Basalt's backlog, not drawn here.

## The stand-ins in `shared/`

The HTML skill doesn't hold the site header or the stage yet (another stream adds them: finish-nov10, batch 7). Until it does, the sites
share one stand-in each, written once and matched to the shipped React components (`SiteHeader`, its narrow menu, `Stage`) without
redesigning them:

- `site-header.css` and `site-header.js`: the smoked, solid and clear bar, the brand slot, the links with Nav's glide, the theme toggle,
  the one action, and the narrow menu (a top sheet with a real focus trap, Escape, focus return, an inert page and opacity only under
  reduced motion). The page writes the bar's markup and the script builds the pill spans, the Menu button and the menu from it.
- `stage.css`: the stage and the paired art's dark and light switch. It has no art of its own.

Their class names are React's (`basalt-site-header`, `basalt-stage`, …), so `sites/test/site-header-parity.test.mjs` and
`stage-parity.test.mjs` compare each to React in Chromium, in both themes, at 1440 and 390. Every difference that remains is written in
a list in the test file with its reason, and a new one fails the test. **When the skill gains the real module, delete the stand-in**
and move the pages to the skill's markup; nothing else in `sites/` depends on a stand-in's name but the pages' markup.
