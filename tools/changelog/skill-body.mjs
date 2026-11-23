// A page body for the HTML skill's `release` module, from the records (DECISIONS 320, 2.15 and 3.4): the same releases, parts and order as React's
// `ReleaseNotes`, `ReleaseIndex` and `VersionLink`, written as markup an agent composes.
//   node tools/changelog/skill-body.mjs --form reference|notes [--root <repository>] [--running <version>] [--base <address>] --out <body.html>
// then: node .agent/skills/basalt-html/compose.mjs <body.html>
// Every fold is written open: the module's script closes it, so without script the page shows everything.
import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "./config.mjs";
import { sectionsOf, SECTION_NAMES, upgradeLine } from "./outputs.mjs";
import { pageReleases } from "./records.mjs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Nov 23, 2026": the calendar date as written, never moved by a time zone. */
export const usDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** The sentence: backticks mark code, and nothing else is markup. */
const sentence = (text) => text.split(/`([^`]+)`/).map((part, index) => (index % 2 ? `<code>${esc(part)}</code>` : esc(part))).join("");
const DOT = `<span class="dot-sep" data-spaced><span class="visually-hidden">, </span></span>`;
const dots = (parts) => parts.filter(Boolean).join(DOT);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const count = (n) => `<span class="release-count"><span class="visually-hidden"> </span>${n}</span>`;
export const releaseId = (release) => (release.unreleased ? "unreleased" : `v${release.version}`);
const SHOWN_TICKETS = 2;

/** The version with its date, one link (VersionLink). `label` is the word before the number; a site's footer gives the product. */
export function versionLink({ version, date, href, label = "Version", current = false, destination = "release notes" }) {
  const at = version.indexOf("-");
  const number = at < 0 ? esc(version) : `${esc(version.slice(0, at))}<wbr><span class="version-link-pre">${esc(version.slice(at))}</span>`;
  // The name is written whole: the two parts are flex items, whose text a name would join with stray spaces.
  return `<a class="version-link" href="${esc(href)}" aria-label="${esc(`${label} ${version}, ${usDate(date)}, ${destination}`)}"${current ? ' aria-current="page"' : ""}><span class="version-link-words"><span class="version-link-word">${esc(label)}&nbsp;</span><span class="version-link-number" data-label="${esc(version)}"><span>${number}</span></span></span> <span class="version-link-date"><time datetime="${esc(date)}">${usDate(date)}</time></span></a>`;
}

function sources(entry) {
  const tickets = entry.tickets ?? [];
  const ids = [];
  if (entry.pr) ids.push(`#${entry.pr.number}`);
  for (const ticket of tickets.slice(0, SHOWN_TICKETS)) ids.push(ticket.label);
  if (!entry.pr && !tickets.length && entry.commit) ids.push(entry.commit.sha.slice(0, 8));
  if (!ids.length) return "";
  const more = tickets.length - SHOWN_TICKETS;
  if (more > 0) ids.push(`${more} more`);
  const rows = [];
  if (entry.pr) rows.push(`<div><dt>Pull request</dt><dd data-mono><a href="${esc(entry.pr.href)}">#${entry.pr.number}</a></dd></div>`);
  if (tickets.length) rows.push(`<div><dt>${tickets.length === 1 ? "Ticket" : "Tickets"}</dt>${tickets.map((ticket) => `<dd>${esc(ticket.tracker)} ${ticket.href ? `<a class="release-mono" href="${esc(ticket.href)}">${esc(ticket.label)}</a>` : `<span class="release-mono">${esc(ticket.label)}</span>`}</dd>`).join("")}</div>`);
  if (entry.commit) rows.push(`<div><dt>Commit</dt><dd data-mono>${entry.commit.href ? `<a href="${esc(entry.commit.href)}">${entry.commit.sha.slice(0, 8)}</a>` : entry.commit.sha.slice(0, 8)}</dd></div>`);
  if (entry.authors?.length) rows.push(`<div><dt>${entry.authors.length === 1 ? "Author" : "Authors"}</dt>${entry.authors.map((name) => `<dd>${esc(name)}</dd>`).join("")}</div>`);
  const panel = `${entry.id}-sources`;
  return `<button type="button" class="release-source" popovertarget="${panel}" aria-describedby="${entry.id}-words"><span class="visually-hidden">Sources: </span>${ids.map((id) => `<span class="release-id">${esc(id)}</span>`).join(DOT)}</button>` +
    `<div class="panel float popover release-sources" popover id="${panel}" data-align="end"><h2 class="popover-title">Sources</h2><dl class="dlist release-sources-list">${rows.join("")}</dl>` +
    `<button class="btn" data-size="sm" data-copy-text="#${esc(entry.id)}" data-copy-fragment="${esc(entry.id)}" data-copy-words="Copied" data-copy-status="Link copied"><span>Copy link to this change</span></button></div>`;
}

