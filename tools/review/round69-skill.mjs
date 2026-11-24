// Round 69's HTML-skill pages (DECISIONS 336): every part the decision touches, composed by the skill this tree carries (on main, main's own skill).
// A page sets its own theme from the review page's; the review page reads its height from the frame itself (same origin), so nothing is posted. Synthetic content only.
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const READY = (_key, open = "") => `<script>
addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", "__THEME__");
  ${open}
});
</script>`;

const LINKS = `<ul class="links" data-icon-only aria-label="Elsewhere"><li><a class="btn" data-variant="ghost" data-icon-only href="#g" aria-label="GitHub"><i data-icon="GithubLogo"></i></a></li><li><a class="btn" data-variant="ghost" data-icon-only href="#x" aria-label="X"><i data-icon="XLogo"></i></a></li><li><a class="btn" data-variant="ghost" data-icon-only href="#l" aria-label="LinkedIn"><i data-icon="LinkedinLogo"></i></a></li></ul>`;

const HEADS = `<main class="page"><section class="section"><div class="section-head" style="display: flex; align-items: center; gap: 8px"><h2 style="margin: 0; flex: 1">A page's section head</h2><button class="btn" data-variant="ghost" data-size="sm">See all</button></div>
<div class="stack" style="--gap: var(--basalt-space-6)">
<div class="panel"><div class="panel-head"><span>A panel head</span><span class="spacer"></span><button class="btn" data-variant="ghost" data-size="sm">Edit</button></div><div class="panel-pad">The head's last ghost button hangs into its padding by itself.</div></div>
<div class="code"><div class="code-head"><span>alerts.json</span><span class="spacer"></span><button class="btn" data-variant="ghost" data-size="sm" data-edge="end" data-copy="#c1"><span data-glyph="copy"></span><span>Copy</span></button></div><pre class="code-body" tabindex="0"><code id="c1">{ "alerts": 3 }</code></pre></div>
<figure class="code terminal" data-replay><figcaption>Deploy preview</figcaption><pre class="code-body" tabindex="0"><code>
<span data-kind="command">npm run build</span>
<span data-kind="done">Built in 4.2 s</span></code></pre></figure>
<div style="width: 360px"><figure class="code terminal"><figcaption>A narrow terminal</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="command">npm ci</span></code></pre></figure></div>
<div class="card" style="width: 280px"><p style="margin: 0 0 12px; font-weight: 600">Ada Byron</p><p class="small" style="margin: 0 0 12px">Writes about engines.</p>${LINKS}</div>
<div><p class="small">A row with nothing round it.</p>${LINKS}</div>
<div class="panel table-wrap" role="region" aria-label="Runs" tabindex="0" style="max-width: 420px"><table data-fixed><colgroup><col style="width: 32px"><col style="width: 140px"><col></colgroup>
<thead><tr><th class="select-col"><input type="checkbox" data-select-all aria-label="Select all runs"></th><th data-sortable>Run</th><th>Status</th></tr></thead>
<tbody><tr><td class="select-col"><input type="checkbox" aria-label="Select run-0142"></td><td>run-0142</td><td>Ready</td></tr><tr><td class="select-col"><input type="checkbox" checked aria-label="Select run-0141"></td><td>run-0141</td><td>Building</td></tr></tbody></table></div>
<fieldset class="option-chips"><legend class="option-chips-legend">Size</legend><div class="option-chips-list">
<label class="option-chip"><input class="option-chip-input" type="radio" name="size" value="s"><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Small</span></label>
<label class="option-chip"><input class="option-chip-input" type="radio" name="size" value="m" checked><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Medium</span></label></div></fieldset>
<div class="filter" data-label="Status"><label><input type="checkbox" checked> Ready</label><label><input type="checkbox"> Building</label><label><input type="checkbox"> Error</label></div>
</div></section></main>`;

