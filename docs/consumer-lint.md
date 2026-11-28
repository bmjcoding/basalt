# The consumer lint

`basalt-lint` is an opt-in check for an app built on Basalt (DECISIONS 404). It runs in the app's own lint and reports three things:

- a Basalt component restyled by the app;
- a raw colour, length or time where a `--basalt-*` token belongs;
- as advice, another library's part or a native element where Basalt has a proven one.

Every message names the Basalt component, prop or token that fixes it. The check ships in `@srasyndicate/basalt` (`bin/basalt-lint.mjs` and `lint/`).
It is outside the React runtime and the HTML skill's output, so an app that never runs it pays nothing.

## Run it

The check uses two tools that Basalt does not install for the app. Add them as dev dependencies:

```sh
npm install --save-dev oxc-parser stylelint
```

`oxc-parser` reads the source and is always needed. `stylelint` reads stylesheets. An app that checks no CSS can skip it and pass `--no-css`. Neither is a
runtime dependency of Basalt. The check finds each one from the app's directory first, then from beside the Basalt package.

```sh
npx basalt-lint client                  # a directory: every .js, .jsx, .ts, .tsx, .mjs and .css file in it
npx basalt-lint "client/**/*.tsx" client/app.css
npx basalt-lint client --format json    # one object per finding: file, rule, severity, line, column, message
```

In the app's `package.json`: `"lint": "basalt-lint client && ..."`. With no paths it reads the current directory. `node_modules`, `dist`, `build`,
`coverage` and `.d.ts` files are always left out.

| Option | |
|---|---|
| `--config <file>` | A JSON config. The default is `basalt-lint.config.json` in the current directory, when there is one. |
| `--format text\|json` | How findings print. The default is `text`. |
| `--no-css` | Skip stylesheets, so Stylelint is not needed. |
| `--quiet` | Print errors only. |
| `--max-warnings <n>` | Fail when there is more advice than `n`. By default advice never fails. |

The exit code is 1 when there is an error, 2 for a bad option, a missing tool or a file that does not parse, and 0 otherwise. A file it cannot parse
fails the run: the check never passes a file it could not read.

### Config

```json
{
  "include": ["client"],
  "exclude": ["client/**/*.test.tsx"],
  "sources": ["./ui/basalt.ts"],
  "hooks": ["--basalt-banner-height"],
  "rules": { "basalt/primitive": "off", "basalt/class-on-component": "error" },
  "css": true
}
```

- `include` and `exclude`: paths, directories or globs. Paths on the command line replace `include`.
- `sources`: more module specifiers whose imports are Basalt components, such as an app's own barrel that re-exports Basalt. `@srasyndicate/basalt` is
  always one.
- `hooks`: more `--basalt-*` custom properties the app may set (see `basalt/no-restyle`).
- `rules`: `"error"`, `"warn"` or `"off"` for each rule.

## Rules

### `basalt/no-restyle` (error)

An app restyling a Basalt component. The check knows a component by its import binding: `import { Button }`, an alias (`import { Card as Panel }`, reported as
`Card`) and a namespace member (`import * as UI`, then `<UI.Badge>`). It reports:

- **A `style` key that sets appearance on a Basalt component.** `<Button style={{ padding: 12 }}>` gives: "use `Button`'s `size` prop ("xs" | … |
  "5xl"); for space between controls, set the parent's `gap`". The prop and its values come from the installed declarations.
- **A `className` on a Basalt component when the checked CSS shows that the class sets appearance.** The message gives the class, the property, and the
  file and line of the rule.
- **A stylesheet rule whose subject is one of Basalt's classes and that sets appearance.** `.jump .basalt-button { background: … }` lands on
  `.basalt-button`. `.card:has(.basalt-button) { … }` lands on `.card` and passes.
- **A `--basalt-*` token set by the app**, in a stylesheet (`:root { --basalt-space-4: 18px }`) or in any `style`. A token is design, decided by Basalt's
  panel.

What stays allowed:

- Layout that places the component in its parent: `margin` (and its sides), `position`, `inset` and its sides, `z-index`, grid and flex placement (`grid-area`,
  `flex`, `order`, `align-self` and the rest), `width` and its limits, `visibility`, `pointer-events`, `cursor`, `contain`, `container` and the scroll margins.
- `display: none`. Any other `display` changes how the component lays out its own parts, so it is appearance.
- Height and its limits are layout, except on a component that takes `size` (or a field's `controlSize`). There the size prop sets the height.
- Anything on a wrapper or on the app's own elements.
- The app's own custom properties (`--app-slot`).
- The documented hooks. These are `--basalt-stage-room`, `--basalt-shell-width` and `--basalt-sticky-offset`, plus every `--basalt-*` property Basalt's
  stylesheet reads with a fallback and that is not a token, read from the installed release. A head's `--basalt-edge-room` is one of them.

### `basalt/raw-value` (error)

A raw design value outside a stylesheet. This is the same policy as Basalt's own Stylelint config: hex colours, named colours and colour functions are raw,
and so are `px`, `rem`, `em`, `ch` and the other font-relative units, the viewport units, the absolute units, `s` and `ms`. It reports:

- **A statically known `style` value**, on any element. React's numbers count: `padding: 16` is 16px, because React writes it that way. A unitless
  property's number (`opacity`, `zIndex`, `flexGrow`, `lineHeight`, `fontWeight` and React's other unitless properties) is not a length.
