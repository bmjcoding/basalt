# Basalt

The SRA Syndicate design system: one monochrome foundation for Blacksand, srasyndicate.io,
baileymjones.com, N1 and what comes next. Each product adds colour through its own accent.

**Status: foundations.** The tokens are built and tested. Components come next.

## Packages

| Package | What it is |
|---|---|
| [`packages/tokens`](packages/tokens) | Colour, type, space, radius, elevation and motion, as DTCG tokens built into CSS, TypeScript and JSON |

## Use the tokens

```sh
npm install
npm run build
```

```css
@import "@srasyndicate/basalt-tokens/tokens.css";
/* optional: shadcn/ui variable names, mapped onto Basalt's */
@import "@srasyndicate/basalt-tokens/shadcn.css";

body {
  background: var(--basalt-surface-page);
  color: var(--basalt-text-primary);
  font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans);
}
```

The theme follows the operating system. To pin it, set `data-theme="dark"` or
`data-theme="light"` (or the `dark` / `light` class) on `<html>`.

## Test

```sh
npm test
```

Builds the tokens and checks every text, boundary, focus and status pair against WCAG 2.2 AA
on every surface it can appear on, that every colour is inside sRGB, and that the page is
the darkest layer in both themes.

## Decisions

[docs/foundations.md](docs/foundations.md) records every foundation and why it was chosen.
