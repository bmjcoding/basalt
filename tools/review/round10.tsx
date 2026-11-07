// Round 10: the owner's two decisions after the council's second round. The .98 press on Button and
// IconButton, and the smoked sticky header (`basalt-chrome`). Both are built as decided; nothing here is an
// option. The implementation has not been reviewed by the design panel.
//
// A press is `:active`, which a screenshot cannot hold, so the specimen draws a button at rest beside the
// same button with the pressed styles applied inline. Hold the live buttons to feel the real thing.

import { CopyIcon, GearIcon } from "@phosphor-icons/react";
import * as React from "react";
import { createPortal } from "react-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// ---- 1. The press

/** The pressed look, drawn: the colour step the stylesheet applies on :active, and the .98 scale. */
const heldPrimary: React.CSSProperties = { transform: "scale(0.98)", background: "var(--basalt-action-primary-press)" };
const heldWash: React.CSSProperties = { transform: "scale(0.98)", background: "var(--basalt-state-selected)" };

/** The moments of the 100ms press that the filmstrip shoots, in ms. */
const FILM_TIMES = [0, 10, 20, 30, 50, 100];

/**
 * The real press, frame by frame. Each button is a live Button or IconButton held `:active` by the screenshot build
 * (Chromium's forced pseudo-state), with the button's own colour and scale transitions paused at the time on its label.
 * Nothing here is drawn: the build seeks the browser's own transition, then reads the scale back into the caption.
 */
