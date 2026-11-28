// Round 90: micro-details m7, navigation, scroll and history (DECISIONS 405 and 409; decided by Fable with Astra, Muse and Neon). No shipped part's pixels
// change, so there is no before and after: the list's band in its new link form beside its button form (the same geometry), the phone pager's focus landing
// on the next document at 390 (real documents in a frame, the browser doing the landing from the fragment), and a link into a hidden tab panel in the HTML
// skill (a real click; the panel is shown before the browser goes to the target). What changes no pixel (route focus, scroll restoration, the shell's
// overscroll, the drawer's focus return) is listed as code. Built by Opus; the implementation has not been reviewed; the tests are written and not run
// (DECISIONS 359). Synthetic data in unlike domains: a seed library's lots and a tide gauge's readings.

import * as React from "react";

import { CodeBlock, ListBand } from "../../packages/react/src/index";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-10)", minWidth: 0 };
const NOT_REVIEWED = "Decided by the council (Fable deciding; Astra, Muse and Neon; DECISIONS 405 and 409, a handoff); the implementation has not been reviewed. The tests are written and not run (DECISIONS 359).";

function useRootTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, read, () => "dark");
}

// ---- The band in both forms

function Rows({ word, page, size }: { word: string; page: number; size: number }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} style={{ minHeight: "var(--basalt-space-10)", display: "flex", alignItems: "center", borderBottom: "var(--basalt-size-hairline) solid var(--basalt-border-divider)" }}>{word} {(page - 1) * size + i + 1}</li>
      ))}
    </ul>
  );
}

function Band({ form, id, noun, word, total }: { form: "links" | "buttons"; id: string; noun: string; word: string; total: number }) {
  const [page, setPage] = React.useState(2);
  const [size, setSize] = React.useState(25);
  const links = form === "links";
  return (
    <ListBand
      id={id}
      total={total}
      page={page}
      pageSize={size}
      noun={noun}
      backToTop={false}
      onPageSizeChange={(next, at) => { setSize(next); setPage(at); }}
      // The link form's pages are real links (`?page=N`); here the band's router is the demo's own state, so the walkthrough page never navigates.
      {...(links ? { hrefForPage: (p: number) => `?page=${p}`, onNavigate: (_href: string, p: number) => setPage(p) } : { onPageChange: setPage })}
    >
      <Rows word={word} page={page} size={size} />
    </ListBand>
  );
}

function BandForms() {
  return (
    <div style={stack}>
      <div>
        <p style={label}>Seed lots, the link form: every page and arrow is a link (hrefForPage), its plain press sent to the app (onNavigate)</p>
        <Band form="links" id="r90-lots-links" noun="Seed lots" word="Lot" total={214} />
      </div>
      <div>
        <p style={label}>Seed lots, the button form (as shipped): the same band, the same seats, the same row</p>
        <Band form="buttons" id="r90-lots-buttons" noun="Seed lots" word="Lot" total={214} />
      </div>
      <div>
        <p style={label}>Tide readings, the link form</p>
        <Band form="links" id="r90-tides-links" noun="Readings" word="Reading" total={9_480} />
      </div>
    </div>
  );
}

// ---- Framed documents: the phone pager's landing, and the skill's hidden tab

function Frame({ page, height, title, press }: { page: string; height: number; title: string; press?: boolean }) {
  const theme = useRootTheme();
  const source = React.useMemo(() => (__SKILL_PAGES__[page] ?? "").replaceAll("__THEME__", theme).replace("__PRESS__", press ? "yes" : "no"), [page, theme, press]);
  // A shot waits for the framed document to load and act (land on its fragment, or take the click) before it is taken.
  const loaded = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const host = window as unknown as { __BASALT_READY__?: Promise<void> };
    host.__BASALT_READY__ = new Promise<void>((resolve) => { loaded.current = () => { let n = 4; const step = () => (--n ? requestAnimationFrame(step) : resolve()); requestAnimationFrame(step); }; });
  }, [source]);
  return (
    // sink: a page this round's build wrote at review-build time from synthetic data (round90-pages.mjs); the frame runs its own small script
    // oxlint-disable-next-line react/iframe-missing-sandbox -- a page built at review-build time from synthetic data; the frame runs its own script
    <iframe title={title} srcDoc={source} onLoad={() => loaded.current()} style={{ width: "100%", height, border: 0, display: "block", background: "var(--basalt-surface-page)" }} />
  );
}

