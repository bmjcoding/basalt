// Round 84's HTML-skill pages (micro-details m2, DECISIONS 419): one synthetic body (a bakery and a tide gauge) composed twice. "84-after" is the build;
// "84-before" is the same page with main's values put back for what m2 adds: grayscale smoothing on every page, proportional figures on time, .badge
// and .status, the browser's wrap on the titles and bodies, and the plain space (the body's own glue is written as &nbsp; and swapped back). A page sets
// its own theme from the review page's.
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const BODY = `<main class="page" style="padding: 16px; max-width: 560px">
<div class="stack">
  <h2>Tide tables for the outer harbour and the north breakwater gauge</h2>
  <p class="small">High tide at <time datetime="2026-11-04T06:11">6:11&nbsp;AM</time>, low at <time datetime="2026-11-04T12:48">12:48&nbsp;PM</time>, 1.8&nbsp;m. Read every six minutes and kept for a year.</p>
  <div class="cluster"><span class="badge" data-status="success">11 loaves</span><span class="badge" data-status="success">88 loaves</span><span class="status" data-status="pending">Proofing 14 of 19</span></div>
  <p><time datetime="2026-11-01">Nov&nbsp;1</time><span class="dot-sep" data-spaced><span class="visually-hidden">, </span></span><span class="date-age-age">11&nbsp;days ago</span></p>
  <div class="callout" data-status="warning"><div><div class="callout-title">The north gauge reads low after the storm surge on Tuesday night</div><div class="callout-body">Readings from the north breakwater are held back until a person checks them against the south gauge, which reads as it should.</div></div></div>
  <div class="panel panel-pad" style="max-width: 320px"><h2 class="dialog-title">Rename the north breakwater gauge before the next reading</h2><p class="popover-description">Where the gauge reads from, and who checks it after a surge.</p></div>
  <div class="code"><pre class="code-body" tabindex="0"><code>const ready = loaves &gt;= 12 &amp;&amp; oven !== null;</code></pre></div>
  <p>Press <span data-kbd="Mod K"></span> to search. The rye was shaped at nine and baked at four for the stall.</p>
  <div style="display: flex; gap: 8px; flex-wrap: wrap">${["12&nbsp;min 34&nbsp;s", "Nov&nbsp;4", "10&nbsp;MB", "Q1&nbsp;2027"].map((s) => `<p class="small" style="width: 120px; padding: 8px; border: 1px dashed var(--basalt-border-hairline)">Proofed ${s} for the stall</p>`).join("")}</div>
  <div class="cluster"><button class="btn" data-variant="primary">Bake the rye</button><button class="btn">Read the gauge</button></div>
</div>
</main>`;

const BEFORE_STYLE = `<style>
@layer reset { :where([data-theme="dark"], .dark), :where([data-theme="light"], .light), body { -webkit-font-smoothing: antialiased; } time { font-variant-numeric: normal; } }
.badge, .status { font-variant-numeric: normal; }
.callout-title, .callout-body, .dialog-title, .popover-description { text-wrap: wrap; }
</style>`;

const READY = `<script>
addEventListener("load", function () { document.documentElement.setAttribute("data-theme", "__THEME__"); });
</script>`;

export function skillPages84() {
  return {
    "84-after": compose(`<title>Round 84, after</title>${BODY}${READY}`, { fonts: true }).html,
    "84-before": compose(`<title>Round 84, before</title>${BODY.replace(/&nbsp;/g, " ")}${BEFORE_STYLE}${READY}`, { fonts: true }).html,
  };
}
