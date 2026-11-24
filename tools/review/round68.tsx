// Round 68: versions, changelogs and release notes (DECISIONS 320, revised by 321; the owner's answers in 308, 315 and 318). A heavy council round on the owner's
// standard and his answers to Opus's prototype, checked by Astra and decided by Fable, who revised eight objections after the final positions. Built by Opus
// from the decision; the implementation has not been reviewed. Every fact on these pages is made up: a package ("Slate") and a product ("Harbor"), their
// versions, dates, pull requests, tickets, authors and commits, built by running tools/changelog over two invented histories (tools/changelog/fixtures).
// Nothing here is Basalt's or CIMIP's history, and nothing publishes a version.

import * as React from "react";

import {
  AppHeader,
  AppShell,
  HomeGlyph,
  Nav,
  NavItem,
  PaneLayout,
  ReleaseIndex,
  ReleaseNotes,
  SearchGlyph,
  SettingsGlyph,
  SiteFooter,
  SitePage,
  TabBar,
  TabBarItem,
  TabBarMore,
  VersionLink,
} from "../../packages/react/src/index";
import type { ReleaseRecord } from "../../packages/react/src/index";
import harborCandidate from "../changelog/fixtures/harbor/releases-candidate.json";
import harborData from "../changelog/fixtures/harbor/releases.json";
import slateData from "../changelog/fixtures/slate/releases.json";
import { PICTURES } from "./assets/round-68/index";
import type { Round } from "./rounds";

const HARBOR = harborData as unknown as ReleaseRecord[];
/** Harbor before 2.0.0 shipped: its two candidates drawn, the session on 2.0.0-rc.2. */
const HARBOR_CANDIDATE = harborCandidate as unknown as ReleaseRecord[];
const SLATE = slateData as unknown as ReleaseRecord[];
/** What a running Harbor build says of itself (made up): Build details, never read from a release's record. */
const COMMITS: Record<string, string> = { "1.4.0": "9f3c1e2a7d04", "1.4.2": "c07a51e9b3d2", "2.0.0-rc.2": "4b1d0e7f2a96" };
const buildOf = (running: string) => [{ label: "Build", value: `${running}+${COMMITS[running]!.slice(0, 7)}`, mono: true }, { label: "Commit", value: COMMITS[running]!, mono: true }, { label: "Basalt", value: "0.2.0", mono: true }];
const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours|more-contrast)$/, "");

/** After the page has drawn, press what a state opens: a fold, a source line, More. */
function usePress(selectors: string[]) {
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const selector of selectors) for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) el.click();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [selectors.join("|")]);
}

// ---- a product: Harbor's app shell, the version at its foot, the release notes as its page ----

