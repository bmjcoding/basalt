// Round 28: the second engineering batch of the components stream (DECISIONS 133, components-eng-2): a skip link for React, one helper for
// reserved room, and the anchor landing clear of a sticky bar. No rendered pixel that exists today changes (the build's pixel comparison
// against the first engineering PR is in the PR), so there was no vote: AGENTS.md calls "a new prop or API that changes no pixel"
// engineering. The skip link is the HTML skill's own, drawn with the same tokens; the helper draws nothing; the anchor rule is the one
// foundations already writes. The owner has not yet approved the council's tally that these three are engineering (DECISIONS 135),
// and the design panel has not reviewed any of it. Every word is synthetic.
//
// Each demo that needs a page of its own (a skip link sits at the top of the page, an anchor scrolls the page) lives in a frame: an
// iframe whose document takes the walkthrough's stylesheet and theme, with the real components rendered into it. The states are real:
// "focused" gives the skip link focus; "followed" follows it (or the anchor); "second" and "third" put the live reserved cell on its
// other wordings; "*-forced-colours" and "*-reduced-motion" are the same page under those emulations (build.mjs sets them first).

import * as React from "react";
import { createPortal } from "react-dom";

import {
  AppHeader,
  AppShell,
  Button,
  HomeGlyph,
  IconButton,
  MessagesGlyph,
  Nav,
  NavItem,
  Reserve,
  SettingsGlyph,
  SiteHeader,
  SkipLink,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const readout = (text: string) => <Text size="sm" tone="secondary" mono>{text}</Text>;
const MARK = <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>;

// ---- a frame: a document of its own, with the walkthrough's stylesheet and theme ----

function Frame({ height, label, children, onReady }: { height: number; label: string; children: React.ReactNode; onReady?: (doc: Document) => void }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [body, setBody] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();
    for (const node of Array.from(document.head.querySelectorAll("style, link[rel=stylesheet]"))) doc.head.appendChild(node.cloneNode(true));
    const style = doc.createElement("style");
    style.textContent = "html, body { margin: 0; } body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); font-size: var(--basalt-text-base-size); line-height: var(--basalt-text-base-line-height); }";
    doc.head.appendChild(style);
    const sync = () => { doc.documentElement.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") ?? "dark"); doc.documentElement.style.colorScheme = document.documentElement.style.colorScheme; };
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
    setBody(doc.body);
    return () => watch.disconnect();
  }, []);
  React.useEffect(() => {
    if (body && onReady) onReady(body.ownerDocument);
  }, [body, onReady]);
  return (
    <div style={{ border: "1px solid var(--basalt-border-input)", borderRadius: 12, overflow: "hidden" }}>
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a frame the round writes itself with doc.write of its own markup, to measure it */}
      <iframe ref={ref} title={label} style={{ display: "block", width: "100%", height, border: 0 }} />
      {body ? createPortal(children, body) : null}
    </div>
  );
}

const PAGE_BODY = (
  <main id="main" tabIndex={-1} style={{ padding: "24px 24px 600px", outline: "none" }}>
    <Text weight="semibold">Synthetic page</Text>
    <p style={{ margin: "8px 0" }}><Text tone="secondary">Words that stand for the page's content. <a href="#alpha">Go to Alpha</a></Text></p>
    <h2 id="alpha" style={{ margin: "320px 0 8px", fontSize: 18 }}>Alpha</h2>
    <Text tone="secondary">Synthetic words under the heading the link names.</Text>
  </main>
);

