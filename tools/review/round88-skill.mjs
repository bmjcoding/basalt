// Round 88's HTML-skill pages (micro-details m5, DECISIONS 405, 409): the busy .btn in each of its states, and a timed toast with an async Undo, after and
// before. "Before" is the same page with main's own parts put back in place of this build's (core.css, spinner.css, loops.css and toast.js, read from
// main at 79453efb, where this round branched), so it is main's drawing of the same markup, not a copy of it. A page sets its own theme from the review
// page's and, for the toast, presses Undo when asked. Synthetic content only (a newsletter's drafts, a mail archive).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = "79453efb";
const PARTS = ["core.css", "spinner.css", "loops.css", "toast.js"];
const part = (name) => fs.readFileSync(path.join(root, ".agent/skills/basalt-html/parts", name), "utf8");
const mainPart = (name) => execFileSync("git", ["show", `${BASE}:.agent/skills/basalt-html/parts/${name}`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 24 });

/** The page with main's parts in place of this build's: each part is inlined as it is, so it is replaced as a whole. */
function asMain(html) {
  let out = html;
  for (const name of PARTS) {
    const now = part(name);
    if (out.includes(now)) out = out.replace(now, () => mainPart(name));
  }
  return out;
}

// What Basalt.wait writes at each step of a wait, as static markup ("After the answer" is the ring's last 400ms) so a still shot shows it: from the press (busy, no ring), from 300ms (the ring over the
// kept label, still busy), and after the answer (free; the ring keeps its 400ms). Main had no Basalt.wait: a wait marked as foundations asks (aria-busy and
// aria-disabled) is what main drew for the first two, and a free button for the last.
const COLUMNS = [
  ["At rest", ""],
  ["Waiting, before 300ms", ' aria-busy="true" aria-disabled="true" data-busy'],
  ["The ring, from 300ms", ' aria-busy="true" aria-disabled="true" data-busy data-loading'],
  ["After the answer", " data-loading"],
];
const BUTTONS = `<main style="padding: 16px; display: grid; gap: 16px">
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px">
${COLUMNS.map(([name, attrs]) => `<div class="stack" style="--gap: var(--basalt-space-2)"><p class="small muted" style="margin: 0">${name}</p>
<div class="cluster" style="--gap: var(--basalt-space-2)"><button class="btn" type="button"${attrs}><span>Save</span></button><button class="btn" type="button" data-variant="primary"${attrs}><span>Publish</span></button></div></div>`).join("\n")}
</div>
<p class="small" style="margin: 0; display: flex; gap: 8px; align-items: center"><span class="spinner" aria-hidden="true"></span>Loading the drafts</p>
<div class="cluster" style="--gap: var(--basalt-space-2)"><button class="btn" type="button" id="try"><span>Send the newsletter</span></button><span class="small muted" id="said">Press it: the ring comes after 300ms, the answer at 1.2s.</span></div>
</main>
<script>
addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", "__THEME__");
  var b = document.getElementById("try");
  b.addEventListener("click", function () {
    if (!window.Basalt.wait) { document.getElementById("said").textContent = "Main has no Basalt.wait."; return; }
    Basalt.wait(b, function () { return new Promise(function (r) { setTimeout(r, 1200); }); });
  });
});
</script>
<!-- basalt:use wait spinner loops -->`;

const TOAST = `<main style="padding: 16px"><p class="small muted" style="margin: 0">An archive of three messages, timed (its home is the row), with an Undo that asks the server.</p></main>
<script>
addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", "__THEME__");
  Basalt.toast({ title: "Archived", description: "3 messages moved to Archive.", home: "row", timeout: 3000, action: { label: "Undo", keys: "Mod+Z", onClick: function () { return new Promise(function () {}); } } });
  if ("__PRESS__" === "yes") setTimeout(function () { document.querySelector(".toast-action").click(); }, 400);
});
</script>`;

export function skillPages88() {
  const buttons = compose(`<title>Round 88 busy buttons</title>${BUTTONS}`, { fonts: true }).html;
  const toast = compose(`<title>Round 88 toast</title>${TOAST}`, { fonts: true }).html;
  return { "88-buttons": buttons, "88-buttons-before": asMain(buttons), "88-toast": toast, "88-toast-before": asMain(toast) };
}