function Harbor({ state, page = "notes" }: { state: string; page?: "home" | "notes" }) {
  const kind = kindOf(state);
  const candidate = kind.startsWith("candidate") || kind === "pre-release";
  const running = kind === "between" ? "1.4.2" : candidate ? "2.0.0-rc.2" : "1.4.0";
  const date = kind === "between" ? "2026-12-09" : candidate ? "2026-12-03" : "2026-11-23";
  const releases = kind === "pre-release" ? HARBOR_CANDIDATE : HARBOR;
  const notes = page === "notes";
  const press: string[] = [];
  if (kind === "all") press.push('[id="v1.4.0"] .basalt-accordion-trigger:not([data-panel-open])');
  if (kind === "build") press.push('[id="v1.4.0"] .basalt-release-build .basalt-accordion-trigger:not([data-panel-open])');
  if (kind === "other") press.push('[id="v1.3.0"] .basalt-accordion-trigger:not([data-panel-open])');
  if (kind === "pre-release") press.push('[id="v2.0.0-rc.2"] .basalt-accordion-trigger:not([data-panel-open])');
  if (kind.endsWith("more")) press.push(".basalt-tabbar-more");
  usePress(press);
  React.useEffect(() => {
    const at = kind === "other" ? "v1.3.0" : kind === "all" ? "v1.4.0" : kind === "build" ? "v1.4.0" : null;
    if (at) window.setTimeout(() => { const el = document.getElementById(at); el?.querySelector(kind === "build" ? ".basalt-release-build" : ".basalt-release-head")?.scrollIntoView({ block: kind === "build" ? "center" : "start" }); }, 400);
  }, [kind]);
  // The "hover" state rests a real pointer on the version in the rail (the attribute is a prop, so the rail's tooltip, which arrives on demand, keeps it).
  const version = <VersionLink version={running} date={date} href={`#v${running}`} current={notes} {...(kind === "hover" ? { "data-wt-hover": "" } : {})} />;
  return (
    <AppShell
      brand={<span style={{ fontWeight: 600, fontSize: 18 }}>Harbor</span>}
      brandMark={<span style={{ fontWeight: 600, fontSize: 18 }}>H</span>}
      brandLabel="Harbor home"
      sidebar={<Nav aria-label="Primary"><NavItem href="#home" icon={HomeGlyph} current={!notes}>Home</NavItem><NavItem href="#incidents" icon={SearchGlyph}>Incidents</NavItem></Nav>}
      account={<Nav aria-label="Account"><NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem></Nav>}
      version={version}
      header={<AppHeader title={notes ? "Release notes" : "Home"} />}
      tabBar={(
        <TabBar>
          <TabBarItem href="#home" icon={HomeGlyph} current={!notes}>Home</TabBarItem>
          <TabBarItem href="#incidents" icon={SearchGlyph}>Incidents</TabBarItem>
          <TabBarMore current={notes ? "Release notes" : undefined}><NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem></TabBarMore>
        </TabBar>
      )}
    >
      {notes ? (
        <ReleaseNotes releases={releases} form="notes" product="Harbor" running={running} runningBuild={buildOf(running)} baseHref="https://harbor.example/release-notes" arrived={kind === "arrived" ? "pr131-1" : null} />
      ) : (
        <p style={{ margin: 0, maxWidth: "var(--basalt-size-prose-width)", fontSize: 16, lineHeight: "24px", color: "var(--basalt-text-secondary)" }}>Two incidents are open. The version at the sidebar's foot is at rest here: another page is current.</p>
      )}
    </AppShell>
  );
}

// ---- a package: Slate's changelog on a site page, the versions beside it, the version in the footer ----

function Slate({ state }: { state: string }) {
  const kind = kindOf(state);
  const press: string[] = [];
  if (kind === "sources") press.push('[id="pr41-1"] .basalt-release-source');
  if (kind === "sources-none") press.push('[id="pr42-1"] .basalt-release-source');
  if (kind === "versions") press.push(".basalt-release-index[data-form=\"fold\"] .basalt-accordion-trigger");
  usePress(press);
  React.useEffect(() => {
    const at = kind === "sources" ? "pr41-1" : kind === "sources-none" ? "pr42-1" : kind === "action" ? "v0.2.0__action" : kind === "footer" ? "slate-footer" : null;
    if (at) window.setTimeout(() => document.getElementById(at)?.scrollIntoView({ block: kind === "footer" ? "end" : "start" }), kind.startsWith("sources") ? 0 : 200);
  }, [kind]);
  const arrived = kind === "arrived" ? "pr49-1" : kind === "release-arrived" ? "v0.2.0" : null;
  return (
    <SitePage>
      <main style={{ boxSizing: "border-box", width: "100%", maxWidth: "var(--basalt-size-page-width)", margin: "0 auto", padding: "48px var(--basalt-gutter) calc(var(--basalt-section-gap) / 2)", "--basalt-edge-room": "var(--basalt-gutter)" } as React.CSSProperties}>
        <h1 style={{ margin: "0 0 12px", fontSize: 36, lineHeight: "40px", fontWeight: 600 }}>Changelog</h1>
        <p style={{ margin: "0 0 8px", maxWidth: "var(--basalt-size-prose-width)", fontSize: 18, lineHeight: "28px", color: "var(--basalt-text-secondary)" }}>Every version of <code className="basalt-inline-code">@example/slate</code> and <code className="basalt-inline-code">@example/slate-tokens</code>. The two packages share one version number.</p>
        <p style={{ margin: "0 0 40px", fontSize: 13, lineHeight: "18px", color: "var(--basalt-text-secondary)" }}>To see the version you have installed, run <code className="basalt-inline-code">npm ls @example/slate</code>.</p>
        <PaneLayout pane={<ReleaseIndex releases={SLATE} />} paneLabel="Versions">
          <ReleaseIndex releases={SLATE} form="fold" />
          <ReleaseNotes releases={SLATE} form="reference" product="Slate" baseHref="https://slate.example/changelog" arrived={arrived} />
        </PaneLayout>
      </main>
      <SiteFooter id="slate-footer" brand={<span style={{ fontWeight: 600, fontSize: 18 }}>Slate</span>} note="Slate is a made-up design system for these pictures." legal="© 2026 Example" version={<VersionLink label="Slate" version="0.2.1" date="2026-11-16" href="#v0.2.1" />} />
    </SitePage>
  );
}

