// Round 38: links and rows, ported from the owner's approved site prototypes (DECISIONS 152; candidates D5a, D5b, D5c, D6 and X8). The council
// voted on the owner's handoff, four members, 3 of 4 deciding; there are no deadlocks. The design panel has not reviewed this implementation.
// Every word is synthetic: the prototypes' people, brands and data are examples and nothing from them is here.
//
// The states are real. "hover" puts a pointer on the element that marks itself `data-wt-hover`; "focus" moves keyboard focus to the one that
// marks itself `data-wt-focus` before the shot; "forced-colours" and "reduced-motion" are emulations the build sets before the page loads, and a
// state that ends in one takes it. "open" is a list shown open, "open-focus" is one opened by a key, with focus on its first new row. The numbers
// beside each part are read from the live page by this review page's own code (a box before and after a hover, a width that must not change):
// Basalt draws none of them.

import * as React from "react";

import {
  BackLink,
  BigLinkList,
  BigLinkRow,
  Button,
  CopyButton,
  DirectoryList,
  DirectoryRow,
  Link,
  LinkCard,
  LinkTile,
  Reveal,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const readout: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-wrap" };

const mediaStyle = { "--_basalt-link-card-media-height": "140px" } as React.CSSProperties;
const Art = ({ shade = 0.18 }: { shade?: number }) => <svg width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", color: "var(--basalt-text-primary)" }}><rect width="10" height="10" fill="currentColor" opacity={shade} /><path d="M0 8 L4 4 L7 7 L10 3 V10 H0Z" fill="currentColor" opacity={shade * 1.6} /></svg>;

/** Rounded to the hundredth, as a number a person can compare. */
const r = (n: number) => Math.round(n * 100) / 100;
const rect = (el: Element | null) => { const b = el?.getBoundingClientRect(); return b ? { x: r(b.x), y: r(b.y), w: r(b.width), h: r(b.height) } : null; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Reads the boxes `selectors` name inside `root` now and again once a pointer or focus has settled, and prints how far each moved and how far
 * `arrow` travelled. The "before" is taken on mount; the "after" 400ms after the first pointer or focus event on the root.
 */
function Moves({ root, selectors, arrow }: { root: React.RefObject<HTMLElement | null>; selectors: string[]; arrow?: string }) {
  const [text, setText] = React.useState("Hover or focus the part: this line then says what moved.");
  React.useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const read = () => selectors.map((s) => rect(el.querySelector(s)));
    const before = read();
    let timer = 0;
    const measure = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const after = read();
        const moved = selectors.map((s, i) => `${s}: ${same(before[i], after[i]) ? "0px" : "MOVED"}`);
        const a = arrow ? el.querySelector(arrow) : null;
        const tx = a ? new DOMMatrix(getComputedStyle(a).transform === "none" ? undefined : getComputedStyle(a).transform).m41 : 0;
        setText(`${moved.join("\n")}${arrow ? `\narrow travel: ${r(tx)}px${a ? ` (its ink: ${getComputedStyle(a).color})` : " (the pointer is not on it now)"}` : ""}`);
      }, 400);
    };
    el.addEventListener("pointerenter", measure, true);
    el.addEventListener("focusin", measure);
    el.querySelectorAll("a, button").forEach((n) => n.addEventListener("pointerenter", measure));
    return () => { window.clearTimeout(timer); el.removeEventListener("pointerenter", measure, true); el.removeEventListener("focusin", measure); };
  }, [root, selectors, arrow]);
  return <pre style={readout} aria-live="off">{text}</pre>;
}

function useFocus(state: string, root: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!/^focus/.test(state)) return undefined;
    const timer = window.setTimeout(() => root.current?.querySelector<HTMLElement>("[data-wt-focus]")?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [state, root]);
}

// ---- D5a: the link card and the tile ----

function CardDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useFocus(state, root);
  return (
    <div ref={root} style={{ ...col, maxWidth: 720 }}>
      {caption("A link round a window, a heading, a sentence and a state: no rim, no level. The arrow is the core right arrow, 24px (20 under 720). The window's height is this page's (140).")}
      <ul style={{ listStyle: "none", margin: 0, padding: "0 8px", display: "grid", gap: 40 }}>
        <li><LinkCard href="#alpha" title="Alpha works" titleLevel={3} media={<Art />} description="A short synthetic sentence about it." state="2026" style={mediaStyle} data-wt-hover="" data-wt-focus="" /></li>
        <li><LinkCard href="https://example.invalid/beta" target="_blank" title="Beta works" media={<Art shade={0.1} />} description="Opens a new tab, so it draws the new-tab arrow and never both." state="2025" style={mediaStyle} /></li>
      </ul>
      <Moves root={root} selectors={[".basalt-link-card", ".basalt-link-card-title", ".basalt-link-card-what", ".basalt-link-card-state"]} arrow=".basalt-go-arrow" />
    </div>
  );
}

function TileDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useFocus(state, root);
  return (
    <div ref={root} style={{ ...col, maxWidth: 520 }}>
      {caption("A link round a picture, a brand line, a name and details. The foot (a price and a control) is outside the link. Hover underlines the name; the picture does not lift.")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
        <LinkTile href="#one" media={<div style={{ height: 140 }}><Art /></div>} brand="Synthetic maker" title="Synthetic product" details="500 g · 3 flavours" foot={<><Text weight="semibold">£12.00</Text><Button size="lg" variant="secondary">Add</Button></>} data-wt-hover="" data-wt-focus="" />
        <LinkTile href="#two" media={<div style={{ height: 140 }}><Art shade={0.1} /></div>} title="A tile with no brand" details="1 kg" />
      </div>
      <Moves root={root} selectors={[".basalt-link-tile", ".basalt-link-tile-title", ".basalt-link-tile-media"]} />
    </div>
  );
}

// ---- D5b: the directory, show all, and the big link rows ----

const WORK = Array.from({ length: 12 }, (_, i) => ({ name: `Name ${i + 1}`, what: `A synthetic sentence about row ${i + 1}, long enough to take a line of words.`, state: String(2015 + i) }));

function DirectoryDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const open = /^open/.test(state);
  useFocus(state, root);
  React.useEffect(() => {
    if (state !== "open-focus") return undefined;
    // A key opens it: Enter on the button, as a person would. Focus then lands on the first new row once the clip has let go.
    const timer = window.setTimeout(() => { const b = root.current?.querySelector<HTMLButtonElement>(".basalt-reveal-foot button"); b?.focus(); b?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })); }, 150);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div ref={root} style={{ ...col, maxWidth: 960 }}>
      {caption("One list with one name, its head. Three fixed columns: name and state 160px, the sentence the rest; 56px rows, ruled; under 720 one column.")}
      <div style={{ padding: "0 8px" }}>
        <DirectoryList title="Client work and other projects" shown={4} showAllLabel="Show all 12" defaultOpen={open && state !== "open-focus"}>
          {WORK.map((w, i) => <DirectoryRow key={w.name} href={`#r${i}`} name={w.name} description={w.what} state={w.state} {...(i === 1 ? { "data-wt-hover": "", "data-wt-focus": "" } : {})} />)}
        </DirectoryList>
      </div>
      <Moves root={root} selectors={[".basalt-directory-head", ".basalt-directory-row", ".basalt-directory-name", ".basalt-directory-what", ".basalt-directory-state"]} arrow=".basalt-directory-row:hover .basalt-go-arrow" />
    </div>
  );
}

function BigDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useFocus(state, root);
  return (
    <div ref={root} style={{ ...col }}>
      {caption("600, one line each, a rule under each. Text-2xl (24/30) under 1024 and text-3xl (30/36) from it, in one column; from 720 to 1023 two columns. The prototype's fluid 22 to 36 is gone.")}
      <div style={{ padding: "0 8px" }}>
        <BigLinkList aria-label="Shop by category">
          {["Alpha goods", "Beta goods", "Gamma goods", "Delta goods", "Epsilon goods"].map((n, i) => <BigLinkRow key={n} href={`#b${i}`} {...(i === 1 ? { "data-wt-hover": "", "data-wt-focus": "" } : {})}>{n}</BigLinkRow>)}
        </BigLinkList>
      </div>
      <Moves root={root} selectors={[".basalt-big-links", ".basalt-big-link-words"]} arrow=".basalt-big-link:hover .basalt-go-arrow" />
    </div>
  );
}

function RevealDemo({ state }: { state: string }) {
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption("Any content can open in place from a button under it. The same states as the directory's: aria-expanded and aria-controls, inert and hidden while closed.")}
      <div style={{ padding: "0 8px" }}>
        <Reveal showLabel="Show all 3" hideLabel="Show fewer" defaultOpen={state === "open"} rest={<><Text>The second synthetic paragraph, opened in place.</Text><Text>The third, the same.</Text></>}>
          <Text>The first synthetic paragraph is always shown.</Text>
        </Reveal>
      </div>
      <Text size="sm" tone="secondary">Under it, the page goes on: it moves down when the list opens, which is what the press asked for.</Text>
    </div>
  );
}

// ---- D5c: the arrow link and the back link ----

function ArrowDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useFocus(state, root);
  return (
    <div ref={root} style={{ ...col, maxWidth: 560 }}>
      {caption("The back link is a nav with one link above a title. The arrow link is a Link on a line of its own: no underline, 500, a 44px target, the arrow its cue. A plain Link keeps its underline.")}
      <div>
        <BackLink href="#brands" data-wt-hover="" data-wt-focus="">Brands</BackLink>
        <Text size="xl" weight="semibold">A page's title</Text>
      </div>
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <Link href="#all" arrow="end">All brands</Link>
        <Link href="#up" arrow="start">Up one level</Link>
        <Link href="https://example.invalid" target="_blank" arrow="end">Elsewhere (new tab)</Link>
        <Link href="#plain">A plain link in a sentence</Link>
      </div>
      <Moves root={root} selectors={[".basalt-back-link a", ".basalt-link-go"]} arrow=".basalt-link-go:hover .basalt-go-arrow" />
    </div>
  );
}

// ---- X8: the copy button with words ----

function CopyDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [widths, setWidths] = React.useState("");
  useFocus(state, root);
  React.useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const button = el.querySelector<HTMLElement>("#copy-demo");
    if (state === "copied" && button) {
      // A copy by the page's own click, with the clipboard stood in for so it succeeds here: the button then says Copied for 1500ms.
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } });
      const timer = window.setTimeout(() => button.click(), 100);
      return () => window.clearTimeout(timer);
    }
    const cell = button?.querySelector(".basalt-copy-words");
    if (cell) setWidths([...cell.children].map((c) => `"${c.textContent}": ${r(c.getBoundingClientRect().width)}px`).join("   ") + `   the button: ${r(button!.getBoundingClientRect().width)}px`);
    return undefined;
  }, [state]);
  return (
    <div ref={root} style={{ ...col, maxWidth: 560 }}>
      {caption("A Button that copies a string, reads its words, then Copied (1500ms), with a spoken status. Both wordings stand in one cell: the button is as wide as the wider and never changes.")}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <CopyButton id="copy-demo" text="hello@example.invalid" variant="secondary" size="lg" statusLabel="Address copied" data-wt-hover="" data-wt-focus="">Copy address</CopyButton>
        <CopyButton text="synthetic" variant="primary">Copy</CopyButton>
      </div>
      <pre style={readout}>{widths || "Press the button: Copied shows in the same cell, and the width is the one above."}</pre>
      <Moves root={root} selectors={["#copy-demo"]} />
    </div>
  );
}


