// Writes tools/review/assets/round-36/data.json, the composed HTML-skill pages round 36 shows in frames (and a fixture's lifted head). Run after `npm run build`:  node tools/review/round36-data.mjs
// Synthetic pages only. The slow-link numbers in round36.tsx are measured on the audit's profile (390 px, 4x CPU, slow 4G), not by this file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const { compose } = await import(pathToFileURL(path.join(repo, ".agent/skills/basalt-html/compose.mjs")).href);

const BAR = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#top" aria-label="Orbit home">Orbit</a><span class="spacer"></span><a class="btn" data-variant="ghost" href="#docs">Docs</a><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>`;
const LONG = Array.from({ length: 70 }, (_, i) => `<p style="margin:0;padding:20px 0">Filler line ${i + 1}: synthetic text, so the page is long enough to scroll.</p>`).join("");
const bar = compose(`<title>A long page</title>${BAR}<main class="page"><h1 id="top">A long page</h1>${LONG}</main>`).html;

const toast = compose(`<title>A toast</title><!-- basalt:use toast --><main class="page stack"><h1>A page with a toast</h1><p class="lead muted">Press F6 to reach the toast.</p><button class="btn" id="open">Open</button><button class="btn" id="after">After</button></main>`).html;

const art = `<div class="stage-art" aria-hidden="true"><svg viewBox="0 0 1440 600" preserveAspectRatio="none"><rect width="1440" height="600" fill="var(--basalt-art-field)"/><path d="M0 330 C300 250 520 400 760 320 S1200 260 1440 330 V600 H0Z" fill="var(--basalt-art-tone-1)"/><path d="M0 430 C260 360 480 480 760 410 S1180 380 1440 440 V600 H0Z" fill="var(--basalt-art-tone-2)"/></svg></div>`;
const content = `<div class="stage-content"><div class="page" style="min-height: 360px"><h1 data-quiet="headline" style="max-width: 18ch">A synthetic headline</h1><p class="lead muted">Words on the art sit where it is quiet.</p></div></div>`;
const stage = (first) => compose(`<title>A stage</title>${BAR}<section class="stage" id="top">${first ? art + content : content + art}</section><main class="page"><h2>Below the stage</h2><p>Synthetic text.</p></main>`).html;

const headBody = `<title>A synthetic report</title>
<meta name="description" content="A synthetic report, to show what a body can carry into the head.">
<meta property="og:title" content="A synthetic report">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'><rect width='1' height='1' fill='%23888'/></svg>" type="image/svg+xml">
<link rel="canonical" href="https://example.test/report">
<h1>A synthetic report</h1>
<p class="lead">The tags above are in the body as written; the page's head carries them.</p>`;
const headPage = compose(headBody).html;
const headTags = headPage.slice(0, headPage.indexOf("</head>")).split("\n").filter((l) => /^<(meta|link|title)/.test(l)).map((l) => (l.length > 150 ? `${l.slice(0, 147)}…` : l));
const bodyAfter = headPage.slice(headPage.indexOf("<body>")).split("\n").slice(0, 4).join("\n");

const out = path.join(here, "assets", "round-36");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "data.json"), JSON.stringify({ bar, toast, stageLast: stage(false), stageFirst: stage(true), headBody, headTags, bodyAfter }, null, 1));
console.log(`round 36 data: ${(fs.statSync(path.join(out, "data.json")).size / 1024).toFixed(0)} KB; head tags ${headTags.length}`);