const ownBar = (
  <header className="basalt-chrome basalt-sticky-bar" style={{ height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", boxSizing: "border-box" }}>
    <Text weight="semibold">Own bar</Text>
    <a href="#alpha">Alpha</a>
    <Button size="sm">Search</Button>
  </header>
);

// ---- 1. The skip link ----

function SkipLinkDemo({ state }: { state: string }) {
  const [where, setWhere] = React.useState("nothing yet");
  const ready = React.useCallback((doc: Document) => {
    const link = doc.querySelector<HTMLElement>(".basalt-skip-link");
    if (!link) return;
    const report = () => setWhere(doc.activeElement?.id ? `#${doc.activeElement.id}` : doc.activeElement?.tagName.toLowerCase() ?? "nothing");
    doc.addEventListener("focusin", report);
    if (state.startsWith("focused") || state.startsWith("followed")) link.focus();
    if (state.startsWith("followed")) link.click();
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 900 }}>
      {caption("The page below is a frame with its own document. The skip link is its first element: unseen at rest, at the page's top start once it has focus, over the bar, and following it moves focus to the page's main.")}
      <Frame height={220} label="A page with a skip link" onReady={ready}>
        <SkipLink target="main" id="skip-link" />
        <SiteHeader brand={<>{MARK}<span>Acme</span></>} brandLabel="Acme home" links={[{ href: "#alpha", label: "Alpha" }, { href: "#beta", label: "Beta" }]} />
        <main id="main" tabIndex={-1} style={{ padding: 24, outline: "none" }}><Text tone="secondary">Synthetic page. The first Tab shows the skip link.</Text></main>
      </Frame>
      {readout(`Focus is on: ${where}`)}
    </div>
  );
}

// ---- 2. Reserved room ----

const WORDINGS = ["Save", "Saving your changes…", "Saved"];
const KEYS = ["idle", "saving", "saved"] as const;
const ALTERNATIVES = { idle: WORDINGS[0], saving: WORDINGS[1], saved: WORDINGS[2] };

function ReserveRow({ show, reserved, neighbour }: { show: (typeof KEYS)[number]; reserved: boolean; neighbour: React.Ref<HTMLSpanElement> }) {
  return (
    <div style={{ ...row, flexWrap: "nowrap", gap: 8 }}>
      <Text as="span" tone="secondary" size="sm" style={{ minWidth: 72 }}>{show}</Text>
      {reserved ? <Reserve show={show} alternatives={ALTERNATIVES} /> : <span>{ALTERNATIVES[show]}</span>}
      <span ref={neighbour} style={{ border: "1px solid var(--basalt-border-input)", borderRadius: 6, padding: "2px 8px" }}>neighbour</span>
    </div>
  );
}

function ReserveDemo({ state }: { state: string }) {
  const [live, setLive] = React.useState<(typeof KEYS)[number]>(state.startsWith("second") ? "saving" : state.startsWith("third") ? "saved" : "idle");
  const withRoom = React.useRef<Array<HTMLSpanElement | null>>([]);
  const without = React.useRef<Array<HTMLSpanElement | null>>([]);
  const [moved, setMoved] = React.useState<{ withRoom: number[]; without: number[] } | null>(null);
  React.useLayoutEffect(() => {
    const xs = (list: Array<HTMLSpanElement | null>) => list.map((el) => Math.round((el?.getBoundingClientRect().left ?? 0) * 100) / 100);
    let live = true;
    // Measured once Geist has loaded (asked for by name: with no text yet set in it the file may not have started loading), so the numbers are Geist's whichever face paints first
    // (before Geist arrives the page paints in Geist Fallback, whose widths are close to Geist's and not the same).
    void Promise.all([document.fonts.load("400 14px Geist"), document.fonts.load("500 14px Geist")]).then(() => document.fonts.ready).then(() => {
      if (live) setMoved({ withRoom: xs(withRoom.current), without: xs(without.current) });
    });
    return () => { live = false; };
  }, []);
  const spread = (xs: number[]) => Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100;
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      {caption("One piece of text with three wordings, beside a fixed neighbour. Reserved, the cell is as wide as its widest wording and the neighbour stays put. Not reserved, it follows the words. The numbers are measured from this page.")}
      <div style={col}>
        <Text weight="medium">Reserved room</Text>
        {KEYS.map((key, i) => <ReserveRow key={key} show={key} reserved neighbour={(el) => { withRoom.current[i] = el; }} />)}
        {readout(moved ? `The neighbour's left edge at the three wordings: ${moved.withRoom.join(", ")}px. Movement: ${spread(moved.withRoom)}px.` : "Measuring…")}
      </div>
      <div style={col}>
        <Text weight="medium">The same words, not reserved</Text>
        {KEYS.map((key, i) => <ReserveRow key={key} show={key} reserved={false} neighbour={(el) => { without.current[i] = el; }} />)}
        {readout(moved ? `The neighbour's left edge at the three wordings: ${moved.without.join(", ")}px. Movement: ${spread(moved.without)}px.` : "Measuring…")}
      </div>
      <div style={col}>
        <Text weight="medium">Live</Text>
        <div style={{ ...row, flexWrap: "nowrap", gap: 8 }}>
          <Button variant="secondary" onClick={() => setLive((k) => KEYS[(KEYS.indexOf(k) + 1) % KEYS.length] ?? "idle")}>Change the words</Button>
          <Reserve show={live} alternatives={ALTERNATIVES} />
          <span style={{ border: "1px solid var(--basalt-border-input)", borderRadius: 6, padding: "2px 8px" }}>neighbour</span>
        </div>
        {readout(`Showing: ${live}. The unseen wordings are not in the accessibility tree, not focusable, not selectable and not found by find-in-page.`)}
      </div>
    </div>
  );
}

// ---- 3. An anchor under each of three bars ----

function AnchorFrame({ title, followed, children, height = 260 }: { title: string; followed: boolean; children: React.ReactNode; height?: number }) {
  const [landed, setLanded] = React.useState<string>("not followed");
  const ready = React.useCallback((doc: Document) => {
    if (!followed) return;
    const win = doc.defaultView;
    if (!win) return;
    const go = () => {
      const target = doc.getElementById("alpha");
      if (!target) return;
      doc.querySelector<HTMLAnchorElement>("a[href='#alpha']")?.click();
      // The landing is read after the browser has scrolled (the page's scroll-behavior is auto: it is immediate).
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => setLanded(`${Math.round(target.getBoundingClientRect().top * 100) / 100}px below the top of the page`)));
    };
    win.setTimeout(go, 50);
  }, [followed]);
  return (
    <div style={col}>
      <Text weight="medium">{title}</Text>
      <Frame height={height} label={title} onReady={ready}>{children}</Frame>
      {readout(`Alpha landed ${landed} (the bar is 56 high; the step is 16).`)}
    </div>
  );
}