function entry(item) {
  const area = item.area ? `<span class="release-area">${esc(item.area)}:</span> ` : "";
  const link = item.link ? `<a class="release-migrate" href="${esc(item.link.href)}">${esc(item.link.label)}</a>` : "";
  return `<li class="release-entry" id="${esc(item.id)}"${item.link ? " data-link" : ""}><span class="release-word" aria-hidden="true">Linked</span><div class="release-entry-words"><p class="release-entry-text" id="${esc(item.id)}-words">${area}${sentence(item.text)}</p>${link}</div><span class="release-source-cell">${sources(item)}</span></li>`;
}

const list = (entries) => `<ul class="release-list">${entries.map(entry).join("")}</ul>`;

/** A fold, written open: its heading holds the button; the script closes it, and the browser's find opens it. */
const fold = (id, level, title, body, className = "") => `<h${level} class="release-fold-title${className}"><button type="button" class="disclosure release-fold" aria-expanded="true" aria-controls="${id}"><span>${title}</span></button></h${level}><div class="release-fold-panel" id="${id}">${body}</div>`;

function sectionsHtml(release, sections, level, foldFixed) {
  return sections.map((section) => {
    const title = `${SECTION_NAMES[section.key]}${count(section.entries.length)}`;
    if (section.key === "fixed" && foldFixed) return `<section class="release-section" data-folded>${fold(`${releaseId(release)}-fixed`, level, title, list(section.entries))}</section>`;
    return `<section class="release-section"><h${level} class="release-section-title">${title}</h${level}>${list(section.entries)}</section>`;
  }).join("");
}

function buildDetails(rows, id, level) {
  const dl = `<dl class="dlist release-build-list">${rows.map((row) => `<div><dt>${esc(row.label)}</dt><dd${row.mono ? " data-mono" : ""}>${esc(row.value)}</dd></div>`).join("")}</dl>`;
  const copy = `<button class="btn" data-size="sm" data-copy-text="${esc(rows.map((row) => `${row.label}: ${row.value}`).join("\n"))}" data-copy-words="Copied" data-copy-status="Build details copied"><span>Copy build details</span></button>`;
  return `<div class="release-build">${fold(id, level, "Build details", dl + copy)}</div>`;
}

function release(item, { form, product, running, runningBuild, level }) {
  const id = releaseId(item);
  const all = sectionsOf(item);
  const action = all.find((section) => section.key === "action")?.entries ?? [];
  const sections = all.filter((section) => section.key !== "action");
  const inside = sections.reduce((sum, section) => sum + section.entries.length, 0);
  const leads = form === "notes" && Boolean(item.audiences?.length);
  const folded = leads && inside > 0;
  const fixed = sections.find((section) => section.key === "fixed")?.entries.length ?? 0;
  const fixedFolds = !folded && item.entries.length > 10 && fixed > 3;
  const total = item.entries.length;
  const yours = running !== undefined && !item.unreleased && running === item.version;
  const pre = !item.unreleased && item.version.includes("-");
  const date = item.date ? `<time datetime="${item.date}">${usDate(item.date)}</time>` : "";
  const facts = [total ? plural(total, "change", "changes") : "", action.length ? `<a class="release-action-link" href="#${id}-action">${plural(action.length, "needs action", "need action")}</a>` : ""];
  const badges = pre || yours ? `<span class="release-badges">${pre ? `<span class="badge">Pre-release</span>` : ""}${yours ? `<span class="badge">Your version</span>` : ""}</span>` : "";
  const h = `h${level}`;
  const heading = item.title
    ? `<${h} class="release-heading" id="${id}-heading" data-headline><span class="release-meta release-number-line">${dots([esc(item.version), date])}</span><span class="visually-hidden">: </span><span class="release-title">${esc(item.title)}</span></${h}>` + (facts.some(Boolean) || badges ? `<p class="release-meta">${dots(facts)}${badges}</p>` : "")
    : `<${h} class="release-heading" id="${id}-heading"><span class="release-version"${item.unreleased ? " data-words" : ""}>${item.unreleased ? "Unreleased" : esc(item.version)}</span>${date ? `<span class="visually-hidden">, ${usDate(item.date)}</span>` : ""}</${h}>` + (date || facts.some(Boolean) || badges ? `<p class="release-meta">${dots([date, ...facts])}${badges}</p>` : "");
  const name = item.unreleased ? "Unreleased" : `${product} ${item.version}`;
  const head = `<header class="release-head"><div class="release-head-text"><span class="release-word" aria-hidden="true">Linked</span>${heading}</div><button class="btn release-copy" data-variant="ghost" data-size="sm" data-copy-text="#${id}" data-copy-fragment="${id}" data-copy-words="Copied" data-copy-status="Link copied" aria-label="Copy link to ${esc(name)}"><span>Copy link</span></button></header>`;
  const summary = item.summary ? `<p class="release-summary">${esc(item.summary)}</p>` : "";
  const upgrade = form === "reference" ? upgradeLine(item) : null;
  const callout = action.length ? `<div class="callout release-action" data-status="warning" id="${id}-action"><i data-icon="Warning"></i><div><div class="callout-title"><h${level + 1} class="release-callout-title">Action needed${count(action.length)}</h${level + 1}></div><div class="callout-body">${upgrade ? `<p class="release-upgrade">${esc(upgrade)}</p>` : ""}${list(action)}</div></div></div>` : "";
  const audiences = leads ? item.audiences.map((audience) => `<section class="release-audience">${audience.for ? `<h${level + 1} class="release-audience-title">${esc(audience.for)}</h${level + 1}>` : ""}<p class="release-paragraph">${esc(audience.text)}</p></section>`).join("") : "";
  const body = folded
    ? `<div class="release-all">${fold(`${id}-all`, level + 1, `${action.length ? "Other changes" : "All changes"}${count(inside)}`, summary + sectionsHtml(item, sections, level + 2, false))}</div>`
    : (leads ? summary : "") + sectionsHtml(item, sections, level + 1, fixedFolds);
  const build = yours && runningBuild?.length ? buildDetails(runningBuild, `${id}-build`, level + 1) : "";
  const replaces = item.replaces?.length ? ` data-replaces="${esc(item.replaces.join(" "))}"` : "";
  return `<section class="release" id="${id}" aria-labelledby="${id}-heading" data-release-form="${form}"${replaces}>${head}${leads ? "" : summary}${callout}${audiences}${body}${build}</section>`;
}

