// Round 36: the fourth audit fix batch of the components stream (DECISIONS 133, audit-fix-c2): the HTML skill and compose.mjs, and the load-sensitive tests the audit
// proved. Every item restores behaviour the documents already state, or removes a cost without changing what is drawn, so there was no vote: AGENTS.md calls it
// engineering. The design panel has not reviewed it. The palette's modal depth is restored to the documented level 1; otherwise settled pixels are preserved (the comparison against
// the base is in the PR), so the round shows what was fixed, in the skill's own pages: they are composed by tools/review/round36-data.mjs into assets/round-36/data.json
// (run it after `npm run build`) and shown in frames. The frames are the HTML skill's pages, not React's. Every word and number on them is synthetic.
//
// The states are real: the frame is scripted after it loads (scrolled, a toast shown, F6 pressed) and the readout under it is read from the frame, not typed.
// "before" removes the one rule that was added, so a state shows what the page did without it. The slow-link numbers are measured on the audit's profile (390 px, 4x CPU,
// slow 4G at 1.6 Mbps and 150 ms), median of 7 loads, by a script that is described in the PR, not run by this page.

import * as React from "react";

import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Text } from "../../packages/react/src/index";
import DATA from "./assets/round-36/data.json";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const readoutStyle: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-hairline)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", font: "var(--basalt-font-weight-regular) var(--basalt-text-sm-size) / var(--basalt-text-sm-line-height) var(--basalt-font-family-mono)", whiteSpace: "pre-wrap" };
const preStyle: React.CSSProperties = { ...readoutStyle, overflowX: "auto", whiteSpace: "pre" };

/** The review page's own theme, as it changes. */
function useTheme() {
  const [theme, setTheme] = React.useState(() => document.documentElement.dataset.theme ?? "dark");
  React.useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme ?? "dark"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** A composed page in a frame, set to the review page's theme (the page's own script follows the system's, so the frame's is written in once it has loaded). */
