// `%glyph-mask:name%` in a stylesheet is a data URI of that core glyph, drawn with the set's 2.25 round stroke on the 24 grid, for a CSS mask (a diagram's
// link cue, DECISIONS 306, 1.4): the same drawing as the HTML skill's (tools/html-skill/build.mjs), from the same source, never redrawn by hand. The package's
// build and the review walkthrough (which reads the source stylesheet) both write it in.
import { GLYPHS, slots } from "./glyphs/source.mjs";

export function glyphMaskUri(name) {
  const glyph = GLYPHS[name];
  if (!glyph || !(glyph.s || glyph.of)) throw new Error(`glyph-mask: "${name}" is not a core glyph with a drawing`);
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const d = (glyph.s ?? slots(name)).filter((slot) => slot[8]).map(([x0, y0, x1, y1, x2, y2, x3, y3]) => {
    const straight = near(x1, x0 + (x3 - x0) / 3) && near(y1, y0 + (y3 - y0) / 3) && near(x2, x0 + (2 * (x3 - x0)) / 3) && near(y2, y0 + (2 * (y3 - y0)) / 3);
    return straight ? `M${x0} ${y0}L${x3} ${y3}` : `M${x0} ${y0}C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
  }).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${d}' fill='none' stroke='black' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  return `data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E")}`;
}

/** The stylesheet with every `%glyph-mask:name%` written in. */
export const withGlyphMasks = (css) => css.replace(/%glyph-mask:([\w-]+)%/g, (_, name) => glyphMaskUri(name));
