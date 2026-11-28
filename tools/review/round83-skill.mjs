// Round 83's HTML-skill pages (cimip-gaps-3 t8, DECISIONS 407): the search dialog with a query wider than its field, at rest (focus on Close), and a bare
// search input in a form with a placeholder wider than its box. "83-before" is the same page with data-fades="off" (the plain cut as it shipped).
// A page sets its own theme from the review page's. Synthetic content only (a ferry timetable).
import { compose } from "../../.agent/skills/basalt-html/compose.mjs";

const QUERY = "Ferry from Harbour Quay to North Island, weekday sailings after six";
const BODY = `<main style="padding: 16px; display: grid; gap: 16px; max-width: 520px">
<div class="field" style="width: 200px"><label class="label" for="pier">Find a pier</label><input class="input" id="pier" type="search" placeholder="Pier, island or operator, by name or code"></div>
<div class="field" style="width: 200px"><label class="label" for="pier2">The same, with words</label><input class="input" id="pier2" type="search" value="${QUERY}"></div>
<button class="btn" data-dialog-open="#q">Search the timetable</button>
</main>
<dialog class="panel float modal dialog search" id="q" aria-label="Search the timetable"><form class="search-form" role="search"><label class="search-field"><span data-glyph="search"></span><span class="visually-hidden">Search sailings</span><input class="search-input" type="search" placeholder="Sailings, piers, islands and the operators that run them" value="${QUERY}"></label><button type="button" class="btn search-close" data-variant="ghost" data-icon-only data-edge="end" aria-label="Close search" data-dialog-close><span data-glyph="close"></span></button></form>
<p class="search-count">2 sailings</p><ul class="search-results" style="--_logos: 0; --_packs: 2; --_alls: 0"><li><a class="search-result" href="#a"><span class="search-name"><span class="search-title">Harbour Quay to North Island</span><span class="search-detail">Mon to Fri · 18:10</span></span></a></li><li><a class="search-result" href="#b"><span class="search-name"><span class="search-title">Harbour Quay to North Island, late</span><span class="search-detail">Mon to Fri · 19:40</span></span></a></li></ul></dialog>`;

const READY = (before) => `<script>
addEventListener("load", function () {
  document.documentElement.setAttribute("data-theme", "__THEME__");
  ${before ? 'document.documentElement.setAttribute("data-fades", "off");' : ""}
  document.getElementById("q").showModal();
  setTimeout(function () { document.querySelector(".search-close").focus(); }, 150);
});
</script>`;

export function skillPages83() {
  return {
    "83-after": compose(`<title>Round 83 search</title>${BODY}${READY(false)}`, { fonts: true }).html,
    "83-before": compose(`<title>Round 83 search, before</title>${BODY}${READY(true)}`, { fonts: true }).html,
  };
}
