// Round 39: site-parts (DECISIONS 146, decided by the council; a handoff, so approved to build, DECISIONS 140). The site footer, the theme choice, the parts a site's own bar is built from, a bar
// that arrives or leaves and returns, the smoke's midpoint, and the brand's lockup and drawn art. The council voted every item; the implementation has not been reviewed by the panel or by the
// owner, and nothing here says it has. Every word, brand and drawing is synthetic. The readouts are the review page's own: Basalt draws none of them.
//
// The footer, the theme choice, the smoke, the lockup and the art are drawn by the package in this page. The bar's phases need a window of their own (a real fixed bar, a real scroll and a
// real observer), so each is a page composed by the HTML skill's own compose.mjs (round39-skill.mjs) in an iframe, which scrolls itself to the phase and prints what it measured.

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Button,
  FramedArt,
  IconButton,
  SearchGlyph,
  SiteBrand,
  SiteFooter,
  SiteHeader,
  Stage,
  Text,
  ThemeChoiceControl,
  ThemeMenu,
} from "../../packages/react/src/index";
import type { SiteFooterGroup, SiteLockup } from "../../packages/react/src/index";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };
const readout: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const frames = (n: number) => new Promise<void>((resolve) => { const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1))); step(n); });

/** The page's own theme, from the walkthrough's address: the theme choice reads the system's when it mounts, and this puts the shot's theme back. */
function KeepTheme() {
  React.useLayoutEffect(() => {
    const want = new URLSearchParams(location.search).get("theme");
    if (!want) return undefined;
    const root = document.documentElement;
    const apply = () => { if (root.getAttribute("data-theme") !== want) root.setAttribute("data-theme", want); };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  return null;
}

// A synthetic brand: two fits of one drawing. Nothing from a brand folder.
const LOCKUP: SiteLockup = {
  x1: { viewBox: "0 0 112 32", d: "M0 4h24v3H0zM0 25h24v3H0zM0 7h3v18H0zM21 7h3v6h-3zM21 19h3v6h-3zM9 13h6v6H9zM34 8h3v16h-3zM40 8h14v3H40zM40 14h10v3H40zM40 21h14v3H40zM60 8h3v16h-3zM66 8h14v3H66zM66 21h14v3H66z" },
  x2: { viewBox: "0 0 114 32", d: "M0 4h24v2.5H0zM0 25.5h24V28H0zM0 6.5h2.5v19H0zM21.5 6.5H24V13h-2.5zM21.5 19H24v6.5h-2.5zM9.5 13.5h5v5h-5zM34 8h2.5v16H34zM40 8h14v2.5H40zM40 14h10v2.5H40zM40 21.5h14V24H40zM60 8h2.5v16H60zM66 8h14v2.5H66zM66 21.5h14V24H66z" },
};

// ---- A. The site footer ----

const NAMES = ["Product", "Company", "Resources", "Legal", "Support", "Community", "Developers", "Status"];
const groups = (count: number, current = 1): SiteFooterGroup[] =>
  NAMES.slice(0, count).map((label, g) => ({ label, links: ["Overview", "Guides", "Changes", "Contact"].map((name, l) => ({ href: `#${g}-${l}`, label: name, current: g === current && l === 0 })) }));
const line = [{ href: "#a", label: "About" }, { href: "#b", label: "Guides" }, { href: "#c", label: "Pricing" }, { href: "#d", label: "Status" }];

function FooterDemo({ state, count }: { state: string; count: number }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [numbers, setNumbers] = React.useState("");
  React.useEffect(() => {
    if (state === "open") host.current?.querySelectorAll<HTMLButtonElement>(".basalt-site-footer-toggle[aria-expanded=false]").forEach((b) => b.click());
    let live = true;
    frames(4).then(() => {
      if (!live || !host.current) return;
      const footer = host.current.querySelector<HTMLElement>(".basalt-site-footer")!;
      const box = footer.getBoundingClientRect();
      const above = parseFloat(getComputedStyle(footer).marginTop);
      const links = [...footer.querySelectorAll<HTMLElement>(".basalt-site-link")].filter((el) => el.getBoundingClientRect().height > 0);
      const toggles = footer.querySelectorAll(".basalt-site-footer-toggle");
      setNumbers([
        `window ${innerWidth}px · ${footer.querySelectorAll(".basalt-site-footer-group").length} groups, ${state === "line" ? "the line form" : state === "open" ? "every group open" : "closed unless a group holds the current page"}`,
        `footer box ${Math.round(box.height)}px, with the ${Math.round(above)}px above it ${Math.round(box.height + above)}px (a phone screen is 844px)`,
        `links shown ${links.length}, each ${links.length ? Math.round(links[0]!.getBoundingClientRect().height) : 0}px tall · disclosure rows ${toggles.length} (${toggles.length ? Math.round(toggles[0]!.getBoundingClientRect().height) : 0}px)`,
        `navs in the footer ${footer.querySelectorAll("nav").length} (named "${footer.querySelector("nav")?.getAttribute("aria-label") ?? ""}")`,
      ].join("\n"));
    });
    return () => { live = false; };
  }, [state, count]);
  return (
    <div ref={host} style={col}>
      <KeepTheme />
      <SiteFooter
        brand={<SiteBrand label="Sample home" lockup={LOCKUP} />}
        note="A plain sentence about the site, at most the prose width."
        {...(state === "line" ? { links: line } : { groups: groups(count) })}
        legal="Sample Ltd. All rights reserved."
      />
      <pre style={readout}>{numbers}</pre>
    </div>
  );
}

// ---- B. The theme choice ----

/** For each value the head script can write, which word the stylesheet draws chosen from the attribute alone: markup with no React in it, and no script. */
function BeforeScript() {
  const host = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState("");
  const html = React.useMemo(() => renderToStaticMarkup(<ThemeChoiceControl />), []);
  React.useEffect(() => {
    const root = document.documentElement;
    const was = root.getAttribute("data-theme-choice");
    const lines: string[] = [];
    for (const choice of ["system", "light", "dark"]) {
      root.setAttribute("data-theme-choice", choice);
      const weights = [...host.current!.querySelectorAll<HTMLElement>("[role=radio]")].map((el) => `${el.textContent} ${getComputedStyle(el).fontWeight}`);
      lines.push(`data-theme-choice="${choice}": ${weights.join(" · ")}`);
    }
    if (was === null) root.removeAttribute("data-theme-choice"); else root.setAttribute("data-theme-choice", was);
    setText(lines.join("\n"));
  }, []);
  return (
    <div style={col}>
      {/* sink: renderToStaticMarkup of Basalt's own ThemeChoiceControl, no data; the markup is React's, escaped */}
      {/* oxlint-disable-next-line react/no-danger -- renderToStaticMarkup of Basalt's own control (the sink: comment above) */}
      <div ref={host} dangerouslySetInnerHTML={{ __html: html }} />
      <pre style={readout}>{`The markup above is server-rendered, with no script attached. The word drawn at 600 is the one the root's attribute names:\n${text}`}</pre>
    </div>
  );
}

/** The menu open: the trigger is pressed once the page has drawn, and build.mjs waits for an open overlay to finish opening before it takes the shot. */
function ThemeMenuOpen() {
  const host = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let live = true;
    frames(3).then(() => { if (live) host.current?.querySelector<HTMLButtonElement>("button")?.click(); });
    return () => { live = false; };
  }, []);
  return (
    <div ref={host} style={{ ...col, minHeight: 260 }}>
      <KeepTheme />
      <div style={row}><ThemeMenu /></div>
      {caption("The menu open: three radio rows, System, Light and Dark, with the chosen one marked (System, nothing stored). Choosing one closes the menu.")}
    </div>
  );
}

