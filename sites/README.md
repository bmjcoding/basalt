# Sites

The pages of the Basalt sites, built on Basalt with the HTML skill. Today `sites/` holds one site, Blacksand. **Basalt is the authority**: nothing here
changes a Basalt component, token or foundation. A need Basalt doesn't meet is **logged, not built here** (a gap for Basalt's own backlog; the page
waits or does without). A page here is an HTML-skill page: one self-contained file, no network, dark and light, so read
`.agent/skills/basalt-html/SKILL.md` first. **That single-file, no-network rule is the HTML skill's own** (it is for explanations, reports and mockups),
and `sites/` holds one Blacksand page built that way today; how the real sites are built is not decided.

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

**The header's markup is finished at build time** (`sites/header-markup.mjs`). A page writes the short form, as in
`sites/test/fixtures/sample/index.body.html`:

```html
<header class="basalt-chrome basalt-site-header" [data-solid] [data-menu-label="Menu"]>
  <div class="basalt-site-bar">
    <a class="basalt-site-brand" href="/" aria-label="Sample home"><span class="basalt-site-brand-mark">Sample</span></a>
    <nav class="basalt-site-links" aria-label="Primary"><ul><li><a href="/docs" aria-current="page">Docs</a></li> …</ul></nav>
    <span class="basalt-bar-spacer"></span>
    <div class="basalt-bar-actions">
      <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button>
      <span class="basalt-site-action"><a class="btn" data-variant="primary" href="/start">Get started</a></span>
    </div>
  </div>
</header>
```

and the built page carries the final bar: each link's `basalt-site-link` class, pill and label (which reserves the current page's 600
width), the shared hover pill's element, the Menu button, and a one-line report that the page opens at the top (not for `data-solid`).
So **the bar in the first paint is the bar after the script runs**: the script only wires behaviour (the glide, the menu's opening, focus,
the clear bar's report) and builds the closed menu, which is invisible until used. The theme toggle's icon is the one thing the skill's own
script draws. A link may carry only `href` and `aria-current`, its label is plain text, the actions are the toggle and one
`.basalt-site-action`, and a page has one header; anything else fails the build, naming the page. Choose the form by the page: smoked is the
default, `data-solid` is solid, and the bar is clear over a `.basalt-stage[data-headroom]` that follows it.

**With scripts off**, a page at 1440 and above 720 shows the same bar, with real links. Under 720 there is no Menu button (nothing could open
it): the links are on a second row of the bar under the brand and the action stays beside the toggle, so every link is reachable. A page
with a stage and no script has the smoked bar, which is decided; with script it is the clear one.

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

The HTML skill now has a site header (`topbar-nav`) and a stage (`stage`) of its own, and the Blacksand page still includes the stand-ins below
(`sites/blacksand/index.body.html`, `@include shared/site-header.css` and `shared/stage.css`) and has not moved to the skill's modules. The sites
share one stand-in each, written once and matched to the shipped React components (`SiteHeader`, its narrow menu, `Stage`) without
redesigning them:

- `site-header.css` and `site-header.js`: the smoked, solid and clear bar, the brand slot, the links with Nav's glide, the theme toggle,
  the one action, and the narrow menu (a top sheet with a real focus trap, Escape, focus return, an inert page and opacity only under
  reduced motion). The page writes the short markup, the build finishes it (above), and the script wires it and builds the closed menu.
- `stage.css`: the stage and the paired art's dark and light switch. It has no art of its own.

Their class names are React's (`basalt-site-header`, `basalt-stage`, …), so `sites/test/site-header-parity.test.mjs` and
`stage-parity.test.mjs` compare each to React in Chromium, in both themes, at 1440 and 390. Every difference that remains is written in
a list in the test file with its reason, and a new one fails the test. **When a page moves to the skill's module, delete the stand-in**
and move the page to the skill's markup; nothing else in `sites/` depends on a stand-in's name but the pages' markup.