// ---- for the owner's eye: each item, this build's pictures beside the prototype's (tools/review/round68-pairs.mjs writes them) ----

const ITEMS: Array<{ id: string; title: string; words: string; extra?: string; noProto?: string }> = [
  { id: "1", title: "1. The foot's line", words: "\"Version 1.4.0 · Nov 23, 2026\" in the interface's own type (12/16 Geist) and secondary ink, at rest (Home current), and current on the release notes (primary, the number at 600). The prototype's B was small mono in the quietest ink, without a date. Below: the decision's three ways (A the number in mono, B plain, C with the word, decided), with a candidate and a canary.", extra: "The three ways (decision proofs, foot-options)" },
  { id: "2", title: "2. The rail", words: "720 to 1023: the number alone, centred, its whole line in its name and its tooltip; a release candidate fits.", noProto: "The prototype drew nothing in the rail." },
  { id: "3", title: "3. More's last row", words: "Under 720 the version is More's last row, under a divider, 44 tall, at 13/18, at rest and current." },
  { id: "4", title: "4. Nothing marks a release as new", words: "No dot, no badge, no read state, no \"What's new\" item. The prototype marked the sidebar, the settings button and its menu until the release was seen." },
  { id: "5", title: "5. Deprecated and Removed before Added", words: "Action needed, Security, Deprecated, Removed, Added, Changed, Fixed. In the prototype a 31-line Added stood above the deprecation." },
  { id: "6", title: "6. One set of section names", words: "A product's list uses Added, Changed and Fixed, as a package's does, inside one fold with the summary." },
  { id: "7", title: "7. No area filter", words: "The first screen starts with the first release. In the prototype the filter took the first screen and could hide every breaking change." },
  { id: "8", title: "8. 0.x", words: "In 0.x the minor is the breaking number: Slate 0.2.0 holds four breaking changes and is a minor from 0.1.0; a fix the same day is 0.2.1.", noProto: "Words are enough for the rule." },
  { id: "9", title: "9. Entries are Basalt's own files, not changesets", words: "One file per change in .changes/, with its type, area, pull request, tickets, bump, action and author. A changeset's head maps packages to bumps and has no field for a type, tickets, action or a permanent id.", noProto: "Words are enough." },
  { id: "10", title: "10. The source line underlined", words: "\"#41 · SL-112 · PRJ-88\" is the quiet text button Basalt already has, beside the words from 640 of the release's width and under them on a phone. The prototype's was bare tertiary text." },
  { id: "11", title: "11. No Decision row, install command, \"How it was made\" or About sheet", words: "Sources holds the pull request, the tickets, the commit and the author when there is one; nothing else." },
  { id: "12", title: "12. Author only when someone claimed the words", words: "#41 (Sam Rivera wrote it) has an Author row; #42 (nobody has claimed it) has none." },
  { id: "13", title: "13. Build details on \"Your version\"", words: "On the release this session runs, from the running build; above the first release when the running build is between two releases." },
];

function useTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] }); return () => watch.disconnect(); }, read, () => "dark");
}

/** The pictures of one side of an item, each at its own size (never scaled to a column), or null. */
function Pictures({ id, side, theme, label }: { id: string; side: string; theme: string; label: string }) {
  const list = Object.keys(PICTURES).filter((key) => key.startsWith(`${id}-${side}-`) && key.endsWith(`-${theme}`)).sort();
  if (!list.length) return null;
  return (
    <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
      {list.map((key) => <img key={key} src={PICTURES[key]!.src} alt={`${label}, item ${id}`} style={{ display: "block", width: PICTURES[key]!.width, maxWidth: "100%", height: "auto", borderRadius: 8, boxShadow: "0 0 0 1px var(--basalt-border-hairline)" }} />)}
    </div>
  );
}