function AnchorDemo({ state }: { state: string }) {
  const followed = state.startsWith("followed");
  return (
    <div style={{ ...col, maxWidth: 900 }}>
      {caption("Each frame is a page with a sticky bar and a long page under it. The link beside the bar's own is followed; the heading lands one step below the bar, 72px from the top, under all three.")}
      <AnchorFrame title="SiteHeader" followed={followed}>
        <SiteHeader brand={<>{MARK}<span>Acme</span></>} brandLabel="Acme home" links={[{ href: "#alpha", label: "Alpha" }]} />
        {PAGE_BODY}
      </AnchorFrame>
      <AnchorFrame title="AppHeader" followed={followed}>
        <AppShell
          brand={<>{MARK}<span>Workbench</span></>}
          brandMark={MARK}
          brandLabel="Workbench home"
          sidebar={<Nav aria-label="Primary"><NavItem href="#alpha" icon={HomeGlyph}>Home</NavItem><NavItem href="#beta" icon={MessagesGlyph}>Messages</NavItem></Nav>}
          header={<AppHeader title="Home" actions={<IconButton icon={SettingsGlyph} label="Switch theme" />} />}
        >
          {PAGE_BODY}
        </AppShell>
      </AnchorFrame>
      <AnchorFrame title="A page's own bar (class basalt-sticky-bar)" followed={followed}>
        {ownBar}
        {PAGE_BODY}
      </AnchorFrame>
    </div>
  );
}

export const ROUND_28: Round = {
  id: "28",
  title: "A skip link, reserved room and a page's own sticky bar",
  reviewed: false,
  summary:
    "The second engineering batch of the components stream (DECISIONS 133, 135): SkipLink, the HTML skill's skip link for React; Reserve, the room-for-changing-words helper that Terminal and Meter now share; and basalt-sticky-bar, which gives a page with its own sticky bar the landing clearance SiteHeader and AppHeader already had, with the Tab-into-the-bar claim measured and fixed. No rendered pixel that exists today changes. The owner has not yet approved the council's tally that these are engineering, and the design panel has not reviewed any of it.",
  steps: [
    {
      id: "skip-link",
      name: "A skip link",
      intro: "SkipLink: the first element of the page, unseen until it has focus, then at the top start over the bar. Following it moves focus to the page's main.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 520,
      decisions: [
        "Engineering, no vote: the HTML skill's .skip-link, drawn with the same tokens (space-2 from the top and start, space-2 and space-3 padding, radius sm, surface-3, primary ink, the toast layer, 44px tall on a coarse pointer, not printed). The skill's look includes the link underline and the focus ring.",
        "The app places it itself, as the first element of the page. AppShell and SiteHeader do not render one, and nothing about them changes.",
        "Finding, for the council: at 390 it lies over the start of the bar's brand link while it has focus (the skill's own place). axe's target-size rule reports that overlap.",
      ],
      tryIt: ["Press Tab once in the frame: the link appears over the bar.", "Press Enter: focus moves to the page's main, and the next Tab is the page's first control."],
      states: ["focused", "followed", "focused-forced-colours", "focused-reduced-motion"],
      demo: ({ state }) => <SkipLinkDemo state={state} />,
    },
    {
      id: "reserve",
      name: "Reserved room",
      intro: "Reserve: every wording a piece of text can take stands in one grid cell, so the cell holds its size and nothing beside it moves.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 760,
      decisions: [
        "Engineering, no vote: the technique Terminal and Meter already used, lifted into one helper with identical output. It draws nothing of its own. The caller lists the wordings.",
        "MultiSelect's count keeps its own form (two CSS-generated sizers, no text in the DOM): its group's description reads that element's text, and a test pins that.",
      ],
      tryIt: ["Press Change the words: the neighbour does not move.", "Select across the line and search the page for a wording that is not showing: it is not there."],
      states: ["second", "third", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <ReserveDemo state={state} />,
    },
    {
      id: "anchor",
      name: "An anchor under a sticky bar",
      intro: "A page that draws its own sticky bar marks it basalt-sticky-bar and gets the clearance SiteHeader and AppHeader have: the bar's height plus space-4, from one property.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 1160,
      decisions: [
        "Engineering, no vote: foundations already says a page with a bar sets scroll-padding-top to the sticky offset plus space-4. The landing for SiteHeader and AppHeader is unchanged, and now a page's own bar gets it.",
        "The Tab claim from Blacksand's site is true: with the padding alone, a Tab into the bar from a scrolled page scrolled the page. The bar's contents now take a scroll margin as deep as the padding; the page holds still and the landing is unchanged. The app sidebar's brand and first row still scroll the page a little (it scrolls its own list, so it is not in the rule).",
      ],
      tryIt: ["Press Go to Alpha in each frame: the heading lands 72px below the top, under every bar."],
      states: ["followed", "followed-forced-colours", "followed-reduced-motion"],
      demo: ({ state }) => <AnchorDemo state={state} />,
    },
  ],
};