function PressFilm() {
  const rows: Array<{ name: string; node: (time: number) => React.ReactNode }> = [
    { name: "Primary", node: (t) => <Button variant="primary" data-wt-film={t}>Deploy</Button> },
    { name: "Secondary", node: (t) => <Button data-wt-film={t}>Cancel</Button> },
    { name: "Icon", node: (t) => <IconButton icon={CopyIcon} label={`Copy at ${t} ms`} data-wt-film={t} /> },
  ];
  return (
    <div style={col}>
      <Caption>The real press, paused at 0, 10, 20, 30, 50 and 100 ms of its own transition (the 100ms colour step and the .98 scale run on one clock)</Caption>
      <div className="wt-film">
        {rows.map((r) => (
          <div key={r.name} className="wt-film-row">
            <div className="wt-film-name">{r.name}</div>
            {FILM_TIMES.map((t) => (
              <div key={t} className="wt-film-frame">
                {r.node(t)}
                <div className="wt-film-readout" data-wt-film-readout={t}>{t} ms</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PressDemo({ state }: { state: string }) {
  if (state === "film") return <PressFilm />;
  return (
    <div style={col}>
      <Caption>Hold each button down: the colour steps and the button scales to .98 over 100ms, and back when you let go</Caption>
      <div style={row}>
        <Button variant="primary">Deploy</Button>
        <Button>Cancel</Button>
        <Button variant="ghost">Preview</Button>
        <Button variant="danger">Delete</Button>
        <IconButton icon={CopyIcon} label="Copy" />
        <IconButton icon={GearIcon} label="Settings" variant="secondary" />
      </div>

      <Caption>At rest, and held down (drawn, as a colour reference: the pressed colour and a scale of .98). The real press, frame by frame, is in the screenshots as press-film</Caption>
      <div className="wt-press-frames">
        <div style={row}>
          <Button variant="primary">Deploy</Button>
          <Button>Cancel</Button>
          <IconButton icon={CopyIcon} label="Copy at rest" />
        </div>
        <div style={row} data-wt-held>
          <Button variant="primary" style={heldPrimary}>Deploy</Button>
          <Button style={heldWash}>Cancel</Button>
          <IconButton icon={CopyIcon} label="Copy held" style={heldWash} />
        </div>
      </div>

      <Caption>Never scales: a disabled button, a loading button, a card, a menu row</Caption>
      <div style={row}>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="primary" loading>Saving</Button>
        <Card style={{ padding: 12 }}>A card</Card>
        <Menu defaultOpen={state === "menu"}>
          <MenuTrigger render={<Button>Actions</Button>} />
          <MenuContent>
            <MenuItem>Duplicate</MenuItem>
            <MenuItem>Rename</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <Text size="sm" tone="secondary">Turn on reduced motion in your system and hold the buttons again: the colour still steps and nothing scales.</Text>
    </div>
  );
}

// ---- 2. The smoked header

/**
 * Content to scroll under the bar. It opens with the two things that show what the material does and doesn't do: a block
 * of the opposite value to the page (a stand-in for a light screenshot on the dark theme, a dark one on the light theme:
 * the worst plate for the fill) and a large heading. The bar is in flow, so the field starts 56px down: scrolled to
 * FIELD_SCROLL, the block's lower edge and the heading's top both sit under the bar, in both themes.
 */
const FIELD_SCROLL = 200;
function Field() {
  return (
    <div className="wt-chrome-field">
      <div className="wt-chrome-block" role="img" aria-label="A screenshot of the opposite theme, as a bright block">
        <span>A screenshot, as a bright block</span>
      </div>
      <Text as="div" size="5xl" weight="semibold" style={{ lineHeight: 1 }}>Runs</Text>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Run</TableHead><TableHead>Agent</TableHead><TableHead>Time</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {["run-0142", "run-0141", "run-0140", "run-0139", "run-0138", "run-0137"].map((id, i) => (
              <TableRow key={id}><TableCell>{id}</TableCell><TableCell>{i % 2 ? "codex" : "claude"}</TableCell><TableCell>{4 + i}m {12 + i * 7}s</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Card>
        <CardHeader><CardTitle>blacksand-api</CardTitle><CardDescription>Sealed. Three routes, one refused.</CardDescription></CardHeader>
        <CardContent>The bar is the only thing that blurs. The table, the card and the type pass under it.</CardContent>
      </Card>
    </div>
  );
}

function Bar() {
  return (
    <header className="basalt-chrome wt-chrome-bar">
      <Text as="span" weight="semibold">Basalt</Text>
      <Text as="span" tone="secondary" size="sm" className="wt-chrome-nav">Runs</Text>
      <Text as="span" tone="secondary" size="sm" className="wt-chrome-nav">Records</Text>
      <span className="wt-chrome-spacer" />
      <Button variant="ghost" size="sm">Docs</Button>
      <Button variant="primary" size="sm">Deploy</Button>
    </header>
  );
}

/** A frame the page scrolls in, so the bar sticks to its top like a header sticks to a viewport. */
function ScrollFrame({ scrolled, children }: { scrolled: boolean; children?: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = scrolled ? FIELD_SCROLL : 0;
  }, [scrolled]);
  return (
    <div ref={ref} className="wt-chrome-frame" tabIndex={0} role="region" aria-label="A scrolling page">
      <Bar />
      {children ?? <Field />}
    </div>
  );
}

/** The worst plates: the bar over pure white and over pure black, the two the contrast tests use. */
function Plates() {
  return (
    <div className="wt-chrome-plates">
      {[{ name: "Over pure white", plate: "#ffffff" }, { name: "Over pure black", plate: "#000000" }].map((p) => (
        <div key={p.name} className="wt-chrome-plate" style={{ background: p.plate }}>
          <header className="basalt-chrome wt-chrome-bar wt-chrome-bar-short" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
            <Text as="span" weight="semibold">Primary ink</Text>
            <Text as="span" tone="secondary" size="sm">Secondary ink</Text>
          </header>
          <div className="wt-chrome-plate-name" style={{ color: p.plate === "#ffffff" ? "#000" : "#fff" }}>{p.name}</div>
        </div>
      ))}
    </div>
  );
}

// ---- The pressed ghost Button in the bar (the owner's preview of fix round 2, item 1)

/**
 * A shadow root whose stylesheet is the page's own, minus exactly one rule: the header-only pressed ghost ink that this
 * round adds. Whatever sits inside is today's CSS, the real cascade as it was before the change, not a drawn imitation.
 * The build fails if the rule can't be found, so the "before" frame can never quietly become the "after" one.
 */
const NEW_PRESS_RULE = '.basalt-chrome .basalt-button[data-variant="ghost"]:active';
function ShadowHost({ children }: { children: React.ReactNode }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [root, setRoot] = React.useState<ShadowRoot | null>(null);
  React.useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(Array.from(document.styleSheets).flatMap((s) => Array.from(s.cssRules).map((r) => r.cssText)).join("\n"));
    let removed = 0;
    const strip = (list: CSSRuleList) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const rule = list[i] as CSSRule & { selectorText?: string; cssRules?: CSSRuleList; deleteRule?: (i: number) => void };
        if (rule.selectorText?.startsWith(NEW_PRESS_RULE)) {
          (sheet as unknown as { deleteRule: (i: number) => void }).deleteRule(i);
          removed++;
        } else if (rule.cssRules?.length) {
          const before = rule.cssRules.length;
          // A grouping rule (an @layer, an @media): delete from inside it.
          for (let j = rule.cssRules.length - 1; j >= 0; j--) {
            const inner = rule.cssRules[j] as CSSRule & { selectorText?: string };
            if (inner.selectorText?.startsWith(NEW_PRESS_RULE)) (rule as unknown as { deleteRule: (i: number) => void }).deleteRule(j);
          }
          removed += before - rule.cssRules.length;
        }
      }
    };
    strip(sheet.cssRules);
    if (!removed) throw new Error(`the rule ${NEW_PRESS_RULE} was not found, so there is no "before" to show`);
    shadow.adoptedStyleSheets = [sheet];
    setRoot(shadow);
  }, []);
  return <div ref={host} style={{ display: "contents" }}>{root && createPortal(children, root)}</div>;
}

type GhostKind = "rest" | "before" | "after";
const GHOST_FRAMES: Array<{ kind: GhostKind; title: string; says: string }> = [
  { kind: "rest", title: "At rest", says: "secondary ink on the bar" },
  { kind: "before", title: "Pressed, before this change", says: "secondary ink on the wash" },
  { kind: "after", title: "Pressed, after this change", says: "primary ink on the wash" },
];

/**
 * The header bar over a white plate and over a black plate, one ghost Button "Docs" in three frames. The pressed frames
 * are held `:active` by the screenshot build (Chromium's forced pseudo-state), so the colour is the stylesheet's own; the
 * build then measures each frame's real ink over the real composite and writes the ratio under it. In this page the
 * frames sit at rest until you hold them.
 */
function GhostPress() {
  return (
    <div style={col}>
      <Caption>A pressed ghost Button in the header takes primary ink (council vote 3 to 1, decided; shown here before it ships). The wash stays. Each ratio is measured from the real ink over the real composite: plate, bar fill, then the wash</Caption>
      <div className="wt-chrome-plates">
        {[{ name: "Over pure white", plate: "#ffffff", ink: "#000000" }, { name: "Over pure black", plate: "#000000", ink: "#ffffff" }].map((p) => (
          <div key={p.name} className="wt-ghost-plate" data-wt-plate style={{ background: p.plate, color: p.ink }}>
            <div className="wt-ghost-name">{p.name}</div>
            <div className="wt-ghost-grid">
              {GHOST_FRAMES.map((f) => {
                const bar = (
                  <header className="basalt-chrome wt-ghost-bar">
                    <Button variant="ghost" size="sm" data-wt-ghost={f.kind} data-wt-pressed={f.kind === "rest" ? undefined : ""}>Docs</Button>
                  </header>
                );
                return (
                  <div key={f.kind} className="wt-ghost-cell">
                    {f.kind === "before" ? <ShadowHost>{bar}</ShadowHost> : bar}
                    <div className="wt-ghost-label">
                      <strong>{f.title}</strong>
                      <span>{f.says}</span>
                      <span data-wt-ratio={f.kind} data-wt-says={f.says}>ratio in the screenshots</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The shipped fallbacks, drawn: opaque page colour and no filter. Scoped to the one frame that shows them. */
const opaqueCss = `@layer review-options {
  .wt-chrome-opaque .basalt-chrome { background: var(--basalt-surface-page); -webkit-backdrop-filter: none; backdrop-filter: none; }
}`;

function ChromeDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state === "dialog");
  if (state === "ghost") return <GhostPress />;
  return (
    <div style={col}>
      <style>{opaqueCss}</style>
      <Caption>Scroll the page: it passes under the bar, blurred 12px, behind a fill at 85% in dark and 92% in light</Caption>
      <ScrollFrame scrolled={state === "scrolled" || state === "dialog"} />

      <Caption>Primary and secondary ink only, on the two plates that fight the fill hardest</Caption>
      <Plates />

      <Caption>The fallback: the opaque page colour, with no filter. This is what it falls back to without backdrop-filter, under reduced transparency, and in print. Forced colours use Canvas and a real border</Caption>
      <div className="wt-chrome-opaque">
        <ScrollFrame scrolled />
      </div>

      <GhostPress />

      <Caption>Overlays stay solid: a dialog over the page, with the bar under its scrim</Caption>
      <div style={row}>
        <Button onClick={() => setOpen(true)}>Open a dialog</Button>
        <Text size="sm" tone="secondary">The dialog is opaque, the scrim is unblurred, and only the bar has a backdrop-filter.</Text>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Delete blacksand-api?</DialogTitle>
          <DialogDescription>This removes the sandbox and its routes. The page behind is dimmed, not blurred.</DialogDescription>
          <DialogActions>
            <DialogClose render={<Button>Cancel</Button>} />
            <Button variant="danger">Delete</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const ROUND_10: Round = {
  id: "10",
  title: "The press, and the smoked header",
  reviewed: false,
  summary:
    "Two decisions the owner made after the design council's second round, built as decided: a .98 press scale on Button and IconButton, and one smoked surface, the sticky header bar. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "press",
      name: "The press",
      intro: "A press is still a colour step. Button and IconButton also scale to .98 while pressed, over 100ms on ease-out, and nothing else does.",
      decisions: [
        "The owner's decision (7 Nov 2026, council round 2): scale .98 on Button and IconButton only, on :active, 100ms on ease-out, the existing colour step kept.",
        "Under reduced motion the scale is 1 and the colour step stays. Never on a disabled or loading button, and never on a row, card, menu item or command row. There is no basalt-press utility.",
        "Tests prove the computed transform while pressed, none under reduced motion, none on a menu row, a card, a command row, or a disabled or loading button.",
        "Council 4 to 0: the parts of a field (the NumberField steppers, the Combobox trigger) keep the colour step and never scale, and have no pressed hit-area extension.",
      ],
      tryIt: ["Hold each live button down, then let go.", "Turn on reduced motion in your system and hold them again.", "Hold the card and a menu row: neither moves."],
      states: ["menu", "film"],
      demo: ({ state }) => <PressDemo state={state} />,
    },
    {
      id: "chrome",
      name: "The smoked header",
      intro: "basalt-chrome is the app's own sticky header bar: the page colour at 85% (dark) or 92% (light) over a 12px blur, a hairline below, primary ink. It is the only translucent surface in Basalt.",
      decisions: [
        "The owner's decision (7 Nov 2026, council round 2): a smoked sticky header only. Every dialog, sheet, menu, popover, toast and the command menu stays solid. Use the class once per viewport; translucent layers never stack.",
        "New tokens: surface-chrome (dark #000 at 85%, light #fafafa at 92%) and blur-chrome (12px). No saturate, no brightness. It is a class, not a component: a header is the app's own layout.",
        "Fallbacks, all opaque surface-page with no filter: no backdrop-filter, prefers-reduced-transparency, print. Forced colours: Canvas and CanvasText with a real border.",
        "Only primary and secondary text sits on it. Over pure white in dark, secondary is 5.84:1 (tertiary 4.09:1, which fails); over pure black in light it is 6.77:1 (tertiary 4.27:1). The class promotes tertiary text to secondary inside it.",
        "Fix round 2, decided by the council by majority and built (the owner asked to see item 1 before it ships; it is the last frames of this step and the ghost screenshots): a pressed ghost Button in the header takes primary ink (3 to 1); the bar's bottom line is the hairline, 14.5% white in dark, black 8% in light (3 to 1); the bar stays filtered under a dialog's scrim (4 to 0); the NumberField steppers and the Combobox trigger never scale (4 to 0). The owner's rule: no danger Button on the bar.",
        "A browser test opens a Dialog, AlertDialog, Sheet, command menu, Menu, Popover, Select, Combobox, Tooltip and Toast together and asserts that only the header has a backdrop-filter.",
      ],
      tryIt: ["Scroll the page in the first frame.", "Compare the two plates, then the opaque fallback.", "Open the dialog: the scrim is not blurred.", "Turn on forced colours or reduced transparency."],
      states: ["scrolled", "dialog", "ghost"],
      demo: ({ state }) => <ChromeDemo state={state} />,
    },
  ],
};
