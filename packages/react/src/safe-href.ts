/**
 * A link from data, or null: the same string back when it is relative, `http`, `https`, `mailto` or `tel`, read the way a browser reads it, and `null` for
 * anything else (`javascript:`, `data:`, `vbscript:`, a non-string, an empty string). It parses against a fixed base, so the answer is the same on every page and
 * a file page's own relative links pass. It says the scheme is safe, not that the link stays on your site: `//other.example/x` passes, so a route that must stay
 * on your origin checks that too. React refuses a script URL in an `href`, but not in a navigation you make yourself (`router.push`, `location.assign`): check
 * there. The HTML skill's `Basalt.safeHref` is the same contract, tested against the same table.
 */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string" || !href.trim()) return null;
  try {
    return /^(https?|mailto|tel):$/.test(new URL(href, "https://basalt.invalid/").protocol) ? href : null;
  } catch {
    return null;
  }
}