/** The releases, as `ReleaseNotes` draws them. `base` is the page's address for copied links; without it the script reads the window's. */
export function releaseNotesHtml(releases, { form, product, running, runningBuild, base, level = 2 }) {
  const drawn = releases.filter((item) => !(form === "notes" && item.unreleased));
  const matches = running !== undefined && drawn.some((item) => !item.unreleased && item.version === running);
  const top = running !== undefined && !matches && runningBuild?.length ? buildDetails(runningBuild, "build", level + 1) : "";
  return `<div class="release-notes" data-release-form="${form}"${base ? ` data-base="${esc(base)}"` : ""}>${top}${drawn.map((item) => release(item, { form, product, running, runningBuild, level })).join("")}</div>`;
}

/** The versions, as `ReleaseIndex` draws them: "pane" beside the page, "fold" above the first release. */
export function releaseIndexHtml(releases, { form = "pane", label = "Versions" } = {}) {
  const rows = `<ul class="release-index-list">${releases.map((item) => `<li><a class="release-index-link" href="#${releaseId(item)}"><span class="release-index-number"${item.unreleased ? " data-words" : ""}>${item.unreleased ? "Unreleased" : esc(item.version)}</span>${item.date ? `<span class="visually-hidden">, </span><time datetime="${item.date}">${usDate(item.date)}</time>` : ""}</a></li>`).join("")}</ul>`;
  if (form === "fold") return `<nav class="release-index" data-release-form="fold" aria-label="${esc(label)}">${fold("versions-fold", 2, esc(label), rows)}</nav>`;
  return `<nav class="release-index" data-release-form="pane" aria-labelledby="versions-title"><h2 class="release-index-title" id="versions-title">${esc(label)}</h2>${rows}</nav>`;
}

/** A whole page body: a package's changelog with its versions, or a product's release notes. */
export function pageBody(releases, { form, product, running, runningBuild, base, title = form === "notes" ? "Release notes" : "Changelog" }) {
  const notes = releaseNotesHtml(releases, { form, product, running, runningBuild, base });
  if (form === "notes") return `<main class="page" id="main"><h1>${esc(title)}</h1>${notes}</main>\n`;
  return `<main class="page" id="main"><h1>${esc(title)}</h1><div class="pane-layout"><div class="pane-grid"><div class="pane-page">${releaseIndexHtml(releases, { form: "fold" })}${notes}</div><section class="pane" aria-label="Versions">${releaseIndexHtml(releases)}</section></div></div></main>\n`;
}

function main(argv) {
  const args = [...argv];
  const take = (flag) => { const at = args.indexOf(flag); return at < 0 ? undefined : args.splice(at, 2)[1]; };
  const root = path.resolve(take("--root") ?? process.cwd());
  const form = take("--form") ?? "reference";
  const running = take("--running");
  const base = take("--base");
  const out = take("--out");
  if (!["reference", "notes"].includes(form) || !out) {
    process.stderr.write("usage: node tools/changelog/skill-body.mjs --form reference|notes [--root <repository>] [--running <version>] [--base <address>] --out <body.html>\n");
    process.exit(2);
  }
  const config = loadConfig(root);
  fs.writeFileSync(path.resolve(out), pageBody(pageReleases(root, { config }), { form, product: config.product, running, base }));
}

const { isMain } = await import("../../scripts/is-main.mjs");
if (isMain(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
