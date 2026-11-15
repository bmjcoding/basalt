// Round 37: the fourth audit fix batch of the components stream (DECISIONS 133 and 135): a card title and an accordion header take a
// heading level, the Stepper says where the user is, a toast with an action says that it has one, and the Toolbar, an unstyled wrapper
// on Base UI's. Nothing at rest changes (the build's pixel comparison against the base is in the PR). There was no vote on the first
// three (restoring behaviour the audit proved missing is engineering) and the council ruled the Toolbar engineering as a wrapper with no
// styles of its own (DECISIONS 135, 2 to 1). The design panel has not reviewed this implementation. Every word is synthetic.
//
// The readouts, the printed trees and the layout around the parts are this review page's own: Basalt draws none of them. A tree is this
// page's reading of the DOM (an element's role and name, with what is hidden from assistive technology left out); the tests read
// Chromium's own accessibility tree. "focus-first", "focus-middle" and "focus-last" move keyboard focus to that control before the shot.

import {
  CaretDownIcon,
  InfoIcon,
  LinkIcon,
  ShareNetworkIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import * as React from "react";

import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  Stepper,
  Text,
  ToastProvider,
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarIconButton,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
  useToast,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };

// ---- A reader for this page: the roles and names a screen reader is given, from the DOM ----

const IMPLICIT: Record<string, string> = { BUTTON: "button", A: "link", INPUT: "textbox", H1: "heading 1", H2: "heading 2", H3: "heading 3", H4: "heading 4", H5: "heading 5", H6: "heading 6", P: "" };
const FROM_CONTENT = new Set(["button", "link", "menuitem", "heading 1", "heading 2", "heading 3", "heading 4", "heading 5", "heading 6"]);

function roleOf(el: Element): string {
  return el.getAttribute("role") ?? IMPLICIT[el.tagName] ?? "";
}
function nameOf(el: Element): string {
  const label = el.getAttribute("aria-label");
  if (label) return label;
  const by = el.getAttribute("aria-labelledby");
  if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
  return FROM_CONTENT.has(roleOf(el)) ? spoken(el) : "";
}
/** The text assistive technology reads inside an element: what is not aria-hidden, in order. */
function spoken(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (!(node instanceof Element) || node.getAttribute("aria-hidden") === "true") return "";
  return [...node.childNodes].map(spoken).join("").replace(/\s+/g, " ").trim();
}
function walk(node: Node, depth: number, out: string[]) {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) out.push(`${"  ".repeat(depth)}text: "${text}"`);
    return;
  }
  if (!(node instanceof Element) || node.getAttribute("aria-hidden") === "true" || node.hasAttribute("inert") || node.tagName === "STYLE") return;
  const role = roleOf(node);
  if (role) {
    const name = nameOf(node);
    const state = [node.getAttribute("aria-disabled") === "true" ? "disabled" : "", node.getAttribute("aria-expanded") === "true" ? "expanded" : ""].filter(Boolean).join(", ");
    out.push(`${"  ".repeat(depth)}${role}${name ? ` "${name}"` : ""}${state ? ` [${state}]` : ""}`);
    if (FROM_CONTENT.has(role)) return;
  }
  for (const child of node.childNodes) walk(child, role ? depth + 1 : depth, out);
}