function Landing({ state }: { state: string }) {
  const page = state === "foot" ? "90-seeds-foot" : state === "last" ? "90-tides-last" : "90-seeds-landed";
  const words = state === "foot"
    ? <>Page 1, before the press: the foot's Next has focus. Its link is <span style={{ whiteSpace: "nowrap" }}>?page=2#lots-pager-next</span></>
    : state === "last"
      ? "Tide readings, the last page, opened from the foot's Next on page 2: the band's Next is at its end (aria-disabled) and still takes the focus"
      : "Page 2, a new document opened from the foot's Next: the browser scrolled to the fragment and focused the band's own Next; the band's top is on the bar's lower edge, the first row under it";
  return (
    <div>
      <p style={{ ...label, paddingInline: "var(--basalt-space-4)", paddingTop: "var(--basalt-space-2)" }}>{words}</p>
      <Frame page={page} height={844} title="A list's next page, opened from its foot" />
    </div>
  );
}

function HiddenTab({ state }: { state: string }) {
  const pressed = state === "linked";
  return (
    <div>
      <p style={label}>{pressed ? "After a real click on “the surge notes”: This year is chosen at the click, and the browser lands on the heading inside it by its own scroll and scroll padding" : "Before the press: the link names a heading inside This year, which is hidden"}</p>
      <Frame page="90-tabs" height={620} title="A link into a hidden tab panel" press={pressed} />
    </div>
  );
}

// ---- What changes no pixel

const QUIET = `// Route focus: a pop never scrolls and keeps the focus the app gave back.
useRouteFocus({ key: page.id, title, target: titleRef, navigation: router.action /* "push" | "replace" | "pop" */ });

// A pane the app mounts again on Back, or a window whose rows arrive late.
useScrollRestore({ entry: location.key, navigation: router.action, scroller: usePaneScroller(), id: "details" });
useScrollRestore({ entry: location.key, navigation: router.action, ready: !loading });

// Pages as links; a plain press goes to the router, a modified press to the browser.
<Pagination id="lots" page={page} pageCount={9} hrefForPage={(p) => "?page=" + p} onNavigate={(href) => router.push(href)} />
<ListBand id="lots" hrefForPage={(p) => "?page=" + p} onPageSizeChange={(size, page) => replace({ size, page })} … />

// The drawer returns focus to where it came from, or to finalFocus.
<Drawer label="The lot and its tests" open={open} finalFocus={headingRef}>…</Drawer>

/* An app shell's document does not bounce on the block axis under a mouse or trackpad. */
@media (pointer: fine) { :root:has(.basalt-app-shell) { overscroll-behavior-y: none; } }
@media (any-pointer: coarse) { :root:has(.basalt-app-shell) { overscroll-behavior-y: auto; } }

<!-- The HTML skill: an event, two calls, and a mirror by replace. -->
<div data-tabs data-tabs-hash> … </div>   tabchange · Basalt.selectTab(id) · Basalt.setFilter(filter, values)`;

