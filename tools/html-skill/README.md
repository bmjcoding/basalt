# The Basalt HTML skill: sources

`.agent/skills/basalt-html/` is what an agent uses to write a standalone page. It is **built** from this folder; never edit the
files there by hand (a test fails if they drift from the build). The agent reads only `SKILL.md`, writes a body fragment, and runs
`compose.mjs`, which assembles the page. The skill stays cheap to read because the stylesheet and script are never in front of the
agent.

```
src/
  core.css, core.js        what every page gets (tokens come before core.css, from packages/tokens)
  modules/<name>.css|js    what a page gets only when its markup uses it (the accent module has no file here: build.mjs makes it from
                           packages/tokens/dist/css/accents.css, and a page gets it only when its markup sets data-accent)
  modules.json             the manifest: each module's classes, attributes, tags, text patterns, requirements, icons and byte budget
  icons.json               the Phosphor names a page can draw (Bold and Regular paths are read from @phosphor-icons/react)
  compose.mjs              the tool an agent runs; copied into the skill folder as it is
  examples/*.body.html     two example bodies, copied into the skill folder
build.mjs                  writes the skill folder: minified parts/, compose.mjs, examples/ (npm run build runs it)
test/                      html-skill (behaviour, both themes, axe), compose (detection, budgets, cheat-sheet mapping),
                           pixel (the example pages and a page with every component match #26), parity (against React)
```

The sources stay readable, with their comments. `build.mjs` minifies each file with esbuild (a dev dependency in the root
`package.json`) and keeps legal comments (`/*!`), which is where Phosphor's and Geist's licences ride.

## Add a module

1. Write `src/modules/<name>.css` (inside `@layer basalt { }`; element rules inside `@layer reset { }`), and `<name>.js` if it needs
   script. The CSS carries its own `prefers-reduced-motion`, `forced-colors` and `print` rules. Use `%panel%` for the in-flow panel
   selector. Lengths come from `--basalt-*` tokens (the lint covers this folder).
2. A script module is one IIFE on `window.Basalt`: `(function (B) { var _ = B._; … _.step(order, "name", fn); })(window.Basalt);`.
   `B._` has `esc`, `icon`, `announce`, `getTheme`, `setTheme`, `step` (an init step; the order says where it runs) and, once the kbd
   module is in, `_.kbd`. Add a public method with `B.name = …`. No work at load time beyond defining things.
3. Add it to `src/modules.json`, in the order its CSS should come in the cascade (later wins a tie): `classes` (every class its CSS
   styles), `attrs`, `tags`, `text` (regular expressions on the body, for an API call), `requires` (other modules), `icons` (names its
   script draws), and `budget` (bytes of minified CSS plus script).
4. Say it in `SKILL.md` (the cheat sheet and the module list there), keeping `SKILL.md` within its byte budget. The test checks that
   every class in the cheat sheet belongs to the core or to one module, and that using it brings the module.
   A source stylesheet can write `%icon:X%` inside a `url("…")` for a mask: the build puts the Phosphor Bold glyph there as a data URI.
5. `npm run build`, then `npm run test:html-skill`. Rendered output must match React: add the component to `test/parity.test.mjs`.

## Parity with React

`test/parity.test.mjs` renders each component in Chromium next to its React counterpart in both themes and compares computed styles
(height, padding, radius; font size, weight, line height; text, fill and border colours; the focus outline). Every difference that
exists today is in `test/parity-differences.mjs` with its reason and source. The list only shrinks: a new difference fails the test,
and so does an entry that no longer differs. `PARITY_REPORT=1 npm run test:html-skill` prints what the run found. Loops (the spinners) are read at their first frame. A native `input[type=range]`
can't be read this way (Chromium doesn't resolve its `::-webkit-` parts in computed style), so `parity-1.test.mjs` measures the range's track,
thumb and fill by pixel instead, and pins the rest of the first parity PR's behaviour (number field, braille, ring, accent reader, forced colours).

## The pixel baseline

`test/pixel.test.mjs` compares the pages compose.mjs builds with the pages recorded in `test/fixtures/baseline-*.html` (the two examples
and `kitchen-sink.body.html`, one of every component), pixel for pixel, in both themes at 1440 and 390 wide. The fixtures began as PR #26's
two templates, byte for byte. A PR that changes a pixel on purpose re-records them in the same commit: `npm run build`, then
`node tools/html-skill/test/record-baseline.mjs`. The diff of the fixtures then shows what moved, and the PR shows a before and after of every
region that differs. It does not delete or loosen the test. (Fonts stay out of the fixtures: each has a `<!-- basalt:fonts -->` placeholder.)

## Budgets

In `src/modules.json`: `skillMd` (the context an agent pays, never above what it was), `core`, `everything` (core, every module and
every icon), and a `budget` per module. They are tested. Raising one needs the owner's approval, as the old 80 KiB cap did.
