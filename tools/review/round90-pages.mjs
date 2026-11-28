// Round 90's framed pages (micro-details m7, DECISIONS 405 and 409): documents a frame loads at review-build time, so the browser itself does what the round
// shows. The list's pages are ListBand rendered on the server from the built package with its stylesheet and no script of Basalt's: page 1 with the foot's
// Next focused, and the next document landed on its fragment (the band arrow's id), as a followed link opens it. The skill's page is composed from a synthetic
// body: a link into a hidden tab panel, pressed by a real click. Each page takes its theme from the review page (__THEME__) and acts on load. Synthetic data
// only (a seed library's lots, a tide gauge's readings). Each page carries <base href="about:srcdoc">, for the review frame alone: in a srcdoc frame a
// "#fragment" link would otherwise resolve against the review page's own URL and load another document, where on a served page it is same-document.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as React from "react";
import { renderToString } from "react-dom/server";

import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, "..", "..", "packages", "react");

// The bar, the list's heading and the rows, around the server-rendered band: no client router and no script of Basalt's in the frame.
async function listPage({ id, noun, label, page, pages, act }) {
  const B = await import(pathToFileURL(path.join(pkg, "dist", "index.js")));
  const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
  // Geist, as the skill inlines it, so the frame draws the type the review page does.
  const faces = (compose("<title>faces</title><p>Faces.</p>", { fonts: true }).html.match(/@font-face\s*\{[^}]*\}/g) ?? []).join("\n");
  const size = 25;
  const rows = Array.from({ length: size }, (_, i) => React.createElement("li", { key: i, className: "r90-row" }, `${label} ${(page - 1) * size + i + 1}`));
  const band = React.createElement(B.ListBand, { id, total: pages * size, page, pageSize: size, pageSizes: [10, 25, 50, 100], noun, hrefForPage: (p) => `?page=${p}`, footLabel: `${noun} pages, end of list` },
    React.createElement("ul", { className: "r90-rows" }, rows));
  const style = `body { margin: 0; font-family: var(--basalt-font-family-sans); background: var(--basalt-surface-page); color: var(--basalt-text-primary); font: var(--basalt-text-md-size) / var(--basalt-text-md-line-height) var(--basalt-font-family-sans); }
.r90-bar { position: sticky; top: 0; z-index: 3; height: var(--basalt-size-header); display: flex; align-items: center; padding-inline: var(--basalt-space-4); background: var(--basalt-surface-page); box-shadow: 0 var(--basalt-size-hairline) 0 var(--basalt-border-divider); font-weight: var(--basalt-font-weight-semibold); }
.r90-page { padding-inline: var(--basalt-space-4); }
.r90-page h1 { font-size: var(--basalt-text-2xl-size); line-height: var(--basalt-text-2xl-line-height); margin: var(--basalt-space-6) 0 var(--basalt-space-4); }
.r90-lead { color: var(--basalt-text-secondary); margin: 0 0 var(--basalt-space-8); }
.r90-rows { list-style: none; margin: 0; padding: 0; }
.r90-row { min-height: var(--basalt-space-10); display: flex; align-items: center; border-bottom: var(--basalt-size-hairline) solid var(--basalt-border-divider); }`;
  const script = act === "foot"
    ? `var f = document.querySelector(".basalt-list-band-foot [aria-label='Next page']"); f.scrollIntoView({ block: "center" }); f.focus({ preventScroll: true });`
    : `var id = ${JSON.stringify(`${id}-pager-next`)}; location.hash = id; requestAnimationFrame(function () { var t = document.getElementById(id); if (document.activeElement !== t) { t.scrollIntoView(); t.focus({ preventScroll: true }); document.documentElement.setAttribute("data-r90-fallback", ""); } });`;
  return `<!doctype html><html data-theme="__THEME__"><head><base href="about:srcdoc"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${faces}</style><style>${css}</style><style>${style}</style></head><body>`
    + `<header class="r90-bar basalt-sticky-bar">${noun}</header><main class="r90-page"><h1>${noun}</h1><p class="r90-lead">Page ${page} of ${pages}, ${act === "foot" ? "the foot's Next focused, before the press" : "opened from the foot's Next"}.</p>`
    + `${renderToString(band)}<div style="height: var(--basalt-space-16)"></div></main>`
    + `<script>addEventListener("load", function () { ${script} });</script></body></html>`;
}

const filler = (word, n) => Array.from({ length: n }, (_, i) => `<p>${word} ${i + 1}: the reading held steady through the hour.</p>`).join("");
const TABS = `<main class="page" style="padding-block: 16px">
  <h1>Harbour gauge</h1>
  <p>Jump to <a id="to-notes" href="#surge-notes">the surge notes</a>, in This year.</p>
  <div data-tabs>
    <div class="tabs-scroll"><div class="tabs" role="tablist" aria-label="Readings">
      <button class="tab" role="tab" id="t-today" aria-controls="p-today" aria-selected="true">Today</button>
      <button class="tab" role="tab" id="t-week" aria-controls="p-week" aria-selected="false">This week</button>
      <button class="tab" role="tab" id="t-year" aria-controls="p-year" aria-selected="false">This year</button>
    </div></div>
    <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id="p-today" role="tabpanel" aria-labelledby="t-today">${filler("Reading", 12)}</div>
    <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id="p-week" role="tabpanel" aria-labelledby="t-week" hidden>${filler("Day", 7)}</div>
    <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id="p-year" role="tabpanel" aria-labelledby="t-year" hidden>${filler("Month", 12)}<h2 id="surge-notes">Surge notes</h2><p>Two surges in March, one in October; the north breakwater read low after each.</p></div>
  </div>
  <h2>Seed library</h2>
  <div data-tabs>
    <div class="tabs-scroll"><div class="tabs" role="tablist" aria-label="Seeds">
      <button class="tab" role="tab" id="t-beans" aria-controls="p-beans" aria-selected="true">Beans</button>
      <button class="tab" role="tab" id="t-squash" aria-controls="p-squash" aria-selected="false">Squash</button>
    </div></div>
    <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id="p-beans" role="tabpanel" aria-labelledby="t-beans"><p>Runner, borlotti, and a climbing French bean.</p></div>
    <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id="p-squash" role="tabpanel" aria-labelledby="t-squash" hidden><p>Butternut and crown prince.</p></div>
  </div>
  ${filler("Note", 24)}
</main>
<script>addEventListener("load", function () { document.documentElement.setAttribute("data-theme", "__THEME__"); if ("__PRESS__" === "yes") document.getElementById("to-notes").click(); });</script>`;

export async function skillPages90() {
  return {
    "90-seeds-foot": await listPage({ id: "lots", noun: "Seed lots", label: "Lot", page: 1, pages: 9, act: "foot" }),
    "90-seeds-landed": await listPage({ id: "lots", noun: "Seed lots", label: "Lot", page: 2, pages: 9, act: "landed" }),
    "90-tides-last": await listPage({ id: "readings", noun: "Tide readings", label: "Reading", page: 3, pages: 3, act: "landed" }),
    "90-tabs": compose(`<title>Round 90 tabs</title>${TABS}`, { fonts: true }).html.replace("<head>", '<head><base href="about:srcdoc">'),
  };
}