export const ROUND_90: Round = {
  id: "90",
  title: "Micro-details m7: navigation, scroll and history",
  reviewed: false,
  summary:
    "The council's m7 decision (DECISIONS 405 and 409), built in React and the HTML skill. Basalt adds no router and no component writes history; it closes two gaps in the seam it has (controlled values and real links). The list's band can draw its pages as real links (hrefForPage, with onNavigate for a router), and a followed link in its foot names the band's own arrow, so the next document opens at the band with that arrow focused, by the browser alone. The skill's tabs follow a fragment on load, at a same-page link's click and on Back and Forward. Route focus learns how a page was reached (a pop never scrolls), useScrollRestore puts back a pane the browser cannot, the drawer returns focus, and an app shell's document stops bouncing under a mouse or trackpad: none of these paints, so they are listed as code. No shipped part's pixels change, so there is no before and after.",
  steps: [
    {
      id: "band-links",
      name: "The list's band: the pages as links",
      intro: "The same band in the link form and in the button form, in two lists. The link form draws Pagination's existing link pager (decisions 138 and 139): no new style. The band's row height, seats, held seat and foot measure the same in both forms (the test measures them at 1440 and 390, fine and coarse).",
      decisions: [
        "Interception is its own prop, onNavigate (LinkTabs' name for the same job): with hrefForPage alone the browser follows the links and the band remembers nothing, since a press it remembered could not cross a document load.",
        "onPageSizeChange is also given the page that holds the reader's first row, so an app that writes the address does both in one replace.",
        "The link's own box against the button's (main's comment says a button is 4px wider) is main's, and is logged as a gap, not changed here.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press Next in each band, then change the page size: the link form and the button form behave alike.", "In the link form, ⌘-click (or Ctrl-click) a page: it is the browser's, a new tab."],
      widths: [1440, 390],
      touch: true,
      height: 760,
      heights: { "default@390": 900 },
      demo: () => <BandForms />,
    },
    {
      id: "landing",
      name: "The phone pager's focus landing at 390",
      intro: "Real documents in a frame, server-rendered with no client router and no Basalt script. The foot's followed Next carries the band arrow's id as its fragment (?page=2#lots-pager-next); the next document opens there and the browser scrolls it clear of the bar and focuses it. The arrow's scroll margin (−space-2) puts the band's top on the bar's lower edge, where the band rests.",
      decisions: [
        "Measured across a real document load at 390 (fine and coarse, a middle and the last page): focus on the band's Next, the band's top at 55.875 against the bar's 56.",
        "The fragment is an anchor, not focus state: pasted, the address opens that page of the list at the list. With onNavigate no fragment is added; the band's memory does the handoff.",
        "The band's own links still open the next document at its top (decided). From 720 the same fragment would keep a stuck band under the pointer: logged as a gap, not built.",
        "Not shown on other engines: where one only moves the Tab starting point to the arrow, the next Tab still continues from the band.",
        NOT_REVIEWED,
      ],
      tryIt: ["Compare the three frames: the press on page 1, the landing on page 2, and the last page's arrow at its end."],
      states: ["foot", "last"],
      widths: [390],
      bleed: true,
      height: 920,
      demo: ({ state }) => <Landing state={state} />,
    },
    {
      id: "hidden-tab",
      name: "A link into a hidden tab panel (the HTML skill)",
      intro: "A link to a heading inside a hidden panel. The tabs module hears the click on the document, before the browser goes to the target, and shows the panel; the browser then pushes its entry, scrolls with the page's own scroll padding, and moves :target and focus. Back and Forward select without scrolling, so the browser's restored place stands.",
      decisions: [
        "There is no test of \"was this a traversal\": a link fires popstate too (Neon's measurement), so the panel is shown at the click, and popstate and hashchange only select.",
        "The script's one scroll is a cold load's onto a target in a panel, at once, and only on a new navigation, never on a reload or a traversal.",
        "data-tabs-hash mirrors the chosen panel into the fragment by replace: Right, Right, Home leaves history's length as it was.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press the link, then Back: the panel stays and the place is the browser's."],
      states: ["linked"],
      widths: [1440, 390],
      touch: true,
      height: 700,
      demo: ({ state }) => <HiddenTab state={state} />,
    },
    {
      id: "quiet",
      name: "What changes no pixel (no picture: the API)",
      intro: "Route focus, scroll restoration, the drawer's focus return, the shell's overscroll and the skill's calls change behaviour and paint nothing.",
      decisions: [
        "A pop never scrolls and takes focus only when nothing has it, once any popup has gone; a push or a replace lands on a hash target before the top, at once in every mode.",
        "useScrollRestore keys a position by the history entry and the scroller; every entry has one, zero included; a scroller that is not there yet is waited for and never the window.",
        "Not verified on hardware: the overscroll rule on a physical trackpad and on a laptop with a touch screen, and on the root in Safari.",
        NOT_REVIEWED,
      ],
      tryIt: ["Read the calls: each takes the router's own action and entry key, and none writes the address."],
      widths: [1440, 390],
      height: 900,
      demo: () => <CodeBlock title="m7" language="tsx" code={QUIET} />,
    },
  ],
};
