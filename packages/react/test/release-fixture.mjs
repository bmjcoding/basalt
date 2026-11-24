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

/**
 * Where each release ends (DECISIONS 331), measured in the page with the class prefix ("basalt-" for React, "" for the HTML skill), as the ruling
 * measured it: a line is its text's rectangle with its leading (the smaller half of an odd leading above), and a drawn box (Action needed, a bordered
 * button) is its edge. Copy link takes no height of its own and is left out.
 * - ends: for every release with a divider under it, what ends it and the gap from its lowest line or drawn edge to that divider (40 ruled).
 * - taps: every 44px tap box (a pseudo-element centred on its control): the targets it meets, how far it is inside its callout's rim and its
 *   release's divider, and, for the last change in a list, what a finger on its lowest row lands on.
 * - plates: for each arrived change, the plate's room above its first line and under its last.
 * - under: from the list's foot to the next thing below it on the page (the footer, or the tab bar), or null.
 */
export const ENDS = (p) => {
  const c = (s) => s.replace(/@/g, `.${p}`);
  const qa = (root, s) => [...root.querySelectorAll(c(s))];
  const R = (el) => el.getBoundingClientRect();
  const f = (n) => Math.round(n * 100) / 100;
  const shown = (el) => el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true }) && !el.closest(`.${p}visually-hidden, .visually-hidden, [hidden]`);
  const lines = (root, { hidden = false } = {}) => {
    const all = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent.trim() || el.closest(c("@release-copy")) || (!hidden && !shown(el))) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const q of range.getClientRects()) {
        if (q.width < 1 || q.height < 1) continue;
        const lead = ((parseFloat(getComputedStyle(el).lineHeight) || q.height) - q.height) / 2;
        all.push({ t: q.top - Math.floor(lead), b: q.bottom + Math.ceil(lead) });
      }
    }
    return all;
  };
  const filled = (cs) => !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor);
  const drawn = (root) => qa(root, "@callout, @button, .btn").filter((el) => shown(el) && !el.closest(c("@release-copy")) && (parseFloat(getComputedStyle(el).borderBottomWidth) > 0 || filled(getComputedStyle(el)))).map((el) => R(el).bottom);
  const releases = qa(document, "@release").filter((el) => el.matches(c("@release")) && shown(el));
  const ends = releases.slice(0, -1).map((el, i) => {
    const lowest = Math.max(...lines(el).map((l) => l.b), ...drawn(el));
    const last = el.lastElementChild;
    const fold = last.querySelector(c("@accordion-trigger, @release-fold"));
    return { id: el.id, ends: last.className.toString().split(" ")[0] + (last.hasAttribute("data-folded") ? "[data-folded]" : ""), open: fold ? fold.getAttribute("aria-expanded") === "true" || fold.hasAttribute("data-panel-open") : null, gap: f(R(releases[i + 1]).top - lowest) };
  });
  const hosts = [...qa(document, "@release-source").map((el) => [el, "::before"]), ...qa(document, "@release-migrate, @release-action-link").map((el) => [el, "::after"])].filter(([el]) => shown(el));
  const geometry = ([el, pseudo]) => {
    const ps = getComputedStyle(el, pseudo);
    const q = R(el);
    if (ps.content === "none" || ps.position !== "absolute") return { el, l: q.left, r: q.right, t: q.top, b: q.bottom };
    const w = parseFloat(ps.width), h = parseFloat(ps.height), cx = (q.left + q.right) / 2, cy = (q.top + q.bottom) / 2;
    return { el, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
  };
  const boxes = hosts.map(geometry);
  const targets = [...document.querySelectorAll("button, a[href], [role='button'], summary, input, select, textarea")].filter((el) => shown(el) && !el.closest("[inert]"));
  const meets = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
  /** An element's box in the same l, r, t, b terms as a tap box (a DOMRect's are left, right, top and bottom). */
  const edges = (el) => { const q = R(el); return { l: q.left, r: q.right, t: q.top, b: q.bottom }; };
  const taps = boxes.map((box) => {
    const { el } = box;
    const entry = el.closest(c("@release-entry"));
    const callout = el.closest(c("@release-action"));
    const release = el.closest(c("@release"));
    const name = `${entry?.id ?? release?.id}: ${el.textContent.trim().slice(0, 20)}`;
    const out = { name, last: Boolean(entry?.matches(":last-child")), meets: [
      ...boxes.filter((o) => o !== box && meets(o, box)).map((o) => o.el.textContent.trim().slice(0, 20)),
      ...targets.filter((o) => o !== el && !el.contains(o) && !o.contains(el) && !boxes.some((x) => x.el === o) && meets(edges(o), box)).map((o) => (o.getAttribute("aria-label") || o.textContent).trim().slice(0, 20)),
    ] };
    if (callout) out.insideRim = f(R(callout).bottom - parseFloat(getComputedStyle(callout).borderBottomWidth) - box.b);
    const next = release && releases[releases.indexOf(release) + 1];
    if (next) out.insideDivider = f(R(next).top - box.b);
    return out;
  });
  // What a finger on the middle of a last change's lowest box row lands on, each brought to the middle of the window first.
  hosts.forEach((host, i) => {
    if (!taps[i].last) return;
    host[0].scrollIntoView({ block: "center" });
    const box = geometry(host);
    const hit = document.elementFromPoint((box.l + box.r) / 2, box.b - 1);
    taps[i].lowestRow = hit === host[0] || host[0].contains(hit) ? "itself" : hit?.className?.toString().slice(0, 30) || hit?.tagName || "nothing";
  });
  scrollTo(0, 0);
  const plates = qa(document, "@release-entry").filter((el) => el.hasAttribute("data-arrival") && shown(el)).map((el) => {
    const ps = getComputedStyle(el, "::before");
    const box = R(el);
    const plateT = box.top + parseFloat(ps.top), plateB = box.bottom - parseFloat(ps.bottom);
    const ls = lines(el, { hidden: true });
    return { id: el.id, last: el.matches(":last-child"), inCallout: Boolean(el.closest(c("@release-action"))), above: f(Math.min(...ls.map((l) => l.t)) - plateT), under: f(plateB - Math.max(...ls.map((l) => l.b))) };
  });
  const notes = document.querySelector(c("@release-notes")) ?? releases.at(-1)?.parentElement;
  let under = null;
  if (notes) {
    scrollTo(0, document.scrollingElement.scrollHeight);
    const foot = R(notes).bottom;
    const below = [...document.querySelectorAll("footer, nav, [class*='tabbar'], [class*='tab-bar']")].filter((el) => shown(el) && !notes.contains(el) && R(el).top >= foot - 0.5 && R(el).height);
    if (below.length) under = f(Math.min(...below.map((el) => R(el).top)) - foot);
    scrollTo(0, 0);
  }
  return { ends, taps, plates, under };
};
