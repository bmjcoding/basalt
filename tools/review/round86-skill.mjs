// Round 86's HTML-skill page (cimip-gaps-3 T9): one body composed with --palettes basalt,beryl and the ochre fixture. The page sets its own theme and palette
// from the review page's (the frame cannot read the review page's root). Synthetic content only (a tide station's console, a bakery's order).
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compose, loadPalettes } from "../../.agent/skills/basalt-html/compose.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const BODY = `<main style="padding: 16px; display: grid; gap: 16px; max-width: 560px">
<div class="cluster"><button class="btn" data-variant="primary">Log a reading</button><button class="btn">Export</button><button class="btn" data-variant="ghost">Archive</button></div>
<p style="margin: 0">High water at the harbour mouth is 06:42; read the <a href="#tables">tide tables</a>.</p>
<div class="palette-choice"><span class="palette-choice-label" id="pal-l">Palette</span>
  <div class="segment" role="radiogroup" aria-labelledby="pal-l" aria-describedby="pal-n">
    <button type="button" role="radio" data-value="basalt"><span data-label="Basalt">Basalt</span></button>
    <button type="button" role="radio" data-value="beryl"><span data-label="Beryl">Beryl</span></button>
    <button type="button" role="radio" data-value="ochre"><span data-label="Ochre">Ochre</span></button>
  </div>
  <p class="palette-choice-note" id="pal-n" data-palette-note hidden>From the link you opened. Choose one to save it.</p></div>
<label class="field"><span class="label">Customer</span><input class="input" value="Marisol at the corner café"></label>
<div class="cluster"><label class="choice"><input type="checkbox" checked> Sliced</label><label class="choice"><input type="radio" name="h" checked> Pick up</label></div>
<div class="tabs" role="tablist" aria-label="Views"><button class="tab" role="tab" aria-selected="true">Tides</button><button class="tab" role="tab" aria-selected="false">Swell</button></div>
</main>
<script>document.documentElement.setAttribute("data-theme", "__THEME__"); try { localStorage.setItem("basalt-palette", "__PALETTE__"); } catch (e) {} document.documentElement.setAttribute("data-palette", "__PALETTE__");</script>`;

export async function skillPages86() {
  const palettes = await loadPalettes(["basalt", "beryl", path.join(here, "..", "..", "packages", "tokens", "test", "palettes", "ochre.mjs")]);
  return { 86: compose(`<title>Tide station</title>${BODY}`, { fonts: true, palettes }).html };
}
