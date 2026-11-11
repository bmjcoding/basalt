# The Basalt HTML skill: sources

`.agent/skills/basalt-html/` is what an agent uses to write a standalone page. It is **built** from this folder; never edit the
files there by hand (a test fails if they drift from the build). The agent reads only `SKILL.md`, writes a body fragment, and runs
`compose.mjs`, which assembles the page. The skill stays cheap to read because the stylesheet and script are never in front of the
agent, and because `SKILL.md` holds only the rules every page needs and one line per module: a module's full usage is printed on
demand by `compose.mjs --usage core NAME …` (each module, then the modules it requires, then the classes, attributes and tags that
bring each in, read from the manifest; a module whose script builds a required module's markup, like the palette's rows, lists it in
`builds` and prints one line in place of that usage). `--usage` alone prints the index; an unknown name fails with it. After a page is composed,
compose prints the one-line warning of each module it added, which is that module's line in `SKILL.md`.

```
src/
  core.css, core.js        what every page gets (tokens come before core.css, from packages/tokens)
  modules/<name>.css|js    what a page gets only when its markup uses it (the accent module has no file here: build.mjs makes it from
                           packages/tokens/dist/css/accents.css, and a page gets it only when its markup sets data-accent)
  modules.json             the manifest: each module's classes, attributes, tags, text patterns, requirements, icons, byte budget and usage cap
  usage/<name>.md          the module's usage, in prose, printed by `compose.mjs --usage <name>` (core.md is layout, type, panels, buttons);
                           build.mjs copies them into the skill's parts/usage/
  icons.json               the Phosphor names a page can draw (Bold paths, at every size, are read from @phosphor-icons/react; the build fails for a name it hasn't got)
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
   styles), `attrs`, `tags`, `text` (regular expressions on the body, for an API call, each with its words in `textWords`, which `--usage` prints), `requires` (other modules), `icons` (names its
   script draws), and `budget` (bytes of minified CSS plus script).
4. Write `src/usage/<name>.md`: prose that starts with `# <name>`, with the markup an agent writes, the classes, attributes and tags it
   needs, and every rule that belongs to this module alone (a rule that is true of every page stays in `SKILL.md`). Give it a `usage` cap
   in `modules.json`, a little above its size; the build fails for a module with no usage file or a usage file with no module. Then add
   one line to `SKILL.md`'s "Modules" index, in the manifest's order: `- **name** \`trigger\`: the one mistake an agent would make.`
   (the trigger is the class, attribute or tag that brings the module; the part after it is the warning compose prints after a page
   that uses the module). Keep each line short and `SKILL.md` within its byte budget. The test checks that every class in the index and
   in the usage texts belongs to the core or to one module, that a usage names only its own module's classes (or the modules it
   requires, or a mention listed in the test), and that using one brings its module.
   A source stylesheet can write `%icon:X%` inside a `url("…")` for a mask: the build puts the Phosphor Bold glyph there as a data URI. A module's script can write `%glyph:name%` for the path of a core glyph (the drawn set, `packages/react/glyphs/source.mjs`): `links.js` draws the new-tab arrow from `external` this way.
5. `npm run build`, then `npm run test:html-skill`. Rendered output must match React: add the component to `test/parity.test.mjs`.

## Parity with React

`test/parity.test.mjs` renders each component in Chromium next to its React counterpart in both themes and compares computed styles
(height, padding, radius; font size, weight, line height; text, fill and border colours; the focus outline). Every difference that
exists today is in `test/parity-differences.mjs` with its reason and source. The list only shrinks: a new difference fails the test,
and so does an entry that no longer differs. `PARITY_REPORT=1 npm run test:html-skill` prints what the run found. Loops (the spinners) are read at their first frame. A native `input[type=range]`
can't be read this way (Chromium doesn't resolve its `::-webkit-` parts in computed style), so `parity-1.test.mjs` measures the range's track,
thumb and fill by pixel instead, and pins the rest of the first parity PR's behaviour (number field, braille, ring, accent reader, forced colours). `parity-2.test.mjs` pins the second's (the palette's levels and rows, the glide, a focusable row's ring, the bar's removal, the selected table row, the segment's sliding pill and its fallbacks, a tab's icon). `parity-3.test.mjs` pins the third's, part A of batch 7 (the status family in forced colours on Canvas and on a lit row, beside React's; the links module: the social row, the new-tab arrow, icon only, the long form; the site bar in print). The status family's computed styles are compared with React's in every status in `parity.test.mjs`.

## The pixel baseline

`test/pixel.test.mjs` compares the pages compose.mjs builds with the pages recorded in `test/fixtures/baseline-*.html` (the two examples
and `kitchen-sink.body.html`, one of every component), pixel for pixel, in both themes at 1440 and 390 wide. The fixtures began as PR #26's
two templates, byte for byte. A PR that changes a pixel on purpose re-records them in the same commit: `npm run build`, then
`node tools/html-skill/test/record-baseline.mjs`. The diff of the fixtures then shows what moved, and the PR shows a before and after of every
region that differs. It does not delete or loosen the test. (Fonts stay out of the fixtures: each has a `<!-- basalt:fonts -->` placeholder.)

## Budgets

In `src/modules.json`: `skillMd` (the context an agent pays, never above what it was), `core`, `everything` (core, every module and
every icon), a `budget` per module, and a `usage` cap per usage text (the context an agent pays for one module, on demand). They are tested. Raising one needs the owner's approval, as the old 80 KiB cap did.