/** The widest picture of one side of an item, in CSS pixels. */
const widest = (id: string, side: string, theme: string) => Math.max(0, ...Object.keys(PICTURES).filter((key) => key.startsWith(`${id}-${side}-`) && key.endsWith(`-${theme}`)).map((key) => PICTURES[key]!.width));

/**
 * One item: its words, then this build's pictures beside the prototype's. Each picture is drawn at its own size, so a pair is at one scale; the two
 * sides stand side by side where both fit the stage, and one above the other where they do not (a side is as wide as its widest picture).
 */
function Item({ item, theme }: { item: (typeof ITEMS)[number]; theme: string }) {
  const label = { margin: "0 0 8px", fontSize: 13, lineHeight: "18px", fontWeight: 500, color: "var(--basalt-text-secondary)" } as const;
  const side = (name: string) => ({ flex: "0 1 auto", width: Math.max(widest(item.id, name, theme), 240), maxWidth: "100%", minWidth: 0 });
  return (
    <section aria-labelledby={`item-${item.id}`} style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 id={`item-${item.id}`} style={{ margin: "0 0 4px", fontSize: 18, lineHeight: "26px", fontWeight: 600 }}>{item.title}</h2>
        <p style={{ margin: 0, maxWidth: 720, fontSize: 14, lineHeight: "20px", color: "var(--basalt-text-secondary)" }}>{item.words}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={side("build")}><p style={label}>This build</p>{item.id === "9" ? <p style={{ margin: 0, fontSize: 14 }}>Words are enough.</p> : <Pictures id={item.id} side="build" theme={theme} label="This build" />}</div>
        <div style={side("proto")}><p style={label}>The prototype</p>{item.noProto ? <p style={{ margin: 0, fontSize: 14 }}>{item.noProto}</p> : <Pictures id={item.id} side="proto" theme={theme} label="The prototype" />}</div>
      </div>
      {item.extra ? <div><p style={label}>{item.extra}</p><Pictures id={item.id} side="extra" theme={theme} label={item.extra} /></div> : null}
    </section>
  );
}

/** The step's default view draws all thirteen items down the page; a state "item-N" draws item N alone (the shot tool's view of it). */
function OwnersEye({ state }: { state: string }) {
  const theme = useTheme();
  const items = state.startsWith("item-") ? ITEMS.filter((candidate) => candidate.id === state.slice(5)) : ITEMS;
  return (
    <div style={{ padding: 24, display: "grid", gap: 48, color: "var(--basalt-text-primary)" }}>
      {items.map((item) => <Item key={item.id} item={item} theme={theme} />)}
    </div>
  );
}

const COMMON = [
  "Decided by the council (DECISIONS 320, revised by 321 after the final positions; the owner's answers are 308, 315 and 318). The owner sees this PR before it merges; the implementation has not been reviewed.",
  "Every fact is made up: Slate (a package) and Harbor (a product), their versions, dates, pull requests, tickets, authors and commits, written by running tools/changelog over two invented histories. Nothing publishes a version of Basalt or CIMIP.",
];

const WIDE = [1440, 820, 390];