export const ROUND_38: Round = {
  id: "38",
  title: "Links and rows",
  reviewed: false,
  summary:
    "The links-and-rows port (DECISIONS 152): the link card and tile, the directory and big link rows, the arrow link and back link, show all, and the copy button with words, built from the owner's approved site prototypes with what the council changed. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "link-card",
      name: "The link card",
      intro: "One link round a window, a heading, a sentence and a state. No rim, no level, not a Card.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "Ported as approved (SRA's floor): the whole card is the link; the heading is a real heading; the heading and its arrow `space-6` apart; the sentence and the state on one baseline `space-8` apart; the sentence and arrow secondary lifting to primary over `duration-base`; the control ring at +2; 24px arrow, 20 on a phone.",
        "Council changed: the arrow is the core right arrow, not up-right, which is the new-tab cue and nothing else (vote 1, 3 to 0, sol in the same). Hover and focus travel the arrow 2px and do not lift a picture (vote 2: no majority, 2 to 2, so the vote's option (a) stands).",
        "Builder's choice where the ballot gave none, left standing by the council (DECISIONS 157, no member objected): the heading's size is the display role; `space-10` above the heading and `space-5` before the foot; the prototype set these on the site's own unit grid.",
      ],
      tryIt: ["Hover and focus a card: the line below the card says what moved (0px) and how far the arrow travelled (2px).", "The second card opens a new tab: it draws the new-tab arrow in the arrow's place, never both."],
      states: ["default", "hover", "focus", "forced-colours", "reduced-motion", "hover-reduced-motion"],
      demo: ({ state }) => <CardDemo state={state} />,
    },
    {
      id: "link-tile",
      name: "The tile",
      intro: "A link round a picture, a brand, a name and details; the foot row sits outside the link.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 700,
      decisions: [
        "Ported as approved (Castle's tile): brand `text-sm` secondary, details `text-sm` tertiary, the name 500 and a real heading (the prototype used a span), picture to text `space-3`, line gap `space-0-5`, the name underlined on hover (1px, offset 3px), link radius 6.",
        "Council changed: the name is `text-md` 16/24, not 15/20 (consent row 1, 3 of 4 with sol for 14/20). The picture's 3px lift on hover is gone: a 2 to 2 tie (vote 2), the option without the lift stands.",
      ],
      tryIt: ["Hover the first tile: the name underlines and the picture does not move."],
      states: ["default", "hover", "focus", "forced-colours"],
      demo: ({ state }) => <TileDemo state={state} />,
    },
    {
      id: "directory",
      name: "The directory",
      intro: "A head, then rows ruled by hairlines. Each row is one link with three fixed columns: name, sentence, state.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "Ported as approved (SRA's directory): three fixed columns with the sentence the remainder, the state end-aligned and tabular, one column under 720, a head one line secondary 500, ink lift with no wash.",
        "Council changed: one list with one name, not two lists (the prototype's defect); no hover wash, with a sentence in foundations that a ruled list on the page is not a settings row (vote 3, 4 to 0); the arrow is the right arrow (vote 1) at 16px (consent row 6); text is `text-md` 16/24 (consent row 1); the rule between rows is `border-divider` (consent row 4); name and state columns are 160px (consent row 5); rows are the new `size-row` 56px (consent row 3).",
        "Builder's choice where the ballot gave none, left standing by the council (DECISIONS 157, no member objected): column gap `space-6`, head padding `space-3`, the site's own unit grid is not ported.",
      ],
      tryIt: ["Hover and focus a row: the sentence and the arrow lift to primary, the arrow travels 2px, and every box reads 0px moved."],
      states: ["default", "hover", "focus", "forced-colours", "reduced-motion", "hover-reduced-motion"],
      demo: ({ state }) => <DirectoryDemo state={state} />,
    },
    {
      id: "show-all",
      name: "Show all and show fewer",
      intro: "The rest of a long list opens in place from a button under it: one list, the same grid row going 0fr to 1fr.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 1100,
      decisions: [
        "Ported as approved (SRA's show all): a secondary large Button with aria-expanded and aria-controls, the rest inert and hidden while closed, a grid row `0fr` to `1fr` over `duration-slow` on `ease-out`, closing at 0.75× on `ease-in`, `space-2` of room beside the rows so a ring is whole, a rule above the button's row.",
        "Council and engineering changed: focus moves to the first new row only on a keyboard open, and only once the clip has let go so its ring is whole (vote 5: no majority, so option (a) stands, with muse and sol's note that it lands after the clip releases). The 260ms timer is replaced by the transition's own end. The rest stays in the one list. Under reduced motion no transition; the rows are simply there.",
      ],
      tryIt: ["Press the button with the pointer: focus stays on it. Press it with Enter or Space: focus lands on the first new row once it has opened, with its whole ring."],
      states: ["default", "open", "open-focus", "open-reduced-motion"],
      demo: ({ state }) => <DirectoryDemo state={state} />,
    },
    {
      id: "reveal",
      name: "Reveal, for any content",
      intro: "The same opening for content that is not a list.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 500,
      decisions: ["The same part as show all, with the same states: ported from SRA's show all, with the council's votes 5 and the engineering notes above."],
      tryIt: ["Open and close it: only what is under it moves."],
      states: ["default", "open"],
      demo: ({ state }) => <RevealDemo state={state} />,
    },
    {
      id: "big-link-rows",
      name: "The big link rows",
      intro: "Full-width links, one line each, a trailing arrow, a rule under each.",
      widths: [1440, 1023, 719, 390],
      scales: [1, 2],
      height: 700,
      decisions: [
        "Ported as approved (Castle's shop-by-category rows): 600, one line each, the arrow after the words with `space-1` to its end, a rule under each, two columns from 720 with a `space-12` gap, the ring at +2 radius 6.",
        "Council changed: `text-2xl` 24/30 under 1024 and `text-3xl` 30/36 from 1024, not a fluid 22 to 36 (consent row 2; DECISIONS 137 ruled out clamp); the two-column band is 720 to 1023, not 959 (opus's note); the arrow is the right arrow; the rule is `border-divider` (consent row 4); rows are `size-row` 56px, and `space-16` in two columns.",
      ],
      tryIt: ["Hover a row: the arrow lifts and travels 2px; nothing else moves."],
      states: ["default", "hover", "focus", "forced-colours", "hover-reduced-motion"],
      demo: ({ state }) => <BigDemo state={state} />,
    },
    {
      id: "arrow-link",
      name: "The arrow link and the back link",
      intro: "A Link with an arrow as its cue, and a back link above a title.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Ported as approved (Castle's link-go and back link): the arrow link is no underline, 500, 44px high, gap `space-2`, no wrap; the back link is 14/20 secondary lifting to primary, gap `space-2`, 44px. The back link is a nav (the prototype used a paragraph).",
        "Council changed: the arrow is the core arrow (vote 1); the arrow link is a variant of Link (vote 4, 3 to 0, with the arrow in secondary ink at rest); the back link's hover is the ink lift with no underline; the arrow link's text is `text-md` 16/24 (consent row 1).",
      ],
      tryIt: ["Hover each: the arrow lifts and travels 2px in its own direction (the back arrow travels left)."],
      states: ["default", "hover", "focus", "forced-colours"],
      demo: ({ state }) => <ArrowDemo state={state} />,
    },
    {
      id: "copy-button",
      name: "The copy button with words",
      intro: "A Button that reads its words, then Copied, and never changes width.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 500,
      decisions: [
        "Ported as approved (SRA's copy address and the personal site's copy): both words in one cell so the width never changes (the personal site does this, SRA did not), a hidden status that says what was copied, and Copied only after the write succeeded (the personal site said it even when both calls failed: not copied).",
        "Council: Copied stays 1500ms, as CodeBlock and Terminal (vote 6, 4 to 0). A refused or missing clipboard leaves the button as it was (DECISIONS 135 put a message for it under BACKLOG).",
      ],
      tryIt: ["Press it: the width line below stays the same before and after."],
      states: ["default", "copied", "hover", "focus", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <CopyDemo state={state} />,
    },
  ],
};
