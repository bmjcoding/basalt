// Round 47's HTML-skill specimens (DECISIONS 167): the skill's check, minus and search clear mark, its disclosure chevron and its tabs, before and after. "After" is the page the
// skill composes today; "before" is the same page with the rules it had on main put back by a style written after them (the Phosphor Bold data URIs are built from the same
// package the skill read before the change). A page sets its own theme from the review page's, and tells the review page when it has laid out. Synthetic content only.
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";
import { iconData } from "../html-skill/icons.mjs";

const uri = (name) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>${iconData([name])[name].map((d) => `<path d='${d}'/>`).join("")}</svg>`;
  return `data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E")}`;
};

const BEFORE = () => `<style>
input[type="checkbox"]:not([role="switch"])::before { mask: url("${uri("Check")}") center / contain no-repeat; }
input[type="checkbox"]:not([role="switch"]):indeterminate::before { mask-image: url("${uri("Minus")}"); }
.input[type="search"]::-webkit-search-cancel-button { mask: url("${uri("X")}") center / var(--basalt-size-icon-sm) no-repeat; }
.disclosure::after, details > summary::after { width: 7px; height: 7px; background: none; mask: none; border-inline-end: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-2px) rotate(45deg); }
.disclosure[aria-expanded="true"]::after, details[open] > summary::after { transform: translateY(1px) rotate(-135deg); }
.tab, .link-tab { border-radius: var(--basalt-radius-sm) var(--basalt-radius-sm) 0 0; }
</style>`;

const BODY = `<main style="padding: 16px; display: grid; gap: 20px; max-width: 420px">
  <div style="display: flex; gap: 16px; align-items: center"><input type="checkbox" checked aria-label="Ticked"><input type="checkbox" id="mixed" aria-label="Mixed"><input type="checkbox" aria-label="Empty"><span style="font-size: 13px">Ticked, mixed, empty</span></div>
  <input class="input" type="search" value="Synthetic" aria-label="Search">
  <div><button class="disclosure" data-disclosure aria-expanded="false" aria-controls="p1">Closed disclosure</button><div id="p1" hidden>Its content.</div>
  <button class="disclosure" data-disclosure aria-expanded="true" aria-controls="p2">Open disclosure</button><div id="p2">Its content.</div></div>
  <div data-tabs><div class="tabs" role="tablist" aria-label="Views"><button class="tab" role="tab" id="t1" aria-controls="q1" aria-selected="true">One</button><button class="tab" role="tab" id="t2" aria-controls="q2" aria-selected="false" tabindex="-1">Two</button></div><div class="tabpanel" id="q1" role="tabpanel" aria-labelledby="t1" style="padding-top: 12px">Panel one.</div><div class="tabpanel" id="q2" role="tabpanel" aria-labelledby="t2" hidden>Panel two.</div></div>
  <nav class="link-tabs" aria-label="Pages"><ul><li><a class="link-tab" href="#a" aria-current="page"><span>One</span><span class="link-tab-line" aria-hidden="true"></span></a></li><li><a class="link-tab" href="#b"><span>Two</span><span class="link-tab-line" aria-hidden="true"></span></a></li></ul></nav>
</main>
<script>
addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", "__THEME__");
  document.getElementById("mixed").indeterminate = true;
  requestAnimationFrame(function () { requestAnimationFrame(function () { parent.postMessage({ basaltSkill: "ready", note: "" }, "*"); }); });
});
</script>`;

export function skillPages47() {
  const page = (before) => compose(`<title>Round 47</title>${before ? BEFORE() : ""}${BODY}`, { fonts: true }).html;
  return { "47-before": page(true), "47-after": page(false) };
}