function ThemeDemo({ state }: { state: string }) {
  const html = React.useMemo(() => renderToStaticMarkup(<ThemeChoiceControl />), []);
  React.useLayoutEffect(() => {
    if (state !== "system" && state !== "light" && state !== "dark") return undefined;
    const root = document.documentElement;
    root.setAttribute("data-theme-choice", state);
    return () => root.removeAttribute("data-theme-choice");
  }, [state]);
  if (state === "before-script") return <BeforeScript />;
  if (state === "menu-open") return <ThemeMenuOpen />;
  if (state === "menu") {
    return (
      <div style={{ ...col, minHeight: 240 }}>
        <KeepTheme />
        <div style={row}><ThemeMenu /></div>
        {caption("An app with no footer: a ghost icon button showing the theme in use, named \"Theme: System\", opening three radio rows. Click it to open the menu.")}
      </div>
    );
  }
  return (
    <div style={col}>
      {/* sink: renderToStaticMarkup of Basalt's own ThemeChoiceControl, no data; the markup is React's, escaped */}
      {/* oxlint-disable-next-line react/no-danger -- renderToStaticMarkup of Basalt's own control (the sink: comment above) */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {caption(`The chosen state is ${state === "default" ? "System (nothing stored)" : state}: the word is 600 in primary on the raised pill, its 600 width reserved so nothing moves. One tab stop; the arrow keys move and choose.`)}
    </div>
  );
}

// ---- C. The bar's parts and its three phases (the skill's pages, in an iframe) ----

function PhaseFrame({ page }: { page: string }) {
  const [theme, setTheme] = React.useState<string | null>(null);
  React.useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  const source = React.useMemo(() => (theme ? (__SKILL_PAGES__[page] ?? "").replace("__THEME__", theme) : ""), [page, theme]);
  React.useEffect(() => {
    let resolve: () => void = () => {};
    const ready = new Promise<void>((r) => { resolve = r; });
    const listen = (event: MessageEvent) => { if ((event.data as { basaltSkill?: string } | null)?.basaltSkill === "ready") resolve(); };
    window.addEventListener("message", listen);
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = Promise.race([ready, new Promise<void>((r) => setTimeout(r, 6000))]);
    return () => window.removeEventListener("message", listen);
  }, [page]);
  return (
    <div style={{ ...col, maxWidth: 900 }}>
      {caption("A page composed by the HTML skill's own compose.mjs (its topbar module carries the same behaviour as React's useSitePhase), in an iframe. It scrolls itself to the phase and prints what it measured below.")}
      {/* sink: a page compose.mjs built at review-build time from this round's synthetic body; the frame runs the page's own script, which posts only when its still is ready */}
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script */}
      <iframe title="The bar's phase" srcDoc={source} style={{ width: "100%", height: 560, border: "1px solid var(--basalt-border-input)", borderRadius: 8, background: "transparent" }} />
    </div>
  );
}

