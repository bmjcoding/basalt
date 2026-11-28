// Round 87's HTML-skill pages (micro-details m1, DECISIONS 405, 409): one synthetic body (a seed library and a ferry timetable) composed twice. "87-after" is
// the build, with the second control of each row held pressed (`data-wt-force="active"`: the review build forces the real :active inside the frame);
// "87-before" is the same page with main's values put back for what m1 changes at rest (the plain chevron in the row's own ink, the choice as a flex row
// centred on its whole label, the small nav's 8px start) and nothing held. A page sets its own theme from the review page's.
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const LONG = "Send me the spring sowing calendar, the frost dates for my district and a note when the seed potatoes ship";

const body = (pressed) => {
  const hold = pressed ? ' data-wt-force="active"' : "";
  return `<main class="page" style="padding: 16px; max-width: 560px">
<div class="stack">
  <p class="small">Choices: at rest, then pressed</p>
  <div class="cluster">
    <label class="choice"><input type="checkbox"> Heirloom</label>
    <label class="choice"><input type="checkbox"${hold}> Heirloom</label>
    <label class="choice"><input type="checkbox" checked> Organic</label>
    <label class="choice"><input type="checkbox" checked${hold}> Organic</label>
    <label class="choice"><input type="checkbox" role="switch"> Alerts</label>
    <label class="choice"><input type="checkbox" role="switch"${hold}> Alerts</label>
    <label class="choice"><input type="radio" name="sail" checked${hold}> 07:40 (a checked radio shows no press)</label>
  </div>
  <label class="choice" style="width: 300px; max-width: 100%"><input type="checkbox"> ${LONG}</label>
  <p class="small">A tab and a segment, the second pressed</p>
  <div class="tabs" role="tablist" aria-label="Seed views"><button class="tab" role="tab" aria-selected="true">Packets</button><button class="tab" role="tab" aria-selected="false"${hold}>Bulk</button></div>
  <div class="segment" role="group" aria-label="Crossing"><button aria-pressed="true">Morning</button><button aria-pressed="false"${hold}>Evening</button></div>
  <p class="small">The select and the file field, pressed</p>
  <div class="field"><label for="pier">Pier</label><div class="select"><select class="input" id="pier"${hold}><option value="">Choose a pier</option><option value="n">North pier</option></select></div></div>
  <div class="field"><label for="photo">Seed packet photo</label><span class="file-field"><input type="file" id="photo"${hold}></span></div>
  <p class="small">The plain disclosure at rest, then pressed; the prose form at rest</p>
  <button class="disclosure" data-disclosure aria-expanded="false" aria-controls="m1">Luggage on the ferry</button><div id="m1" hidden>One bag and a bicycle.</div>
  <button class="disclosure" data-disclosure aria-expanded="false" aria-controls="m2"${hold}>Timetable in winter</button><div id="m2" hidden>Fewer sailings.</div>
  <details><summary${hold}>When do potatoes ship?</summary><p>In March, chitted.</p></details>
  <button class="disclosure" data-prose data-disclosure aria-expanded="false" aria-controls="m3">Why the 07:40 waits for the tide</button><div id="m3" hidden>The harbour bar.</div>
  <p class="small">A link in a sentence, pressed: the underline to the ink</p>
  <p>Read the <a href="#guide"${hold}>sowing guide</a> before you order.</p>
  <nav class="nav" data-size="sm" aria-label="Saved"><ul class="nav-list">
    <li><a class="nav-item" href="#t"><span class="nav-pill"><span data-glyph="home" data-size="16"></span><span class="nav-label">Ferry timetable</span></span></a></li>
    <li><a class="nav-item" href="#w"><span class="nav-pill"><span class="nav-label">Words only</span></span></a></li>
  </ul></nav>
</div>
</main>`;
};

const BEFORE_STYLE = `<style>
.disclosure::after, details > summary::after { background: currentColor; }
.choice { display: inline-flex; align-items: center; gap: var(--basalt-space-2); }
.choice > input { margin-block: 0; }
.nav[data-size="sm"] .nav-pill { padding-inline: var(--basalt-space-2) var(--basalt-space-3); }
.nav[data-size="sm"] .nav-item:not(:has(.icon, [data-glyph])) .nav-pill { padding-inline: var(--basalt-space-3); }
</style>`;

const READY = `<script>
addEventListener("load", function () { document.documentElement.setAttribute("data-theme", "__THEME__"); });
</script>`;

export function skillPages87() {
  return {
    "87-after": compose(`<title>Round 87, after</title>${body(true)}${READY}`, { fonts: true }).html,
    "87-before": compose(`<title>Round 87, before</title>${body(false)}${BEFORE_STYLE}${READY}`, { fonts: true }).html,
  };
}
