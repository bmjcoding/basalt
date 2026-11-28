// Round 85's HTML-skill pages (micro-details m6, DECISIONS 420): selected text in the skill's core, after and before, and the head compose writes (the
// theme-color pair right after the colour scheme, and the head snippet's live tag), which a screenshot cannot show. "85-before" is the same page with the core's
// old rule put back over the new one (the selected wash, no ink). A page sets its own theme from the review page's and selects its specimen when asked.
// Synthetic content only (a harbour's tide notes, a library's loans).
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const BODY = `<main style="padding: 16px; display: grid; gap: 16px; max-width: 560px" id="specimen">
<p style="margin: 0">High water at the harbour is <strong>06:42</strong>, <span class="muted">a spring tide after the new moon</span>, read from <code>tides --port harbour</code>.</p>
<div style="display: flex; gap: 8px"><button class="btn" data-variant="primary">Publish the notes</button><button class="btn" data-variant="primary" disabled>Publish the notes</button></div>
<div class="panel table-wrap" role="region" aria-label="Loans" tabindex="0"><table><thead><tr><th scope="col">Loan</th><th scope="col">Due</th></tr></thead>
<tbody><tr><th scope="row">Atlas of tides</th><td>12 Dec</td></tr><tr aria-selected="true"><th scope="row">Field guide to mosses</th><td>15 Dec</td></tr></tbody></table></div>
</main>`;

const READY = (before) => `${before ? "<style>::selection { background: var(--basalt-state-selected); color: revert; }</style>" : ""}<script>
addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", "__THEME__");
  if ("__SELECT__" === "yes") { var r = document.createRange(); r.selectNodeContents(document.getElementById("specimen")); getSelection().removeAllRanges(); getSelection().addRange(r); }
});
</script>`;

/** The composed head, from <head> to the head snippet: the lines H2 adds are the two theme-color tags and the snippet's live tag. */
function head() {
  const html = compose("<title>Harbour notes</title><p>Tides.</p>", { fonts: false }).html;
  const lines = html.split("\n");
  const from = lines.indexOf("<head>");
  const to = lines.findIndex((line) => line.startsWith("<script>(function(){var t,c"));
  // The snippet is one long line: break it at its statements so the live tag's part can be read.
  return lines.slice(from, to + 1).map((line) => (line.startsWith("<script>") ? line.replace(/;(?=[a-z])/g, ";\n  ").replace(/\}(?=try)/, "}\n  ") : line)).join("\n");
}

export function skillPages85() {
  return {
    "85-after": compose(`<title>Round 85 selection</title>${BODY}${READY(false)}`, { fonts: true }).html,
    "85-before": compose(`<title>Round 85 selection, before</title>${BODY}${READY(true)}`, { fonts: true }).html,
    "85-head": head(),
  };
}