/** A printed tree of what is inside `ref`, read again after every render and every change to its subtree. */
function Tree({ target, title }: { target: React.RefObject<HTMLElement | null>; title: string }) {
  const [lines, setLines] = React.useState<string[]>([]);
  React.useEffect(() => {
    const el = target.current;
    if (!el) return undefined;
    const read = () => { const out: string[] = []; walk(el, 0, out); setLines((now) => (now.join("\n") === out.join("\n") ? now : out)); };
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { subtree: true, childList: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [target]);
  return <pre style={mono} aria-hidden="true"><b>{title}</b>{"\n"}{lines.join("\n")}</pre>;
}

// ---- 1. Heading levels ----

function Outline({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const [lines, setLines] = React.useState<string[]>([]);
  React.useEffect(() => {
    const el = target.current;
    if (!el) return;
    setLines([...el.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => `${"  ".repeat(Number(h.tagName[1]) - 1)}h${h.tagName[1]}  ${spoken(h)}`));
  }, [target]);
  return <pre style={mono} aria-hidden="true"><b>The page's heading outline</b>{"\n"}{lines.join("\n")}</pre>;
}

function LevelsDemo({ state }: { state: string }) {
  const page = React.useRef<HTMLDivElement>(null);
  const before = state === "before";
  const level = (n: 2 | 3 | 4) => (before ? undefined : n);
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption(before ? "As it was: a card title and an accordion header were always h3, so this page's outline jumps from h1 to h3." : "A card at level 2, one at 3 and one at 4, an accordion at 2, 3 and 4. Every level draws exactly as the h3 did: same size, weight and box.")}
      <div ref={page} style={col}>
        <Heading level={1} size="xl">Sandbox runs</Heading>
        <Card><CardHeader><CardTitle level={level(2)}>Recent runs</CardTitle><CardDescription>Last seven days</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle level={level(3)}>Failed runs</CardTitle><CardDescription>Under Recent runs</CardDescription></CardHeader></Card>
        <Card><CardContent><CardTitle level={level(4)}>Retries</CardTitle></CardContent></Card>
        <Accordion defaultValue={["a"]}>
          <AccordionItem value="a" headingLevel={level(2)} title="Details">Region, agent and commit for each run.</AccordionItem>
          <AccordionItem value="b" headingLevel={level(3)} title="Settings">Timeouts and retries.</AccordionItem>
          <AccordionItem value="c" headingLevel={level(4)} title="Limits">Concurrency and quotas.</AccordionItem>
        </Accordion>
      </div>
      <Outline target={page} />
    </div>
  );
}

// ---- 2. The Stepper ----

const STEPS = [{ id: "details", label: "Details" }, { id: "review", label: "Review" }, { id: "confirm", label: "Confirm" }];

function StepperDemo({ state }: { state: string }) {
  const start = state.startsWith("step-") ? STEPS[Number(state.slice(5)) - 1]?.id ?? "details" : "details";
  const [value, setValue] = React.useState(start);
  const box = React.useRef<HTMLDivElement>(null);
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      {caption("Back and Next move through the steps. The group is named, and the step's name is read with where the user is: once, from the step name's own live region.")}
      <div ref={box}><Stepper steps={STEPS} value={value} onValueChange={setValue} /></div>
      <Tree target={box} title="What a screen reader is given" />
    </div>
  );
}

// ---- 3. A toast with an action ----

function Said() {
  const [said, setSaid] = React.useState<string[]>([]);
  React.useEffect(() => {
    const read = () => setSaid((now) => { const next = [...document.querySelectorAll("[role=status] p, [role=alert] p")].map((p) => p.textContent ?? ""); return now.join("|") === next.join("|") ? now : next; });
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return <pre style={mono} aria-hidden="true"><b>Announced, from the text-only live regions</b>{"\n"}{said.map((text) => `"${text}"`).join("\n") || "(nothing yet)"}</pre>;
}

function ToastDemo({ state }: { state: string }) {
  const toast = useToast();
  React.useEffect(() => {
    if (state !== "shown") return;
    // The newest sits in front, so the one with an action is shown first and sits in front of the plain one.
    toast.show({ title: "Copied", description: "The run link is on the clipboard.", home: "page" });
    toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed.", action: { label: "Undo", onClick: () => {} }, home: "centre" });
  }, [state, toast]);
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption("Two toasts: one with an action (in front), one without. Only the announcement of the one with an action says an action exists and that F6 reaches it. Nothing extra is drawn, and each is announced once.")}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button onClick={() => toast.show({ title: "Sandbox deleted", action: { label: "Undo", onClick: () => {} }, home: "centre" })}>Delete with undo</Button>
        <Button variant="ghost" onClick={() => toast.show({ title: "Copied", home: "page" })}>Copy a link</Button>
      </div>
      <Said />
    </div>
  );
}