function Frame({ html, title, height, onReady }: { html: string; title: string; height: number; onReady?: (win: Window & typeof globalThis, doc: Document) => void }) {
  const theme = useTheme();
  const frame = React.useRef<HTMLIFrameElement>(null);
  React.useEffect(() => { frame.current?.contentDocument?.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return (
    <iframe
      ref={frame}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", height, border: "1px solid var(--basalt-border-hairline)", borderRadius: 8, background: "var(--basalt-surface-page)" }}
      onLoad={(e) => {
        const doc = e.currentTarget.contentDocument!;
        doc.documentElement.setAttribute("data-theme", theme);
        onReady?.(e.currentTarget.contentWindow as Window & typeof globalThis, doc);
      }}
    />
  );
}

/** Waits for the frame's scroll position to stop (a focus scrolls smoothly), then says where it is. */
const scrollNow = (win: Window): Promise<number> => new Promise((resolve) => {
  let last = -1;
  let still = 0;
  const tick = () => {
    const y = Math.round(win.scrollY);
    still = y === last ? still + 1 : 0;
    last = y;
    if (still >= 3) resolve(y); else win.requestAnimationFrame(tick);
  };
  win.requestAnimationFrame(tick);
});

// ---- 1. A Tab into the skill's top bar from a scrolled page ----

function BarDemo({ state }: { state: string }) {
  const [readout, setReadout] = React.useState("loading");
  const ready = async (win: Window & typeof globalThis, doc: Document) => {
    if (state === "before") {
      const style = doc.createElement("style");
      style.textContent = ".topbar * { scroll-margin-top: 0 !important; }";
      doc.head.append(style);
    }
    win.scrollTo({ top: 1800, behavior: "instant" });
    const before = await scrollNow(win);
    (doc.querySelector(".topbar a") as HTMLElement).focus();
    const after = await scrollNow(win);
    setReadout(`page scrolled to ${before}px\nfocus into the bar (the brand link)\npage is at ${after}px: ${after === before ? "it did not move" : `it moved ${before - after}px up`}`);
  };
  return (
    <div style={col}>
      {caption(state === "before" ? "Without the scroll margin: the bar sits inside the page's scroll padding (the bar and 16px), so focusing what is in it scrolls the page until it clears the padding." : "The skill's top bar on a long page, scrolled to 1800px, with focus sent into the bar: the page stays where it is. A margin as negative as the padding is deep keeps what is in the bar where it is; an anchor still lands at the padding.")}
      <Frame html={DATA.bar} title="A long page with the skill's top bar" height={420} onReady={ready} />
      <pre style={readoutStyle} data-wt-readout>{readout}</pre>
    </div>
  );
}

// ---- 2. F6 reaches the toast ----

function ToastDemo({ state }: { state: string }) {
  const [readout, setReadout] = React.useState("loading");
  const ready = (win: Window & typeof globalThis, doc: Document) => {
    const B = (win as unknown as { Basalt: { toast: (o: object) => void; openDialog: (s: string) => void; openPalette: (o: object) => void } }).Basalt;
    const palette = () => B.openPalette({ groups: [{ label: "Synthetic", items: [{ label: "Alpha" }, { label: "Beta" }] }] });
    (doc.getElementById("open") as HTMLElement).focus();
    B.toast({ title: "Saved", description: "to disk", action: { label: "Undo", onClick() {} } });
    if (state === "dialog" || state === "focus-lost") B.openDialog("#d");
    if (state === "palette") palette();
    if (state === "dialog-over-palette") { palette(); B.openDialog("#d"); }
    if (state === "palette-over-sheet" || state === "host-close") { B.openDialog("#s"); palette(); }
    if (state === "host-close") (doc.getElementById("s") as HTMLDialogElement).close();
    if (state === "focus-lost") (doc.activeElement as HTMLElement).blur();
    const go = async () => {
      if (!doc.querySelector(".toast")) { win.requestAnimationFrame(go); return; }
      await Promise.all(doc.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
      const name = (el: Element | null) => (el ? `${el.getAttribute("role") ?? el.tagName.toLowerCase()} “${el.getAttribute("aria-label") ?? el.textContent?.trim()}”` : "none");
      const lines = [`focus starts on: ${name(doc.activeElement)}`];
      doc.body.dispatchEvent(new win.KeyboardEvent("keydown", { key: "F6", bubbles: true, cancelable: true }));
      lines.push(`after F6: ${name(doc.activeElement)}, tabindex ${(doc.activeElement as HTMLElement).tabIndex}`);
      const toast = doc.querySelector(".toast")!.getBoundingClientRect();
      lines.push(`toast above the backdrop: ${!!doc.elementFromPoint(toast.left + toast.width / 2, toast.top + toast.height / 2)?.closest(".toast")}`);
      lines.push(`palette open: ${!!doc.querySelector(".palette")}`);
      if (state === "tab") {
        (doc.querySelector(".toast") as HTMLElement).focus();
        lines.push(`after Tab: ${name(doc.activeElement)}`);
      }
      setReadout(lines.join("\n"));
    };
    win.requestAnimationFrame(go);
  };
  return (
    <div style={col}>
      {caption("The toast stack is a named region, and F6 reaches it (foundations): focus goes to the region, which is out of the tab order, and the next Tab is the first toast. Shift+Tab from the region goes back to where focus was.")}
      <Frame html={state === "default" || state === "tab" ? DATA.toast : DATA.overlays} title="A page with a toast" height={500} onReady={ready} />
      <pre style={readoutStyle} data-wt-readout>{readout}</pre>
    </div>
  );
}

// ---- 3. The stage's art, after its content ----

const SLOW = [
  ["390 px, 4x CPU, slow 4G", "0.0868 in 7 of 7 loads (the art's svg moved 177px down and lost 88px of height)", "0 in 0 of 7 loads", "1,520 ms → 1,060 ms"],
  ["1280 px, 1x CPU, slow 4G", "0.0237 in 5 of 5 loads (the svg moved 51px down)", "0 in 0 of 5 loads", "1,504 ms → 1,052 ms"],
];

function StageDemo({ state }: { state: string }) {
  const first = state === "art-first";
  return (
    <div style={col}>
      {caption(first ? "The old order, for comparison: the art before the content. It paints the same pixels once the page has arrived; it is the order that moved on a slow link." : "The skill's stage with .stage-art last in the markup. It is behind the words by z-index inside the stage's own stacking context, so what is painted and what is tabbed is what it was.")}
      <Frame html={first ? DATA.stageFirst : DATA.stageLast} title={first ? "A stage, art first" : "A stage, art last"} height={420} />
      <TableContainer label="Layout shift on the Blacksand page, on the audit's slow-link profile">
        <Table columns={[{ width: 190 }, {}, { width: 150 }, { width: 190 }]} minWidth={760}>
          <TableHeader><TableRow><TableHead>Profile</TableHead><TableHead>Before (layout shift)</TableHead><TableHead>After</TableHead><TableHead>First paint, before → after</TableHead></TableRow></TableHeader>
          <TableBody>{SLOW.map((row) => <TableRow key={row[0]}>{row.map((cell, i) => <TableCell key={i}>{cell}</TableCell>)}</TableRow>)}</TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ---- 4. The head a body can carry ----

function HeadDemo() {
  return (
    <div style={col}>
      {caption("A body carries its description, icon and share card; compose.mjs lifts them into the head, after the title, in the order written. Any other meta or link is refused with the list of what a body may carry.")}
      <pre style={preStyle} aria-label="The body">{DATA.headBody}</pre>
      {caption("The page's head, the tags that came from the body, and the body they left:")}
      <pre style={preStyle} aria-label="The head">{DATA.headTags.join("\n")}</pre>
      <pre style={preStyle} aria-label="The body that is left">{DATA.bodyAfter}</pre>
    </div>
  );
}

export const ROUND_36: Round = {
  id: "36",
  title: "The HTML skill, compose.mjs and the tests that failed under load: the fourth audit fix batch",
  summary:
    "The fourth batch from the full audit (DECISIONS 133): the toast's F6 route works across dialogs, sheets and the palette, including lost document focus. The palette uses a top-layer scrim inside a modal, escapes a sheet's clipping, closes with its logical host, and resets to the documented level 1. The composer checks its regression bodies, explains conservative refusals and states its limits instead of promising to validate arbitrary HTML or JavaScript. Both Geist faces remain. The topbar focus, stage order, escaping, profile group and busy-machine test fixes are retained. The design panel has not reviewed this engineering batch.",
  reviewed: false,
  steps: [
    {
      id: "tab-into-bar",
      name: "A Tab into the top bar from a scrolled page",
      intro: "The skill's top bar, on a long page scrolled to 1800px, with focus sent into the bar.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 660,
      decisions: [
        "Engineering, no vote: React's bar got this rule in PR #66 (a negative scroll margin on what the bar holds); the skill's bar had the same fault and now has the same rule. No pixel changes at rest.",
        "“Before” removes the rule from the frame, so the page's own scroll padding moves the page when the bar is focused.",
      ],
      tryIt: ["Scroll the frame, then press Shift+Tab from the page's first link: the page does not move as focus enters the bar."],
      states: ["default", "before"],
      demo: ({ state }) => <BarDemo state={state} />,
    },
    {
      id: "toast-f6",
      name: "F6 reaches the toast",
      intro: "The skill's toast stack is a named region (“Notifications”), and F6 now moves focus to it, as it does in React.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 820,
      decisions: [
        "Engineering, no vote: foundations says the stack is “a named region that F6 reaches”, React's is, and the skill's was not. The region is out of the tab order (tabindex -1); the next Tab is the first toast; Shift+Tab from the region goes back to where focus was; with no toast, F6 is left to the browser. Focus in the stack holds the toasts' clocks, as hover does.",
        "The viewport follows the focused modal and retains its last live host when focus is lost. A palette can open over a sheet or dialog, and a dialog can open over a palette. Palette keys are scoped to its own content; toast events keep their real isComposing value. Closing the logical host closes its palette and preserves the toast.",
        "The skill keeps the palette, dialogs and sheets open when Escape returns from the toast region or an action. React currently closes CommandMenu, Dialog and Sheet on those paths; the difference is recorded in the README's Known limits. Ordinary Tab into a toast and Shift+Tab back follow document order; F6 returns are cleared when focus leaves the region.",
        "Found, for the panel: the region has no height, and the control ring on it draws as a thin bracket along the stack's bottom edge (the first state shows it). React's region shows the browser's own outline, which draws nothing at that height. The skill's ring is the global focus rule, which this batch did not touch; what should mark a focused region is a design question, so nothing was built for it.",
      ],
      tryIt: ["Click the input in an overlay, press F6, Tab, Tab: region, toast, Undo. Shift+Tab twice returns to the input. Ordinary Tab from the palette input stays there.", "Compare the dialog-over-palette, palette-over-sheet, lost-focus and host-close states; the readout hit-tests the toast above the backdrop. Click the palette’s group label or footer, then use ArrowDown and Escape: its keys still work and its host stays open."],
      states: ["default", "tab", "dialog", "palette", "dialog-over-palette", "palette-over-sheet", "focus-lost", "host-close"],
      demo: ({ state }) => <ToastDemo state={state} />,
    },
    {
      id: "composer-contract",
      name: "The composer contract and refusals",
      intro: "Complete documented body fragments initialise once in the regression corpus. Acceptance is not validation of arbitrary malformed HTML or proof that arbitrary JavaScript executes.",
      widths: [1440, 390], scales: [1, 2], height: 900,
      decisions: [
        "Both Geist faces stay on every page. Twelve corpus bodies are byte-identical with the base parts under both composers, fonts on and off.",
        "An open ordinary HTML element may contain the final script: it need not be a direct child of body. Refused cases name the element or comment and say how to write it. Known limits are in tools/html-skill/README.md.",
        "Init detection ignores strings and regular expressions. Use a direct unconditional inline HTML call that executes once, or let the composer add it; dynamic or conditional JavaScript is the author's responsibility.",
      ],
      tryIt: ["Read each body and its actual refusal message; write HTML in an integration point and put executable scripts in HTML."],
      demo: () => <div style={col}>{DATA.refusals.map((r) => <div key={r.name}><Text weight="medium">{r.name}</Text><pre style={preStyle}>{r.body}</pre><Text size="sm" tone="secondary">{r.message}</Text></div>)}</div>,
    },
    {
      id: "stage-order",
      name: "The stage's art after its content",
      intro: "The skill's stage and React's Stage now put the art after the content in the markup.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 820,
      decisions: [
        "Engineering, no vote: the art is absolutely placed and aria-hidden, so moving it changes no settled pixel, paint order or focus order. It sits behind the content by z-index inside a stacking context the stage now makes for itself. A minimum height for the stage would be a new token, which is design, so none was added.",
        "On a slow link the stage's height comes from its content, so the art was painted in a short stage and moved when the words arrived. With the art last it is not on the page until the rest of the document is, and it does not move.",
      ],
      tryIt: ["Compare the two states: the pixels are the same."],
      states: ["default", "art-first"],
      demo: ({ state }) => <StageDemo state={state} />,
    },
    {
      id: "head-tags",
      name: "A body's head tags",
      intro: "compose.mjs lifts a body's description, og: and twitter: tags, icon and canonical link into the head.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "Engineering, no vote: head tags change no pixel. Accepted: meta name=description, property=og:…, name=twitter:…, and link rel=icon, apple-touch-icon (an icon's href is a data: URL: a page makes no request) and canonical. Anything else is refused with that list.",
        "Left for the wording audit and the sites' move: the Blacksand page's five href=\"#\" links, its missing description and its icon.",
      ],
      tryIt: ["Read the head: the tags are after the title, in the order the body wrote them."],
      demo: () => <HeadDemo />,
    },
  ],
};