function PartsDemo() {
  const links = [{ href: "#a", label: "Start", current: true }, { href: "#b", label: "Guides" }, { href: "#c", label: "Notes" }];
  return (
    <div style={col}>
      <KeepTheme />
      {caption("The default frame, SiteHeader, with its slots: brand (a lockup), links, tools (up to two ghost icon controls that stay at every width; one is drawn here) and action. Never centred.")}
      <div style={{ position: "relative", height: 56, overflow: "hidden" }}>
        <SiteHeader brandLabel="Sample home" lockup={LOCKUP} links={links} tools={<IconButton icon={SearchGlyph} label="Search" />} action={<Button variant="primary">Open</Button>} style={{ position: "static" }} />
      </div>
    </div>
  );
}

// ---- D. The smoke ----

const PLATES = { white: [255, 255, 255], black: [0, 0, 0] } as const;

/** The bar's colour over a plate, and the contrast of an ink on it, composited as the browser does (a canvas resolves any CSS colour, oklch included). */
function useContrast(): (plate: keyof typeof PLATES) => { bar: number[]; rows: string[] } {
  return React.useCallback((plate) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const paint = (css: string, under?: number[]) => {
      ctx.clearRect(0, 0, 1, 1);
      if (under) { ctx.fillStyle = `rgb(${under.join(",")})`; ctx.fillRect(0, 0, 1, 1); }
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0]!, d[1]!, d[2]!];
    };
    const probe = document.createElement("i");
    document.body.append(probe);
    const resolve = (token: string) => { probe.style.color = `var(--basalt-${token})`; return getComputedStyle(probe).color; };
    const lum = ([r, g, b]: number[]) => { const f = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!); };
    const ratio = (a: number[], b: number[]) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return ((hi! + 0.05) / (lo! + 0.05)).toFixed(2); };
    const bar = paint(resolve("surface-chrome"), [...PLATES[plate]]);
    const wash = paint(resolve("state-selected"), bar);
    const rows = [
      `primary on the bar ${ratio(paint(resolve("text-primary"), bar), bar)}:1`,
      `secondary on the bar ${ratio(paint(resolve("text-secondary"), bar), bar)}:1`,
      `secondary on the selected wash ${ratio(paint(resolve("text-secondary"), wash), wash)}:1`,
      `primary on the selected wash ${ratio(paint(resolve("text-primary"), wash), wash)}:1`,
    ];
    probe.remove();
    return { bar, rows };
  }, []);
}

