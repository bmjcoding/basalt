// The two made-up projects of tools/changelog/fixtures, as page data for the release tests: Slate (a package) and Harbor (a product). Every fact in
// them is invented. Read from the fixtures the tool writes, so the parts are drawn from what the tool produces.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pageReleases, readRecords } from "../../../tools/changelog/records.mjs";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tools", "changelog", "fixtures");
export const SLATE = JSON.parse(fs.readFileSync(path.join(FIXTURES, "slate", "releases.json"), "utf8"));
export const HARBOR = JSON.parse(fs.readFileSync(path.join(FIXTURES, "harbor", "releases.json"), "utf8"));
/** Harbor as it stood before 2.0.0 shipped: its two candidates drawn as releases of their own. */
export const HARBOR_BEFORE = pageReleases(path.join(FIXTURES, "harbor"), { records: readRecords(path.join(FIXTURES, "harbor")).filter((record) => record.version !== "2.0.0"), pending: [] });
/** What a running Harbor build says of itself (made up): never read from a release's record. */
export const RUNNING_BUILD = [{ label: "Build", value: "1.4.0+9f3c1e2", mono: true }, { label: "Commit", value: "9f3c1e2a7d04", mono: true }, { label: "Basalt", value: "0.2.0", mono: true }];

/** A Harbor app shell with the version at its foot, the release notes as its page and More holding Settings (TSX for a fixture). */
export const harborShell = ({ running = "1.4.0", date = "2026-11-23", releases = "HARBOR", extra = "" } = {}) => `
  const version = <B.VersionLink version="${running}" date="${date}" href="#v${running}" current />;
  return (
    <B.AppShell brand={<span style={{ fontWeight: 600 }}>Harbor</span>} brandLabel="Harbor home"
      sidebar={<B.Nav aria-label="Primary"><B.NavItem href="#" icon={B.HomeGlyph}>Home</B.NavItem><B.NavItem href="#" icon={B.SearchGlyph}>Incidents</B.NavItem></B.Nav>}
      account={<B.Nav aria-label="Account"><B.NavItem href="#" icon={B.SettingsGlyph}>Settings</B.NavItem></B.Nav>}
      version={version}
      header={<B.AppHeader title="Release notes" />}
      tabBar={<B.TabBar><B.TabBarItem href="#" icon={B.HomeGlyph}>Home</B.TabBarItem><B.TabBarItem href="#" icon={B.SearchGlyph}>Incidents</B.TabBarItem><B.TabBarMore current="Release notes"><B.NavItem href="#" icon={B.SettingsGlyph}>Settings</B.NavItem></B.TabBarMore></B.TabBar>}>
      <B.ReleaseNotes releases={${releases}} form="notes" product="Harbor" running="${running}" runningBuild={RUNNING_BUILD} baseHref="https://harbor.example/release-notes" ${extra} />
    </B.AppShell>
  );`;

/**
 * The spacing sweep's measurements of a page of releases (DECISIONS 326, round 68), run in the page with the class prefix ("basalt-" for React,
 * "" for the HTML skill): where Copy link's words end against the header's edge (68-1), the action callout's inset above its first words and
 * under its last (68-2), the left edge of each list's references (68-3), each release's padding under it (68-4), the gap from each change's
 * last line to the next change's first (68-5) and how many lines each code chip in a change's words is drawn on (68-6).
 */
export const SWEEP = (p) => {
  const q = (root, s) => root.querySelector(s.replace(/@/g, `.${p}`));
  const qa = (root, s) => [...root.querySelectorAll(s.replace(/@/g, `.${p}`))];
  const r = (el) => el.getBoundingClientRect();
  const textRight = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let right = -Infinity;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || node.parentElement.closest("[hidden], [aria-hidden='true']") || getComputedStyle(node.parentElement).visibility === "hidden") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) if (rect.width) right = Math.max(right, rect.right);
    }
    return right;
  };
  const contentBottom = (el) => r(el).bottom - parseFloat(getComputedStyle(el).paddingBottom);
  const contentTop = (el) => r(el).top + parseFloat(getComputedStyle(el).paddingTop);
  const releases = qa(document, "@release");
  return {
    copy: releases.map((el) => { const copy = q(el, "@release-copy"); const head = q(el, "@release-head"); return copy && copy.offsetParent ? { id: el.id, off: Math.round((r(head).right - textRight(copy)) * 10) / 10 } : null; }).filter(Boolean),
    callouts: qa(document, "@release-action").map((el) => {
      const body = el.lastElementChild;
      const entries = qa(el, "@release-entry");
      const last = entries.at(-1);
      return { id: el.id, top: Math.round((r(body).top - r(el).top) * 10) / 10, bottom: Math.round((r(el).bottom - contentBottom(last)) * 10) / 10 };
    }),
    references: qa(document, "@release-source-cell").filter((el) => el.offsetParent && r(el).width).map((el) => ({ inCallout: !!el.closest(`.${p}release-action`), x: Math.round(r(el).left * 10) / 10 })),
    padding: releases.map((el) => ({ id: el.id, bottom: getComputedStyle(el).paddingBottom })),
    gaps: qa(document, "@release-entry").filter((el) => el.offsetParent && el.nextElementSibling?.matches(`.${p}release-entry`)).map((el) => ({ id: el.id, linked: el.hasAttribute("data-link"), gap: Math.round((contentTop(el.nextElementSibling) - contentBottom(el)) * 10) / 10, under: Math.round((r(el).bottom - Math.max(...[...el.children].filter((c) => r(c).height).map((c) => r(c).bottom))) * 10) / 10 })),
    chips: qa(document, "@release-entry-text " + (p ? "@inline-code" : "code")).filter((el) => el.offsetParent).map((el) => ({ text: el.textContent, lines: [...el.getClientRects()].filter((rect) => rect.width).length, wider: r(el).width > r(el.parentElement).width })),
  };
};
