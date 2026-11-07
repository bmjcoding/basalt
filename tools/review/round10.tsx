// Round 10: the owner's two decisions after the council's second round. The .98 press on Button and
// IconButton, and the smoked sticky header (`basalt-chrome`). Both are built as decided; nothing here is an
// option. The implementation has not been reviewed by the design panel.
//
// A press is `:active`, which a screenshot cannot hold, so the specimen draws a button at rest beside the
// same button with the pressed styles applied inline. Hold the live buttons to feel the real thing.

import { CopyIcon, GearIcon } from "@phosphor-icons/react";
import * as React from "react";

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

function PressDemo({ state }: { state: string }) {
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

      <Caption>At rest, and held down (drawn: the pressed colour and a scale of .98)</Caption>
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

/** Content to scroll under the bar: type, a table and a card, so the blur has something to blur. */
function Field() {
  return (
    <div className="wt-chrome-field">
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
    if (ref.current) ref.current.scrollTop = scrolled ? 120 : 0;
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

/** The shipped fallbacks, drawn: opaque page colour and no filter. Scoped to the one frame that shows them. */
const opaqueCss = `@layer review-options {
  .wt-chrome-opaque .basalt-chrome { background: var(--basalt-surface-page); -webkit-backdrop-filter: none; backdrop-filter: none; }
}`;

function ChromeDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state === "dialog");
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
      ],
      tryIt: ["Hold each live button down, then let go.", "Turn on reduced motion in your system and hold them again.", "Hold the card and a menu row: neither moves."],
      states: ["menu"],
      demo: ({ state }) => <PressDemo state={state} />,
    },
    {
      id: "chrome",
      name: "The smoked header",
      intro: "basalt-chrome is the app's own sticky header bar: the page colour at 85% (dark) or 92% (light) over a 12px blur, a divider below, primary ink. It is the only translucent surface in Basalt.",
      decisions: [
        "The owner's decision (7 Nov 2026, council round 2): a smoked sticky header only. Every dialog, sheet, menu, popover, toast and the command menu stays solid. One backdrop-filter per viewport; translucent layers never stack.",
        "New tokens: surface-glass-chrome (dark #000 at 85%, light #fafafa at 92%) and blur-chrome (12px). No saturate, no brightness. It is a class, not a component: a header is the app's own layout.",
        "Fallbacks, all opaque surface-page with no filter: no backdrop-filter, prefers-reduced-transparency, print. Forced colours: Canvas and CanvasText with a real border.",
        "Only primary and secondary text sits on it. Over pure white in dark, secondary is 5.84:1 (tertiary 4.09:1, which fails); over pure black in light it is 6.77:1 (tertiary 4.27:1). The class promotes tertiary text to secondary inside it.",
        "A browser test opens a Dialog, AlertDialog, Sheet, command menu, Menu, Popover, Select, Combobox, Tooltip and Toast together and asserts that only the header has a backdrop-filter.",
      ],
      tryIt: ["Scroll the page in the first frame.", "Compare the two plates, then the opaque fallback.", "Open the dialog: the scrim is not blurred.", "Turn on forced colours or reduced transparency."],
      states: ["scrolled", "dialog"],
      demo: ({ state }) => <ChromeDemo state={state} />,
    },
  ],
};