const SHEET = `<button class="btn" data-dialog-open="#s">Open</button>
<dialog class="panel float modal sheet" id="s" data-side="right"><header class="sheet-head"><div class="sheet-head-text"><h2 class="dialog-title" tabindex="-1">Your cart</h2><p class="dialog-description">2 items</p></div><button class="btn sheet-close" data-variant="ghost" data-icon-only data-edge="end" aria-label="Close cart" data-dialog-close><span data-glyph="close"></span></button></header><div class="sheet-body" tabindex="0"><p>Two lines in the cart.</p></div><footer class="sheet-foot"><button class="btn" data-variant="primary">Check out</button></footer></dialog>`;

const SEARCH = (n) => `<button class="btn" data-dialog-open="#q">Search</button>
<dialog class="panel float modal dialog search" id="q" aria-label="Search the shop"><form class="search-form" role="search"><label class="search-field"><span data-glyph="search"></span><span class="visually-hidden">Search products</span><input class="search-input" type="search" value="${n ? "whey" : "zzz"}"></label><button type="button" class="btn search-close" data-variant="ghost" data-icon-only data-edge="end" aria-label="Close search" data-dialog-close><span data-glyph="close"></span></button></form>
<p class="search-count">${n ? `${n} products` : "Nothing found for “zzz”"}</p><ul class="search-results" style="--_logos: 0">${Array.from({ length: n }, (_, i) => `<li><a class="search-result" href="#r${i}"><span class="search-media"><span style="display: block; width: 48px; height: 60px; background: var(--basalt-surface-2)"></span></span><span class="search-name"><span class="search-title">Result ${i + 1}</span><span class="search-detail">Brand · ${i + 1} lb</span></span></a></li>`).join("")}</ul></dialog>`;

const CHECKLIST = `<div class="filter" data-label="Region" data-toolbar>${["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"].map((l, i) => `<label><input type="checkbox"${i % 3 === 1 ? " checked" : ""}> ${l}</label>`).join("")}</div>`;

const TOPBAR = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Orbit home"><span style="font-weight: 600">Orbit</span></a><nav class="topbar-links" aria-label="Primary"><a href="#a" aria-current="page">Product</a><a href="#b">Pricing</a></nav><span class="spacer"></span><a class="btn topbar-action" data-variant="primary" data-size="sm" href="#start">Start</a></div></header>
<main class="page"><p>The page.</p></main>`;

const NOTIFICATIONS = `<div style="display: flex; justify-content: flex-end; padding: 16px"><div id="bell"></div></div>
<script>addEventListener("load", function () { Basalt.notifications(document.getElementById("bell"), { entries: [{ id: "1", title: "Deploy finished", description: "api, production", time: "2m ago", status: "success" }, { id: "2", title: "Waiting on you: approve the release", time: "1h ago", status: "warning", unread: true }], onClearAll: function () {}, onMarkAllRead: function () {}, onViewAll: function () {} }); });</script>`;

const TOAST = `<main class="page"><p>Two toasts.</p></main>
<script>addEventListener("load", function () { Basalt.toast({ title: "Saved", timeout: 0 }); Basalt.toast({ title: "Draft moved", description: "It is in Archive now.", action: { label: "Go", onClick: function () {} }, timeout: 0 }); });</script>`;

export function skillPages69() {
  const page = (key, body, open = "") => [key, compose(`<title>Round 69 ${key}</title>${body}${READY(key, open)}`, { fonts: true }).html];
  return Object.fromEntries([
    page("69-heads", HEADS),
    page("69-sheet", SHEET, `document.getElementById("s").showModal();`),
    page("69-search-none", SEARCH(0), `document.getElementById("q").showModal();`),
    page("69-search-two", SEARCH(2), `document.getElementById("q").showModal();`),
    page("69-checklist", `<div style="padding: 16px; min-height: 560px">${CHECKLIST}</div>`, `setTimeout(function () { var t = document.querySelector(".filter-trigger"); if (t) t.click(); }, 200);`),
    page("69-topbar", TOPBAR, `setTimeout(function () { var t = document.querySelector(".topbar-menu-trigger"); if (t && getComputedStyle(t).display !== "none") t.click(); }, 200);`),
    page("69-notifications", NOTIFICATIONS, `setTimeout(function () { var b = document.querySelector("#bell .btn"); if (b) b.click(); }, 300);`),
    page("69-toast", TOAST),
  ]);
}
