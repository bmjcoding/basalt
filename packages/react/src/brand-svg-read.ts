// Reading a brand file's text, with no React: the plain half of `brand-svg.tsx` (the wording audit's W1), in a module of its own so a React Server Component can
// call `lockupDrawing` (DECISIONS 133's A5-18: plain values live in modules with no client directive). Nothing here runs when the module loads.

/** What a brand SVG is, read: the root's `viewBox` and size, and the markup inside the root with every `title` taken out. */
export interface BrandDrawing {
  viewBox: string;
  width: number;
  height: number;
  /** The drawing's own elements (paths, groups), as written in the file, without a `title`. */
  inner: string;
}

// A tag's attributes may hold `>` inside quotes, so the root tag is read quote by quote.
const ROOT = /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*)<\/svg>\s*$/i;
const TITLE = /<title\b[^>]*>[\s\S]*?<\/title\s*>|<title\b[^>]*\/>/gi;

const attribute = (attributes: string, name: string): string | undefined => {
  const found = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(attributes);
  return found ? (found[1] ?? found[2]) : undefined;
};

/**
 * Reads a brand SVG's text: its `viewBox`, its size and its drawing with the `title` removed. Throws when the text is not one SVG with a `viewBox`, so a wrong file is found when it is
 * first drawn and never drawn wrongly.
 */
export function readBrandSvg(source: string): BrandDrawing {
  const match = ROOT.exec(source);
  if (!match) throw new Error("a brand drawing is the text of one SVG file: <svg viewBox=…>…</svg>");
  const viewBox = attribute(match[1]!, "viewBox");
  if (!viewBox) throw new Error("a brand drawing needs a viewBox");
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  const width = Number(attribute(match[1]!, "width")) || parts[2] || 0;
  const height = Number(attribute(match[1]!, "height")) || parts[3] || 0;
  return { viewBox, width, height, inner: match[2]!.replace(TITLE, "") };
}

/**
 * A lockup's drawing, read from the text of a brand file (`lockup-header-1x.svg`): its `viewBox` and its one path, for `SiteHeader`'s and `SiteBrand`'s `lockup={{ x1, x2 }}`. The file's
 * `title` is not read, so the page never carries it. Throws for a file of several paths (a lockup is one outlined path): pass `{ viewBox, d }` for a drawing of several.
 */
export function lockupDrawing(source: string): { viewBox: string; d: string } {
  const { viewBox, inner } = readBrandSvg(source);
  const paths = [...inner.matchAll(/<path\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi)];
  const d = paths.length === 1 ? /(?:^|\s)d\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(paths[0]![1]!) : null;
  if (!d) throw new Error("a lockup file is one path: pass `{ viewBox, d }` for a drawing of several");
  return { viewBox, d: d[1] ?? d[2] ?? "" };
}
