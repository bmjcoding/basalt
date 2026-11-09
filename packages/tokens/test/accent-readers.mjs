// Finds every CSS declaration that reads the accent variable, directly or through a custom property that aliases it (and an alias of
// an alias). Shared by the tokens tests, which check the source sheets, and the React tests, which check the built styles.css once the
// React build has run. Not a test file itself: it declares no tests.

export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

export const ACCENT_VAR = "--basalt-accent-ink";
export const ALLOWED = [{ selector: '.basalt-badge[data-status="accent"] .basalt-badge-dot', property: "background" }];

/** Every `selector { property: value }` in `css`, innermost rules only (at-rules are looked through). */
export const declarations = (css) =>
  [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selector, body]) =>
    body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const at = d.indexOf(":");
      return { selector: selector.trim().replace(/\s+/g, " "), property: d.slice(0, at).trim(), value: d.slice(at + 1).trim() };
    }),
  );

/** The declarations in `sheets` that read the accent variable or an alias of it. */
export function readers(...sheets) {
  const all = sheets.flatMap(declarations);
  const carriers = new Set([ACCENT_VAR]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const d of all) {
      if (d.property.startsWith("--") && !carriers.has(d.property) && [...carriers].some((c) => d.value.includes(`var(${c}`))) {
        carriers.add(d.property);
        grew = true;
      }
    }
  }
  return all.filter((d) => [...carriers].some((c) => d.value.includes(`var(${c}`)));
}
