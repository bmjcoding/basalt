// Round 32's HTML-skill specimens: two pages composed with the skill's own compose.mjs (the same one an agent runs), handed to the walkthrough as strings and drawn in an iframe.
// build.mjs calls `skillPages()` when round 32 is wanted and defines `__SKILL_PAGES__` with the result, so no generated file is written. Synthetic data only.
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const DAYS = Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
const ALT = [10, 90, 10, 90, 10, 90, 10, 90, 10, 90, 10, 90];
const chart = (values) => ({ title: "Training", source: "Watch · synthetic", kind: "line", unit: "min", summary: "Two benches, twelve days.", days: DAYS, entrance: true, series: [{ id: "a", name: "A", values }], format: { suffix: " min", maximumFractionDigits: 0 } });

const bar = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#" aria-label="Placeholder home">Placeholder</a>
  <nav class="topbar-links" aria-label="Primary"><a href="#product">Product</a><a href="#docs" aria-current="page">Docs</a><a href="#pricing">Pricing</a></nav><span class="spacer"></span>
  <button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>
  <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button><a class="btn topbar-action" data-variant="primary" href="#start">Get started</a></div></header>`;

// The page's own script says what happened to the parent (a message) when its still is ready, and takes the theme the walkthrough is showing.
const tail = (job) => `<script>
addEventListener("load", function () {
  var theme = ${"`"}__THEME__${"`"};
  document.documentElement.setAttribute("data-theme", theme);
  var done = function (note) { parent.postMessage({ basaltSkill: "ready", note: note || "" }, "*"); };
  requestAnimationFrame(function () { requestAnimationFrame(function () { ${job} }); });
});
</script>`;

export function skillPages() {
  const html = (body) => compose(`<title>Skill</title>${body}`, { fonts: true }).html;
  const menu = (held) => html(`${bar}<main class="page"><h1>Placeholder</h1><p>The skill's narrow menu, open: the first row after the band is the pause control.</p><span class="spinner" role="status" aria-label="Working"></span></main>${tail(`
    var trigger = document.querySelector(".topbar-menu-trigger");
    if (!trigger || trigger.getBoundingClientRect().width === 0) { done("the menu exists only under 720"); return; }
    trigger.click();
    setTimeout(function () { ${held ? 'var row = document.querySelector(".topbar-menu-loops .btn"); if (row) row.click();' : ""} setTimeout(function () { done(); }, 300); }, 450);`)}`);
  const glide = html(`<main class="page"><figure class="chart" id="c"><script type="application/json" data-chart>${JSON.stringify(chart(ALT))}</script></figure><pre id="note" style="font: 12px/1.6 var(--basalt-font-family-mono); white-space: pre-wrap"></pre></main>${tail(`
    function rects() { var r = function (el) { var b = el.getBoundingClientRect(); return [b.x, b.y]; }; return { mark: r(document.querySelector(".chart-svg .chart-mark")), line: r(document.querySelector('.chart-svg .chart-line[data-dash="solid"]')) }; }
    var hold = function (ms) { document.getAnimations().forEach(function (a) { if (a.effect.getComputedTiming().iterations !== Infinity) { a.pause(); a.currentTime = ms; } }); };
    setTimeout(function () {
      hold(120);
      var before = rects();
      var next = ${JSON.stringify(chart(ALT.map((v) => 100 - v)))};
      Basalt.chart(document.getElementById("c"), next);
      hold(0);
      var after = rects();
      var far = function (a, b) { return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])).toFixed(1); };
      document.getElementById("note").textContent = "A new data set arrived 120 ms into the entrance.\\nAt that frame the first marker moved " + far(before.mark, after.mark) + " px and the line's box " + far(before.line, after.line) + " px: every mark glides from where it was drawn.";
      hold(90);
      done();
    }, 150);`)}`);
  return { menu: menu(false), "menu-held": menu(true), glide };
}