// ---- 4. The Toolbar ----

function ToolbarDemo({ state }: { state: string }) {
  const bar = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = React.useState("");
  React.useEffect(() => {
    const items = [...(bar.current?.querySelectorAll<HTMLElement>("[data-basalt-toolbar-item]") ?? [])].filter((item) => item.closest("[role=toolbar]") === bar.current);
    const target = state === "focus-first" ? items[0] : state === "focus-middle" ? items[Math.floor(items.length / 2)] : state === "focus-last" ? items[items.length - 1] : undefined;
    if (!target) return undefined;
    const timer = window.setTimeout(() => { target.focus(); setFocused(target.getAttribute("aria-label") ?? target.textContent ?? ""); }, 150);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      {caption(`A horizontal toolbar of Basalt's own controls: one tab stop, Left and Right between them, Home and End to the ends. It is one row at every width, so "horizontal" is true of what is drawn; the row scrolls at phone width. ${focused ? `Focus is on ${focused}.` : ""}`)}
      {/* The row's gap, its scroll and the room for the focus ring are this page's own layout: a toolbar draws nothing. */}
      <div style={{ overflowX: "auto", padding: 4, margin: -4 }}>
        <Toolbar ref={bar} aria-label="Formatting" style={{ display: "flex", gap: 8, alignItems: "center", width: "max-content" }}>
          <ToolbarGroup aria-label="Text" style={{ display: "flex", gap: 4 }}>
            <ToolbarButton variant="ghost" icon={TextBIcon}>Bold</ToolbarButton>
            <ToolbarIconButton icon={TextItalicIcon} label="Italic" />
            <ToolbarIconButton icon={TextUnderlineIcon} label="Underline" pressed />
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarInput aria-label="Find" placeholder="Find" controlSize="sm" style={{ width: 120 }} />
          <ToolbarLink href="#docs">Docs</ToolbarLink>
          <Menu defaultOpen={state === "menu"} modal={false}>
            <MenuTrigger render={<ToolbarButton iconEnd={CaretDownIcon}>Format</ToolbarButton>} />
            <MenuContent><MenuItem>Clear formatting</MenuItem><MenuItem>Heading 2</MenuItem><MenuItem>Heading 3</MenuItem></MenuContent>
          </Menu>
          <Popover>
            <PopoverTrigger render={<ToolbarIconButton icon={InfoIcon} label="Details" />} />
            <PopoverContent><PopoverTitle>Formatting</PopoverTitle><Text size="sm">Applies to the selection.</Text></PopoverContent>
          </Popover>
          <ToolbarButton disabled icon={ShareNetworkIcon}>Share</ToolbarButton>
          <ToolbarIconButton icon={LinkIcon} label="Copy link" />
        </Toolbar>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Toolbar aria-label="Alignment" orientation="vertical" style={{ display: "flex", flexDirection: "column", gap: 4, width: "max-content" }}>
          <ToolbarIconButton icon={TextAlignLeftIcon} label="Align left" />
          <ToolbarIconButton icon={TextAlignCenterIcon} label="Align centre" />
          <ToolbarIconButton icon={TextAlignRightIcon} label="Align right" />
        </Toolbar>
        {caption("A vertical toolbar: Up and Down. A toolbar whose controls wrap into a grid is neither, so it should not be one.")}
      </div>
    </div>
  );
}

export const ROUND_37: Round = {
  id: "37",
  title: "Heading levels, the Stepper's position, a toast's action and the Toolbar",
  reviewed: false,
  summary:
    "The fourth audit fix batch of the components stream (DECISIONS 133 and 135). A card title and an accordion header take a heading level (2 to 6, h3 by default) so a page keeps its outline, and draw the same at every level. The Stepper is a named group and says \"Step 2 of 3\" with the step's name, once, from the step name's own live region. A toast with an action says in its announcement that the action exists and that F6 reaches it, and nothing more is drawn. The Toolbar is an unstyled wrapper on Base UI's toolbar: one tab stop, arrow keys, Home and End, and Basalt's own Button, IconButton, Link and Input as its controls. Nothing at rest changes: the pixel comparison against the base is in the PR. There was no vote on the first three (restoring behaviour the audit proved missing is engineering); the council ruled the Toolbar engineering, as a wrapper with no styles of its own (DECISIONS 135). The design panel has not reviewed this implementation. Every word is synthetic.",
  steps: [
    {
      id: "heading-levels",
      name: "A card title and an accordion header take a heading level",
      intro: "CardTitle's level and AccordionItem's headingLevel, 2 to 6, h3 when not given. The level is the element only.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 900,
      decisions: [
        "Engineering, no vote (WCAG 1.3.1, the audit's A3-12): a prop shaped and named as Heading's and EmptyState's are, with no pixel changed. The \"before\" state is the page as it was.",
        "A card is never the page's h1, so the level starts at 2, as EmptyState's does.",
      ],
      tryIt: ["Compare the outline beside the page with the one in the \"before\" shot: it no longer jumps from h1 to h3."],
      states: ["before"],
      demo: ({ state }) => <LevelsDemo state={state} />,
    },
    {
      id: "stepper",
      name: "The Stepper says where the user is",
      intro: "A group named \"Steps\", and \"Step 2 of 3: Review\" in the step name's live region. Nothing new is drawn.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 520,
      decisions: [
        "Engineering, no vote (the audit's A3-13). The words are props, so an app can translate them: label for the group (\"Steps\") and positionLabel for the position (\"Step 2 of 3\").",
        "The position rides in the step name's own polite live region (TextMorph's new label prop), so a change is said once and there is no second region to say it twice.",
      ],
      tryIt: ["Press Next and Back: the tree below changes with the step."],
      states: ["step-2", "step-3"],
      demo: ({ state }) => <StepperDemo state={state} />,
    },
    {
      id: "toast-action",
      name: "A toast with an action says it has one",
      intro: "\"Undo is available. Press F6 to reach it.\" ends the announcement of a toast with an action, and only of one.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote (the audit's A3-13). Foundations already gives the stack its F6 route; this says so to someone who cannot see the button. ToastProvider's actionWords prop sets the sentence for translation.",
        "It is said once, from the text-only live regions: the drawn toast is not a live region, and what is drawn does not change.",
      ],
      tryIt: ["Delete with undo, then press F6: focus moves to the stack, and Tab reaches Undo."],
      states: ["shown"],
      demo: ({ state }) => <ToastProvider><ToastDemo state={state} /></ToastProvider>,
    },
    {
      id: "toolbar",
      name: "A toolbar of Basalt's own controls",
      intro: "One tab stop. Left and Right (or Up and Down) between the controls, Home and End to the ends. A menu or popover opened from a control keeps the arrow keys.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote: the council ruled the Toolbar an unstyled wrapper on Base UI's (DECISIONS 135, 2 to 1). It has no class that draws anything: the gap, the row and the scroll in the shots are this review page's own layout.",
        "ToolbarSeparator draws nothing. How a separator looks is a design decision the build does not make; the toolbar is usable without one.",
        "Base UI's toolbar does not handle Home and End, and reads its own direction provider rather than the page; Basalt's Toolbar adds both, and keeps a vertical toolbar's Up and Down from opening a menu button's menu.",
      ],
      tryIt: ["Tab into the toolbar, then Left, Right, Home and End; open Format with Enter and arrow inside it."],
      states: ["focus-first", "focus-middle", "focus-last", "menu"],
      demo: ({ state }) => <ToolbarDemo state={state} />,
    },
  ],
};