- **A raw colour in an SVG presentation attribute**: `fill`, `stroke`, `color`, `stop-color`, `flood-color` and `lighting-color`. An attribute cannot
  read a custom property. The fix is `fill="currentColor"`, with the colour set from a token in CSS or `style`.
- **A raw literal in a custom property** (`"--app-ink": "rgb(0 0 0)"`).

The message suggests a token by role, from the installed token release. A gap, padding or margin gets a space step. A radius gets a radius, a font size a
type step, a duration a duration, a media query a breakpoint, and a colour the role tokens for its property: ink for `color`, a surface for `background`,
a border for `border`. An exact match is named. Otherwise the two nearest are named, and a value between them is a design decision. Measured geometry
passes: a value computed at run time (`blockSize: height`, or `` `${place}%` ``) is not a design literal.

In a stylesheet the same values are Stylelint's rules (`color-no-hex`, `color-named`, `function-disallowed-list`, `unit-disallowed-list`,
`declaration-property-unit-disallowed-list` and `basalt/container-length`). They are reported under those names, with the token added to the message.

### `basalt/class-on-component` (advice)

A `className` on a Basalt component that the check cannot classify. Either it is computed, or no rule in the checked CSS puts a declaration on it. Basalt's
own classes (`basalt-*`) and a class the CSS names only as context (`.steps > li`) pass. Check the CSS that defines it in the same run, and the advice
becomes either nothing (layout only) or a `basalt/no-restyle` error.

### `basalt/primitive` (advice)

Where Basalt has a proven part:

- **Another library's import**: Radix, Base UI used directly, Headless UI, React Aria, Ariakit, Ark UI, MUI, Chakra, Mantine, Ant Design, React
  Bootstrap, Fluent, HeroUI, react-modal, react-select, a tooltip or toast library, cmdk and a syntax highlighter. The message names the Basalt part by
  the library part's name (`@radix-ui/react-dialog` gives `Dialog`).
- **Icons**: another icon library, and a Phosphor icon the core set draws (`CheckIcon` gives `CheckGlyph`, `CaretDownIcon` gives `ChevronDownGlyph`).
- **A native element** with a Basalt part of the same contract: `<button>`, `<input>` (checkbox, radio, range, number, search, file and the text types),
  `<select>`, `<textarea>`, `<dialog>`, `<progress>`, `<meter>`, `<hr>`, `<kbd>`, `<table>` and `<details>`.

It is never a blanket native ban. It leaves alone an element in a `render` prop (`render={<button type="submit" />}`), an element with a `role` or a
spread (a wrapper), a button in a list or table row, or one with several parts (a row or card target), and a hidden input (`hidden`, `aria-hidden`,
`type="hidden"`, or a visually-hidden class). It names only parts the installed release exports.

### `basalt/disable` (error)

A malformed exception: one with no reason, one that names a rule that does not exist, or one that excuses nothing.

## Exceptions

An exception is a comment on the line before, naming the rule, with a reason after ` -- `. The form is the one Basalt's vocabulary lint uses:

```tsx
// basalt-lint-disable-next-line basalt/primitive, basalt/raw-value -- the browser's own picker, drawn at the platform's size
const picker = <select style={{ minHeight: 44 }}>…</select>;

return (
  <div className="jump">
    {/* basalt-lint-disable-next-line basalt/no-restyle -- the owner's recorded exception (DECISIONS 213): Jump to latest is smoked like the header */}
    <Button className="jump-button">Jump to latest</Button>
  </div>
);
```

One comment can name several rules, separated by commas.

```css
/* basalt-lint-disable-next-line basalt/no-restyle -- the owner's recorded exception (DECISIONS 213) */
.jump .basalt-button { background: var(--basalt-surface-chrome); }
/* basalt-lint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
.clip { clip: rect(0 0 1px 1px); }
```

Inside `basalt-lint`, a stylesheet's exceptions use the `basalt-lint-` prefix too, so one form covers source and CSS. An app that runs the shareable config in
its own Stylelint (below) writes Stylelint's own `stylelint-disable-next-line`, with the same reason rule.

## The shareable Stylelint config

An app that already runs Stylelint can take the stylesheet half on its own:

```js
// stylelint.config.mjs
export default { extends: ["@srasyndicate/basalt/stylelint-config"] };
```

It is the policy Basalt's own CSS follows (`packages/react/lint/stylelint-policy.mjs`, which the repository's `stylelint.config.mjs` is built from) plus
`basalt/no-restyle`. Without `oxc-parser` installed, its messages name the class and not the component.

## From code

```js
import { basaltLint } from "@srasyndicate/basalt/lint";

const { files, findings } = await basaltLint({ cwd: "client", include: ["."] });
```

The options are the config's keys plus `cwd`.

## What it cannot decide statically

- **A wrapper in another file.** An app's `PrimaryButton` that forwards `className` or `style` to `Button`: the check reports what is written at the
  `Button` inside it, never what callers pass through it.
- **A spread or a computed object.** In `style={{ ...base, padding: 4 }}` the `padding` is read and `...base` is not. `style={styles}` is read when `styles`
  is a `const` object declared once in the same file.
- **The cascade.** A class is classified by the rules that land on it in the checked CSS. The check does not know which rule wins at run time, or what a
  class added by a script sets.
- **A computed `className`.** It is advice, never an error.
- **Whether a native element is equivalent.** That is why `basalt/primitive` is advice, and why it skips rows, render targets and hidden inputs.
- **Re-exports.** A component reached through the app's own module is a Basalt component only when that module is listed in `sources`.