export const ROUND_68: Round = {
  id: "68",
  title: "Versions, changelogs and release notes (DECISIONS 320, 321)",
  reviewed: false,
  summary:
    "The version with its ship date at the sidebar's foot, in the rail, as More's last row and in a site's footer (VersionLink); a package's changelog and a product's release notes from one record (ReleaseNotes, ReleaseIndex), with Action needed, the audience paragraphs, the folds, the source line and its Sources panel, Build details on the running release, and arriving at a release or an entry. Built by Opus from the council's decision (DECISIONS 320, revised by 321); the implementation has not been reviewed. Shot in both themes at 1440, 820 and 390 (the phone with touch). Every fact on the pages is made up.",
  steps: [
    {
      id: "foot",
      name: "The version at the foot",
      intro: "A product's shell: the version this session runs, with its ship date, as one link to the release notes at that version. At rest on Home (another page is current), and current on the release notes (the \"current\" shots).",
      decisions: [
        ...COMMON,
        "For the owner's eye 1: \"Version 1.4.0 · Nov 23, 2026\" in the interface's own type (12/16 Geist, tabular) and secondary ink, where the prototype's option B was small mono in the quietest ink and had no date. In mono the line fits 1.4.0 with 3px to spare and wraps at 1.4.10 or any pre-release; mono's digits also read \"1 . 4 . 0\". With \"What's new\" gone this is the only way to the notes, so it steps up one ink.",
        "For the owner's eye 2: in the rail (720 to 1023) the number alone, centred; the label and date are in its name and its tooltip (the \"hover@820\" shot). A release candidate breaks before its hyphen (the \"candidate\" shots).",
        "For the owner's eye 3: under 720 it is More's last row, under a divider, 44 tall, at 13/18 (the \"more@390\" shot). An app with no More draws it on its account or settings page.",
        "For the owner's eye 4: nothing marks a release as new. No dot, no badge, no read state, no \"What's new\" item. A release that asks something of people says so where they work, by the product's choice.",
        "At rest (the default shots, Home current): secondary ink at 400. On the release notes it is the current page (the \"current\" shots): primary ink and the number at 600, its width reserved, so nothing moves.",
      ],
      tryIt: [
        "Narrow the window through 1023 and 720: the foot's line, the rail's number with its tooltip, then More's last row.",
        "Tab to the version: one link, named \"Version 1.4.0, Nov 23, 2026, release notes\".",
      ],
      states: ["more@390", "hover@820", "current@1440", "current@820", "current-more@390", "candidate@1440", "candidate@820"],
      widths: WIDE,
      scales: [2],
      bleed: true,
      touch: true,
      height: 900,
      demo: ({ state }) => <Harbor state={state} page={kindOf(state).startsWith("current") ? "notes" : "home"} />,
    },
    {
      id: "release-notes",
      name: "A product's release notes",
      intro: "Harbor's release notes: a headline, Action needed when a release asks something of its people, a paragraph for each audience, then one fold holding the summary and a line per change.",
      decisions: [
        ...COMMON,
        "The header: the number and the date first, in Geist (the foot's case), then the headline, then the counts computed from the list and the outline badges \"Pre-release\" and \"Your version\". One heading holds them, so a reader moving by headings hears \"1.4.0, Nov 23, 2026: A monitor can open an incident room\".",
        "The fold is named for what it opens: \"All changes 5\" when every entry is inside it, \"Other changes 1\" under Action needed (Harbor 1.3.0, the \"other\" shots). The header keeps the release's totals.",
        "For the owner's eye 6: a product's list uses the package's section names (Added, Changed, Fixed), not \"Improvements\" and \"Fixes\"; the paragraphs above carry the product's voice.",
        "For the owner's eye 13: Build details is on \"Your version\" alone and shows the running build (1.4.0+9f3c1e2, its commit, the Basalt it was built on), never a row frozen with a release: two builds can share a version. A build between two releases puts it above the first release (the \"between\" shot).",
        "2.0.0 shipped after two candidates: they are no longer drawn, and their addresses open 2.0.0. 1.4.1, a fix to the 1.x line shipped after 2.0.0, stands under it by SemVer precedence, not by date. The \"pre-release\" shots are Harbor before 2.0.0 shipped, the session on 2.0.0-rc.2: \"Pre-release\" and \"Your version\" on one release, each the neutral outline badge.",
      ],
      tryIt: [
        "Open \"All changes\": the summary, then Added, Changed and Fixed, each with its source line.",
        "Press a source line: Sources, with the pull request, the ticket, the commit, and the author where the entry has one.",
        "Find \"lobby\" with the browser's find: the fold opens.",
      ],
      states: ["all", "other", "build@1440", "build@390", "between@1440", "pre-release@1440", "pre-release@390", "arrived", "forced-colours@1440"],
      widths: WIDE,
      scales: [2],
      bleed: true,
      touch: true,
      height: 900,
      demo: ({ state }) => <Harbor state={state} />,
    },
    {
      id: "changelog",
      name: "A package's changelog",
      intro: "Slate's changelog: every version, the list open, Unreleased on top, the versions beside it (a fold above it on a narrow page), and the version in the footer.",
      decisions: [
        ...COMMON,
        "For the owner's eye 5: Deprecated and Removed come before Added, in every output (page, CHANGELOG.md, GitHub Release): Action needed, Security, Deprecated, Removed, Added, Changed, Fixed. His order had them after Changed, where a long Added buried a deprecation.",
        "For the owner's eye 7: no area filter. Every entry carries its area as its first word, Added and Changed never fold, and the browser's find opens Fixed, so \"Tokens:\" in find-in-page is the filter.",
        "For the owner's eye 8: in 0.x the minor is the breaking number and the patch everything else; the tool refuses a version that understates its entries. Slate 0.2.0 has four breaking changes, so it is a minor from 0.1.0; 0.2.1 the same day is a fix.",
        "For the owner's eye 10: the source line is underlined (the quiet text button Basalt already has), where the prototype's was bare tertiary text: \"#41 · SL-112 · PRJ-88\", at most two tickets then \"3 more\". From 640 of the release's own width it stands beside the words in one column, so the words keep one measure down a list; under it, it is its own line.",
        "Only Fixed folds, past 3 in a release of more than 10. Action needed opens with \"Before upgrading from 0.1.0, check these 4 changes.\", computed.",
      ],
      tryIt: [
        "Press \"4 need action\": the page moves to the callout.",
        "Open a version from the Versions list: its address is #v0.2.1, and Back returns.",
        "Narrow the page under 920: the Versions pane becomes a fold above the first release.",
      ],
      states: ["action", "versions@390", "footer", "forced-colours@1440", "more-contrast@1440"],
      widths: WIDE,
      scales: [2],
      bleed: true,
      touch: true,
      height: 900,
      demo: ({ state }) => <Slate state={state} />,
    },
    {
      id: "sources",
      name: "Sources and arriving",
      intro: "The source line opens Sources; an entry's or a release's address is permanent, and the one a link opens is marked as the stream marks the entry you came to.",
      decisions: [
        ...COMMON,
        "For the owner's eye 11: no \"Decision\" row, no install command, no \"How it was made\", no About sheet, no \"Built by\" or \"Code review\".",
        "For the owner's eye 12: Author is shown only when someone wrote the entry's words or said they take authorship of them (\"sources\": Sam Rivera on Slate's #41); an entry nobody has claimed has no Author row (\"sources-none\"). Most of Basalt's entries are drafted by agents, so most will show none until the owner says so for an entry.",
        "For the owner's eye 9: entries are Basalt's own files (.changes/<id>.md), not changesets: a changeset's head maps packages to bumps and has no field for a type, tickets, action or a permanent id. Its ticket ids are read from the entry's own tickets field and nowhere else.",
        "Arriving at #pr49-1 opens the closed Fixed fold and marks the entry: the plate and \"Linked\", until the reader presses or types (\"arrived\"). A release takes the plate on its header (\"release-arrived\"). In forced colours the plate goes and the word stays.",
      ],
      tryIt: [
        "Press a source line, then Tab: the panel ends in Copy link to this change; Escape returns to the line.",
        "Open the page at #pr49-1, then press anywhere: the mark goes and focus stays.",
      ],
      states: ["sources", "sources-none", "arrived", "release-arrived", "arrived-forced-colours@1440"],
      widths: [1440, 390],
      scales: [2],
      bleed: true,
      touch: true,
      height: 900,
      demo: ({ state }) => <Slate state={state} />,
    },
    {
      id: "owners-eye",
      name: "For the owner's eye",
      intro: "The thirteen items the decision puts in front of the owner, each as this build's pictures beside the prototype's he answered, in the walkthrough's theme, all thirteen down the page. Each picture is at its own size; a pair too wide to stand side by side stands one above the other.",
      decisions: [
        ...COMMON,
        "The pictures are cropped from this round's own shots and from the prototype's (tools/review/round68-pairs.mjs). Each pair is at one scale.",
      ],
      tryIt: ["Switch the theme: every picture has its pair in the other."],
      states: ITEMS.map((item) => `item-${item.id}`),
      widths: [1440],
      scales: [2],
      bleed: true,
      height: 1400,
      demo: ({ state }) => <OwnersEye state={state} />,
    },
  ],
};
