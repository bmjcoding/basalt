// The outputs (DECISIONS 320, 3.4): CHANGELOG.md, the page's data and a GitHub Release's body, each generated from the records and the pending
// files and nothing else, with the same entries in the same order (2.7): Action needed, Security, Deprecated, Removed, Added, Changed, Fixed.
import { TYPES } from "./entries.mjs";
import { byImpact } from "./records.mjs";

export const SECTION_NAMES = { action: "Action needed", security: "Security", deprecated: "Deprecated", removed: "Removed", added: "Added", changed: "Changed", fixed: "Fixed" };

/** A release's sections in order, each non-empty: the action entries first, then the rest by type. An action entry stands there and nowhere else. */
export function sectionsOf(release) {
  const out = [];
  const action = release.entries.filter((entry) => entry.action).sort(byImpact);
  if (action.length) out.push({ key: "action", entries: action });
  for (const type of TYPES) {
    const entries = release.entries.filter((entry) => !entry.action && entry.type === type).sort(byImpact);
    if (entries.length) out.push({ key: type, entries });
  }
  return out;
}

/** "Before upgrading from 0.1.0, check these 4 changes.": a package's callout opens with it, computed from the record. */
export function upgradeLine(release) {
  const count = release.entries.filter((entry) => entry.action).length;
  if (!count || !release.previous) return null;
  return `Before upgrading from ${release.previous}, check ${count === 1 ? "this change" : `these ${count} changes`}.`;
}

const sources = (entry) => {
  const parts = [];
  if (entry.pr) parts.push(`[#${entry.pr.number}](${entry.pr.href})`);
  for (const ticket of entry.tickets ?? []) parts.push(ticket.href ? `${ticket.tracker} [${ticket.label}](${ticket.href})` : `${ticket.tracker} ${ticket.label}`);
  if (!parts.length && entry.commit) parts.push(`[${entry.commit.sha.slice(0, 8)}](${entry.commit.href})`);
  return parts.length ? ` (${parts.join(", ")})` : "";
};

/** One entry as a Markdown list item: the area, the sentence, the migration link, then its sources. */
export function entryLine(entry) {
  const area = entry.area ? `${entry.area}: ` : "";
  const link = entry.link ? ` [${entry.link.label}](${entry.link.href})` : "";
  return `- ${area}${entry.text}${link}${sources(entry)}`;
}

/**
 * A release's body in Markdown, as blocks, in the page's order and with the form the config names. `level` is the level of the release's own parts
 * (3 under CHANGELOG.md's "## 1.4.0 - 2026-11-23", 2 in a GitHub Release).
 *
 * A package's ("reference"): the summary, Action needed opening with the upgrade line, then the sections, which a GitHub Release groups under "Changes".
 * A product's ("notes"): Action needed first, with no upgrade line; then the headline as a heading over the paragraph for everyone, a heading under it
 * for each audience; then the fold's own heading ("All changes", or "Other changes" under Action needed) over the summary and the sections. Every
 * paragraph then sits under a heading of its own, so none reads as part of the list above it. When every change stands in Action needed there is no
 * fold, and the summary follows the paragraphs, as on the page. A product's release with no paragraphs (a patch) is its summary and its sections.
 */
function releaseBody(release, { form = "reference", level = 3 } = {}) {
  const h = (depth) => "#".repeat(level + depth);
  const blocks = [];
  const sections = sectionsOf(release);
  const action = sections.find((section) => section.key === "action");
  const rest = sections.filter((section) => section.key !== "action");
  const list = (section, depth) => [`${h(depth)} ${SECTION_NAMES[section.key]}`, ...(section.key === "action" && form === "reference" && upgradeLine(release) ? ["", upgradeLine(release)] : []), "", ...section.entries.map(entryLine)].join("\n");
  const leads = form === "notes" && release.audiences?.length;
  if (form === "notes" && release.title && !leads) blocks.push({ kind: "notes", text: `**${release.title}**` });
  if (form === "reference" && release.summary) blocks.push({ kind: "notes", text: release.summary });
  if (action) blocks.push({ kind: "action", text: list(action, 0) });
  if (leads) {
    const paragraphs = [];
    for (const audience of release.audiences) paragraphs.push(audience.for ? `${h(1)} ${audience.for}\n\n${audience.text}` : audience.text);
    blocks.push({ kind: "notes", text: [`${h(0)} ${release.title ?? "Release notes"}`, ...paragraphs].join("\n\n") });
    if (rest.length) {
      const fold = `${h(0)} ${action ? "Other changes" : "All changes"}`;
      blocks.push({ kind: "fold", text: [fold, ...(release.summary ? [release.summary] : []), ...rest.map((section) => list(section, 1))].join("\n\n") });
    } else if (release.summary) {
      // Every change stands in Action needed, so there is no fold: the page draws the summary after the paragraphs, and so does this.
      blocks.push({ kind: "notes", text: release.summary });
    }
    return blocks;
  }
  if (form === "notes" && release.summary) blocks.push({ kind: "notes", text: release.summary });
  for (const section of rest) blocks.push({ kind: "section", text: list(section, form === "reference" && level === 2 ? 1 : 0) });
  return blocks;
}

/** `CHANGELOG.md`: every drawn release, highest first, headed `## 1.4.0 - 2026-11-23` (S 4.2). */
export function changelogMarkdown(releases, { product, form = "reference" } = {}) {
  const blocks = [`# Changelog`];
  if (product) blocks.push(`Every version of ${product}. This file is generated by \`tools/changelog\` from \`changelog/releases\` and \`.changes\`. Edit those, never this file.`);
  for (const release of releases) {
    blocks.push(release.unreleased ? "## Unreleased" : `## ${release.version} - ${release.date}`);
    blocks.push(...releaseBody(release, { form, level: 3 }).map((block) => block.text));
  }
  return `${blocks.join("\n\n")}\n`;
}

/** A GitHub Release's body for one release (S 7.3): the same parts a level up; a package's sections sit under "Changes". */
export function githubBody(release, { repository, form = "reference" } = {}) {
  const blocks = [];
  let changes = false;
  for (const block of releaseBody(release, { form, level: 2 })) {
    if (block.kind === "section" && form === "reference" && !changes) {
      blocks.push("## Changes");
      changes = true;
    }
    blocks.push(block.text);
  }
  if (repository && release.previous) blocks.push(`Full diff: [v${release.previous}...v${release.version}](${repository}/compare/v${release.previous}...v${release.version})`);
  return `${blocks.join("\n\n")}\n`;
}
