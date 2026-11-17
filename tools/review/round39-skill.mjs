// Round 39's HTML-skill specimens: the bar's three phases, composed with the skill's own compose.mjs and drawn in an iframe, because a real fixed bar, a real scroll and a real
// observer need a window of their own. The page scrolls itself to the phase, then prints what it measured in its own readout (the row's height, where an anchor lands, where
// focus is). build.mjs calls `skillPages39()` when round 39 is wanted. Synthetic content only: nothing from a prototype.
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const bar = `<div class="site-slot"><header class="topbar" data-phase-after="#hero"><div class="topbar-inner"><a class="brand" href="#" aria-label="Sample home"><b>Sample</b></a>
  <nav class="topbar-links" aria-label="Primary"><a href="#hero" aria-current="page">Start</a><a href="#t1">Guides</a><a href="#t2">Notes</a></nav><span class="spacer"></span>
  <a class="btn topbar-action" data-variant="primary" href="#t1">Open</a></div></header></div>`;

const page = (job) => compose(`<title>Phases</title>${bar}
<main><section id="hero" style="height: 520px; padding: 24px 24px 0"><h1>A first screen</h1><p>The bar leaves with the row, is gone while the page is between, and drops in once this screen has passed.</p><a id="hero-link" href="#t1">A link in the screen</a></section>
<div style="height: 1400px"></div><h2 id="t1">Target one</h2><div style="height: 1600px"></div><h2 id="t2">Target two</h2><div style="height: 1600px"></div></main>
<pre id="readout" style="position: fixed; inset: auto 8px 8px 8px; margin: 0; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--basalt-border-input); background: var(--basalt-surface-1); font: 12px/16px var(--basalt-font-family-mono); white-space: pre-wrap; z-index: 99"></pre>
<script>
addEventListener("load", function () {
  var theme = ${"`"}__THEME__${"`"};
  document.documentElement.setAttribute("data-theme", theme);
  var out = document.getElementById("readout");
  var head = document.querySelector(".topbar");
  var say = function (t) { out.textContent += t + "\\n"; };
  var rect = function (el) { return el.getBoundingClientRect(); };
  var settled = function (fn) { requestAnimationFrame(function () { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }); };
  var done = function () { parent.postMessage({ basaltSkill: "ready", note: "" }, "*"); };
  settled(function () {
    ${job}
  });
});
</script>`, { fonts: true }).html;

// Each job scrolls to a phase, waits for the observer, and prints the readouts.
const job = (y, extra) => `
    var slot = document.querySelector(".site-slot");
    var base = rect(document.querySelector("main")).top + scrollY;
    window.scrollTo(0, ${y});
    var wait = function (n) { if (head.getAttribute("data-phase") === "${y === 0 ? "rest" : y < 520 ? "between" : "pinned"}" || n > 60) { settled(report); } else requestAnimationFrame(function () { wait(n + 1); }); };
    var report = function () {
      say("scroll " + Math.round(scrollY) + "px: phase " + head.getAttribute("data-phase") + ", form " + head.getAttribute("data-form") + ", motion " + head.getAttribute("data-motion"));
      say("the row keeps its height: slot " + rect(slot).height + "px; the page starts at " + Math.round(rect(document.querySelector("main")).top + scrollY) + "px (" + base + "px at rest)");
      var shown = function (sel) { return Array.prototype.filter.call(document.querySelectorAll(sel), function (e) { return e.checkVisibility(); }).length; };
      say("exposed (rendered, so in the accessibility tree): " + shown("header") + " header, " + shown("nav[aria-label=Primary]") + " nav, " + shown(".brand") + " brand");
      say("in the DOM: " + document.querySelectorAll("nav[aria-label=Primary]").length + " nav, " + document.querySelectorAll(".brand").length + " brand; the second of each is the narrow menu's closed copy, not rendered");
      ${extra}
    };
    wait(0);`;

const anchor = `
      location.hash = "#t1";
      settled(function () {
        say("an anchor lands " + Math.round(rect(document.getElementById("t1")).top) + "px from the window's top (the bar's line 56 + 16 = 72)");
        var link = document.querySelector(".topbar-links a:nth-child(2)");
        link.focus({ preventScroll: true });
        settled(function () { var r = rect(link); say("focus in the bar: " + link.textContent + " at y " + Math.round(r.top) + "px, form " + head.getAttribute("data-form")); done(); });
      });`;

export function skillPages39() {
  return {
    "phase-rest": page(job(0, anchor)),
    "phase-between": page(job(300, anchor)),
    "phase-pinned": page(job(900, anchor)),
  };
}