function SmokeDemo() {
  const measure = useContrast();
  const [lines, setLines] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    const read = () => {
      const next: Record<string, string> = {};
      for (const plate of ["white", "black"] as const) { const m = measure(plate); next[plate] = `over ${plate}: the bar reads rgb(${m.bar.join(", ")})\n${m.rows.join("\n")}`; }
      setLines(next);
    };
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, [measure]);
  const cell = (plate: "white" | "black") => (
    <div style={{ ...col, flex: "1 1 320px" }}>
      <div style={{ position: "relative", height: 120, overflow: "hidden", borderRadius: 8, background: plate === "white" ? "#fff" : "#000" }}>
        <div style={{ position: "absolute", inset: "56px 0 0", display: "grid", placeItems: "center", color: plate === "white" ? "#000" : "#fff", font: "600 20px/24px var(--basalt-font-family-sans)" }}>What passes under</div>
        <div className="basalt-chrome" style={{ position: "absolute", inset: "0 0 auto", height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", boxSizing: "border-box" }}>
          <b>Sample</b><span style={{ color: "var(--basalt-text-secondary)" }}>Guides</span><span style={{ marginInlineStart: "auto", padding: "4px 12px", borderRadius: 999, background: "var(--basalt-state-selected)", color: "var(--basalt-text-secondary)" }}>Selected</span>
        </div>
      </div>
      <pre style={readout}>{lines[plate] ?? ""}</pre>
    </div>
  );
  return (
    <div style={col}>
      <KeepTheme />
      <div style={row}>{cell("white")}{cell("black")}</div>
      {caption("surface-chrome is #000 at 92.5% in dark and #fafafa at 96% in light, for every product: the worst plate for each theme is the one in its own colour's opposite. Secondary on the selected wash was 4.40:1, a failure, at the old 85%.")}
    </div>
  );
}

// ---- E. The brand's lockup ----

function LockupDemo({ state }: { state: string }) {
  const [dpr, setDpr] = React.useState(1);
  React.useEffect(() => setDpr(devicePixelRatio), []);
  return (
    <div style={col}>
      <KeepTheme />
      <div style={{ ...row, minHeight: 72 }}>
        <SiteBrand label="Sample home" lockup={LOCKUP} />
      </div>
      <pre style={readout}>{`This screen is ${dpr}x, so the page draws the ${dpr >= 2 ? "2x" : "1x"} drawing; only one of the two is rendered (min-resolution: 2dppx).\n${state === "forced-colours" ? "Forced colours: the lockup is still drawn, in the system text colour." : "Each drawing is one symbol, drawn with use; no file, no title."}`}</pre>
      <div style={row}>
        {(["x1", "x2"] as const).map((x) => (
          <figure key={x} style={{ margin: 0, ...col, gap: 8 }}>
            <svg viewBox={LOCKUP[x].viewBox} width={x === "x1" ? 112 : 114} height={32} aria-hidden="true" style={{ display: "block", color: "var(--basalt-text-primary)" }}><path fill="currentColor" d={LOCKUP[x].d} /></svg>
            {caption(`${x === "x1" ? "1x" : "2x"} drawing, forced`)}
          </figure>
        ))}
      </div>
    </div>
  );
}

// ---- F. Drawn art ----

const DRAWING = (
  <svg viewBox="0 0 100 50" aria-hidden="true">
    <rect width="100" height="50" fill="var(--basalt-art-tone-1)" />
    <rect x="62" y="22" width="22" height="22" fill="var(--basalt-art-tone-2)" />
    <path d="M0 40H100" stroke="var(--basalt-art-tone-4)" strokeWidth="1" fill="none" />
    <circle cx="20" cy="14" r="6" fill="var(--basalt-art-tone-3)" />
  </svg>
);

function ArtDemo({ state }: { state: string }) {
  const meet = state === "meet";
  const box = (aspect: "square" | "wide" | "photo", width: number, label: string) => (
    <div style={{ width, maxWidth: "100%" }}>
      <FramedArt aspect={aspect} art={DRAWING} fit={meet ? "meet" : undefined} anchor="end floor" alt="" caption={label} />
    </div>
  );
  return (
    <div style={col}>
      <KeepTheme />
      <div style={{ ...row, alignItems: "flex-start" }}>{box("square", 220, "A square box")}{box("wide", 360, "A wide box")}{box("photo", 260, "A 3:2 box")}</div>
      {caption(`One drawing in three boxes, ${meet ? "meet: all of it, on art-field" : "slice: the proportions kept and the box filled"}, held at "end floor": the floor and the end stay in every box. The stroke is 1px in each.`)}
      <div style={{ position: "relative", height: 160 }}><Stage fit={meet ? "meet" : undefined} anchor="end floor" art={DRAWING}><div style={{ height: 120 }} /></Stage></div>
    </div>
  );
}

// ---- The round ----

const DONE = "The implementation has not been reviewed by the panel or by the owner.";

export const ROUND_39: Round = {
  id: "39",
  title: "The site's footer, the theme choice, a bar that arrives, the smoke and the brand",
  reviewed: false,
  summary:
    "Batch 3 of the components stream (DECISIONS 146, decided by the council; a handoff, so approved to build, DECISIONS 140): the parts a site's footer and header are made from. A footer on the page at level 0 with labelled groups that fold into disclosures on a phone; the theme choice in it (System, Light and Dark, in the segmented control's drawing), with the head script writing data-theme-choice so the right word is chosen in the first frame; the pill link list, the brand link and the narrow menu as parts a site builds its own bar from; a bar that arrives, or leaves and returns, from one observer on two sentinels; the smoke at the owner's midpoint; and the brand's lockup by pixel density and drawn art's fit and anchor. No site's shape comes into Basalt. " + DONE + " Every word is synthetic.",
  steps: [
    {
      id: "footer",
      name: "The site footer",
      intro: "SiteFooter: the brand, a sentence, the links in labelled groups (or one line), a legal line and the theme choice, on the page, with one divider. Shot with three and with eight groups, at 1440, 720 and 390, closed and open, and in the line form.",
      widths: [1440, 720, 390],
      scales: [1, 2],
      height: 1100,
      decisions: [
        "DECISIONS 146 A. On the page at level 0, with no fill, rim or shadow; group labels in sentence case, never uppercase or mono: 3 to 0.",
        "The link is the pill link at sm (a 28px pill in a 32px hit area, 44 on touch, 13/18, hung so labels start on the group label's edge): 3 to 0.",
        "Under 720 labelled groups are disclosures (a 44px row, closed unless the group holds the current page; without script every group is open, two a row): 3 to 0.",
        "From 1024 the brand takes tracks 1 to 4 and the groups 5 to 12, four a row: 2 to 1 (opus: tracks 1 to 3 and three a row).",
        "A line form of up to six links beside the brand: 3 to 0. One 1px divider the width of the row with half a section gap above it (64, 48, 32): 3 to 0. The footer at the window's foot on a short page: 3 to 0. The legal line and the theme choice are required: 3 to 0. One nav named Footer: 3 to 0.",
        "The prototype defect this does not copy: eight groups took 1,747px at 390. Here they are one phone screen, closed; open they are the measured number printed in the readout.",
      ],
      tryIt: ["Narrow the window under 720: the groups fold. Tab through the disclosure rows and the links.", "Compare the readout's heights with 844px, a phone's screen."],
      states: ["eight", "open", "line"],
      demo: ({ state }) => <FooterDemo state={state} count={state === "eight" || state === "open" ? 8 : 3} />,
    },
    {
      id: "theme",
      name: "The theme choice",
      intro: "ThemeChoiceControl in the footer and a settings row; ThemeMenu in an app with no footer. Shot in its three states, before any script, as the button, and as the menu open.",
      widths: [960, 390],
      scales: [1, 2],
      height: 420,
      decisions: [
        "DECISIONS 146 B. Three states, System, Light and Dark, labelled Theme, in the site footer; the site header has no theme control: 3 to 0 (sol changed its DECISIONS 96 position).",
        "A radio group in the segmented control's drawing: one tab stop, arrows move and choose: 3 to 0.",
        "The head script also writes data-theme-choice on the root, and CSS draws the chosen word from it before any script: 3 to 0. The readout in the \"before script\" shot is measured on markup with no script attached.",
        "In an app with no footer: a ghost IconButton showing the theme in use, named for the choice (\"Theme: System\"), opening a menu of three radio rows; the same three-word control in a settings row: 3 to 0.",
        "LoopsToggle is first in the bar's end cluster, before any tools and the primary Button: 2 to 1 (grok: directly before the primary Button). DECISIONS 143 stands.",
      ],
      tryIt: ["Press an arrow key with a word focused: it moves and chooses. Home and End go to the ends."],
      states: ["system", "light", "dark", "before-script", "menu", "menu-open"],
      demo: ({ state }) => <ThemeDemo state={state} />,
    },
    {
      id: "parts",
      name: "Parts for a site's own bar",
      intro: "SiteBrand, SiteNav, SiteMenu and useSitePhase are exported, and SiteHeader has the slots brand, links, tools and action. Never centred; the narrow menu's trigger is an icon.",
      widths: [960, 390],
      scales: [1, 2],
      height: 220,
      decisions: [
        "DECISIONS 146 C. The brand link, the pill link list and the narrow menu are exported, and no site's shape comes into Basalt: 3 to 0. SiteHeader's slots are brand, links, a new tools (up to two ghost icon controls that stay at every width) and action; themeToggle is kept as a deprecated prop for one release; SiteHeader never centres: 3 to 0.",
        "A count beside a tool is not decided here: it is D11d, in the Controls batch: 3 to 0. The narrow menu's trigger is the icon only: 2 to 1 (sol: an icon, or a word a site may show at every width).",
        "Not built here: a site's own bar. The four sites keep their old headers in this PR.",
      ],
      tryIt: ["Narrow to 390: the links and the action leave, the tool and Menu stay."],
      demo: () => <PartsDemo />,
    },
    {
      id: "phase-rest",
      name: "A bar that arrives: at rest",
      intro: "The bar sits in its slot with the row. The readout is printed by the page: the row's height, where an anchor lands and where focus is.",
      widths: [960],
      scales: [1, 2],
      height: 620,
      decisions: [
        "DECISIONS 146 D. Three phases from IntersectionObserver, no scroll handler; one header exposed at every moment; the row keeps its height; focus inside the bar holds it; where the page is decides the phase, never the direction of the scroll: 3 to 0.",
        "One element in a slot that keeps the row's height; pinned, the same element becomes position: fixed, and the site's CSS restyles it by data-form: 3 to 0.",
        "One observer on two 1px sentinels with a long downward root margin, so a jump past a sentinel that starts below the fold still counts: 3 to 0.",
      ],
      tryIt: ["Scroll the frame by hand, then jump with the links: the phase follows where the page is."],
      demo: () => <PhaseFrame page="phase-rest" />,
    },
    {
      id: "phase-between",
      name: "A bar that arrives: between",
      intro: "The row has left and the first screen has not: no bar is on screen, on purpose, and the slot still keeps the row's height.",
      widths: [960],
      scales: [1, 2],
      height: 620,
      decisions: [
        "DECISIONS 146 D. While the page is between, the focused skip link is space-2 from the window's top: 3 to 0. A jump past the line switches at once, with no travel: 3 to 0.",
        "An anchor lands at the bar's line plus space-4 in every phase, from scroll-padding-top on the root: 2 to 1 (grok: the padding only while pinned; sol measured a heading landing under the bar that way).",
      ],
      tryIt: ["Focus the \"Guides\" link with Tab or the jump link: the readout says where it is."],
      demo: () => <PhaseFrame page="phase-between" />,
    },
    {
      id: "phase-pinned",
      name: "A bar that arrives: pinned",
      intro: "The first screen has passed: the same element is fixed and has dropped in from above its own top edge over duration-slower on ease-out (leaves at 0.75 on ease-in; opacity only under reduced motion).",
      widths: [960],
      scales: [1, 2],
      height: 620,
      states: ["reduced-motion"],
      decisions: [
        "DECISIONS 146 D. It drops in from above over duration-slower on ease-out, leaves at 0.75 on ease-in, and fades under reduced motion: 3 to 0. The name useSitePhase is accepted: 3 to 0.",
        "Prototype defects not copied: a jump past a sentinel that starts below the fold missed the phase; moving the cluster dropped focus to the body; anchors from rest landed under the pin. The tests for each are in the PR.",
      ],
      tryIt: ["Scroll up and down past the first screen. Tab into the bar from the first screen."],
      demo: () => <PhaseFrame page="phase-pinned" />,
    },
    {
      id: "smoke",
      name: "The smoke at the owner's midpoint",
      intro: "surface-chrome over a white and a black backdrop, with the contrast of each ink printed, measured on the page by compositing as the browser does.",
      widths: [960, 390],
      scales: [1, 2],
      height: 460,
      decisions: [
        "DECISIONS 146 E. The owner's midpoint becomes surface-chrome for every product: #000 at 92.5% in dark, #fafafa at 96% in light; blur stays 12px; fallbacks unchanged: 3 to 0.",
        "Secondary ink on the selected wash over a white backdrop goes from 4.40:1 (a failure at 85%) to 5.71:1 (grok; sol reproduced it). The contrast pairs are in the token contrast test.",
      ],
      tryIt: ["Switch the theme: the readout re-measures."],
      demo: () => <SmokeDemo />,
    },
    {
      id: "lockup",
      name: "The brand's lockup by pixel density",
      intro: "lockup={{ x1, x2 }} on the brand link: each drawing is one symbol drawn with use, the 1x drawing shows and the 2x replaces it from 2dppx. Shot at 1x and 2x, and in forced colours.",
      widths: [960],
      scales: [1, 2],
      height: 360,
      states: ["forced-colours"],
      decisions: [
        "DECISIONS 146 F. The lockup by pixel density is a prop on the brand link, each drawing defined once as a symbol and drawn with use, swapped in CSS at min-resolution: 2dppx: 2 to 1 (grok: a HeaderLockup part drawn as a mask, the 2x file at exactly 2 and 4dppx). This build uses 2dppx, so 2.625 and 3 get the 2x drawing.",
        "Prototype defects not copied: the lockup disappeared in forced colours, and the 2x file was never used at 2.625 or 3dppx. It draws in currentColor here.",
        "The quiet zone needs no CSS: the headroom check reads each data-quiet box grown by space-1-5 on every side: 3 to 0.",
      ],
      tryIt: ["Compare the 1x and the 2x shot of the first row: the same lockup, the drawing fitted to the screen."],
      demo: ({ state }) => <LockupDemo state={state} />,
    },
    {
      id: "art",
      name: "Drawn art in its box",
      intro: "FramedArt and Stage take art besides src, with fit (slice by default, or meet) and anchor. One drawing in three boxes, and in a stage.",
      widths: [960, 390],
      scales: [1, 2],
      height: 640,
      states: ["meet"],
      decisions: [
        "DECISIONS 146 F. FramedArt takes art besides src, with fit (slice by default, or meet) and anchor; Stage takes the same two; strokes do not scale: 3 to 0.",
        "A drawing that must recompose for its box, not crop, is the site's own: Basalt's part is the frame and the fit.",
      ],
      tryIt: ["Resize the window: the floor and the end stay in every box."],
      demo: ({ state }) => <ArtDemo state={state} />,
    },
  ],
};
