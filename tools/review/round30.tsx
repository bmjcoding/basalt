// Round 30: the second audit fix batch of the components stream (DECISIONS 133, audit-fix-b): accessibility faults the full audit proved, each
// restoring behaviour that docs/foundations.md or a WCAG 2.2 A or AA criterion Basalt already commits to. No rendered pixel changes at rest
// (the build's pixel comparison against the base is in the PR), so there was no vote: AGENTS.md calls "bug fixes that restore documented
// behaviour" engineering. The design panel has not reviewed any of it, and nothing in it asks them to. Every word is synthetic.
//
// The states are real. "focus" and "focus-last" move keyboard focus to the part in question before the shot; "open", "typed" and "arrowed"
// open the command menu and type into it; "touch" is a coarse-pointer page (build.mjs turns touch on for it); "flip" mounts a page left to
// right and turns it right to left; "legacy" rewrites the page's own stylesheet so the function name light-dark() is unknown, which is what a
// browser without it sees; "forced-colours" and "reduced-motion" are the same page under those emulations. The readouts and the hit-box
// overlay are drawn by this review page only: Basalt draws neither.

import * as React from "react";

import {
  Button,
  ChoiceCard,
  ChoiceCardGroup,
  Checkbox,
  CommandList,
  CommandMenu,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  HomeGlyph,
  Link,
  MessagesGlyph,
  Pagination,
  Segment,
  SegmentedControl,
  Slider,
  Stepper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  Text,
  TextMorph,
  TabBar,
  TabBarItem,
  TrendsGlyph,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
// A readout is the review page's, drawn above the scrim of a modal so it can be read beside it.
const readout: React.CSSProperties = { position: "fixed", insetInline: 16, bottom: 16, zIndex: 100000, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.5 };

// ---- 1. A table that scrolls sideways, reached by keyboard ----

function TableRegionDemo({ state }: { state: string }) {
  const frame = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (state.startsWith("focus")) window.setTimeout(() => frame.current?.focus(), 150);
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 420 }}>
      {caption("Seven columns in a phone-width box. While the table overflows, its frame is a keyboard stop, named by the label prop, with the control ring.")}
      <TableContainer ref={frame} label="Runs table">
        <Table columns={[{ width: 140 }, { width: 120 }, { width: 120 }, { width: 120 }, { width: 120 }, { width: 120 }, {}]} minWidth={860}>
          <TableHeader>
            <TableRow>
              {["Run", "Region", "Status", "Started", "Agent", "Commit", "Duration"].map((name) => <TableHead key={name}>{name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[["run-0142", "Frankfurt", "Ready", "10:13", "claude", "a81f3c2", "4m 12s"], ["run-0141", "Ashburn", "Building", "10:02", "codex", "9c04e1d", "2m 50s"]].map((cells) => (
              <TableRow key={cells[0]}>{cells.map((cell, i) => <TableCell key={i}>{cell}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ---- 2. The phone tab bar and a focused link ----

function TabBarDemo({ state }: { state: string }) {
  const last = React.useRef<HTMLAnchorElement>(null);
  React.useEffect(() => {
    if (state === "focus-last") window.setTimeout(() => last.current?.focus(), 150);
  }, [state]);
  return (
    <>
      <div style={{ padding: 16 }}>
        {caption("Focus is on the last link. The page scrolls it clear of the bar by the bar's height, its inset and 16px, as it does for the header.")}
        <div style={{ paddingBottom: "calc(var(--basalt-bottom-offset) + var(--basalt-space-6))" }}>
          {Array.from({ length: 24 }, (_, i) => <Link key={i} ref={i === 23 ? last : undefined} href={`#l${i}`} style={{ display: "block", padding: "10px 0" }}>Filler link {i + 1}</Link>)}
        </div>
      </div>
      <TabBar>
        <TabBarItem icon={HomeGlyph} href="#home" current>Home</TabBarItem>
        <TabBarItem icon={MessagesGlyph} href="#messages">Messages</TabBarItem>
        <TabBarItem icon={TrendsGlyph} href="#trends">Trends</TabBarItem>
      </TabBar>
    </>
  );
}

// ---- 3. The command menu names the lit row ----

const COMMANDS = [{ label: "Sandbox", commands: [{ id: "new", label: "New sandbox" }, { id: "dep", label: "Deploy sandbox" }, { id: "dup", label: "Duplicate sandbox" }, { id: "del", label: "Delete sandbox" }] }];

function type(text: string) {
  const field = document.querySelector<HTMLInputElement>(".basalt-command-input");
  if (!field) return;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  set.call(field, text);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function CommandReadout() {
  const [text, setText] = React.useState("");
  React.useEffect(() => {
    const read = () => {
      const field = document.querySelector(".basalt-command-input");
      const lit = document.querySelector("[cmdk-item][data-selected='true']");
      const named = field?.getAttribute("aria-activedescendant");
      const target = named ? document.getElementById(named) : null;
      setText(`the field's aria-activedescendant names: ${named ? (target?.textContent ?? "a row that is not there") : "nothing"}\nthe lit row is:                         ${lit?.textContent ?? "none"}\nsame row: ${named && named === lit?.id ? "yes" : "NO"}`);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-selected", "aria-activedescendant"] });
    return () => observer.disconnect();
  }, []);
  return <pre style={{ ...readout, margin: 0 }}>{text}</pre>;
}

function CommandDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state !== "default");
  React.useEffect(() => {
    if (state !== "typed" && state !== "arrowed") return undefined;
    // Once cmdk has arrived: type "dep"; for "arrowed", clear, move down twice, then type "del".
    const timers: number[] = [];
    const wait = window.setInterval(() => {
      if (!document.querySelector("[cmdk-item]")) return;
      window.clearInterval(wait);
      timers.push(window.setTimeout(() => type("dep"), 50));
      if (state === "arrowed") {
        timers.push(window.setTimeout(() => type(""), 150));
        timers.push(window.setTimeout(() => {
          const field = document.querySelector(".basalt-command-input");
          for (let i = 0; i < 2; i += 1) field?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        }, 250));
        timers.push(window.setTimeout(() => type("del"), 350));
      }
    }, 30);
    return () => { window.clearInterval(wait); timers.forEach(window.clearTimeout); };
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      {caption("The command menu, open. The readout is the review page's: the field's own aria-activedescendant against the row that is lit, at this moment.")}
      <Button onClick={() => setOpen(true)}>Open the command menu</Button>
      <CommandMenu open={open} onOpenChange={setOpen} groups={COMMANDS} />
      {open ? <CommandReadout /> : null}
    </div>
  );
}

// ---- 4. A dialog over a page with a morphing button ----

const CONTROLS = "a[href], button, input:not([type='hidden']), select, textarea, [role='button'], [role='slider'], [role='checkbox'], [tabindex]:not([tabindex='-1'])";

function OutsideReadout() {
  const [text, setText] = React.useState("");
  React.useEffect(() => {
    const read = () => {
      const modal = document.querySelector("[role='dialog']");
      if (!modal) { setText("no dialog open"); return; }
      const outside = [...document.querySelectorAll<HTMLElement>(CONTROLS)].filter((el) => !modal.contains(el) && !el.closest("[data-wt-readout]"));
      const reachable = outside.filter((el) => !el.closest("[aria-hidden='true'], [inert]"));
      setText(`controls outside the dialog: ${outside.length}\nreachable by assistive technology: ${reachable.length}${reachable.length ? ` (${reachable.map((el) => el.textContent?.trim() || el.getAttribute("aria-label")).join(", ")})` : ""}`);
    };
    const timer = window.setInterval(read, 150);
    read();
    return () => window.clearInterval(timer);
  }, []);
  return <pre data-wt-readout="" style={{ ...readout, margin: 0 }}>{text}</pre>;
}

function ModalDemo({ state }: { state: string }) {
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      {caption("A page with a button whose label morphs, a stepper and a slider, and a dialog open over it. The label keeps announcing while the dialog is closed; while it is open nothing outside it is reachable.")}
      <div style={row}>
        <Button><TextMorph text="Continue" /></Button>
        <Stepper steps={[{ id: "a", label: "Name it" }, { id: "b", label: "Route it" }]} value="a" onValueChange={() => {}} />
      </div>
      <Slider label="Volume" defaultValue={30} />
      <Dialog defaultOpen={state === "open"}>
        <DialogTrigger render={<Button variant="danger">Delete sandbox</Button>} />
        <DialogContent>
          <DialogTitle>Delete blacksand-api?</DialogTitle>
          <DialogDescription>Its runs stay. The sandbox and its routes are removed.</DialogDescription>
          <DialogActions><DialogClose render={<Button>Cancel</Button>} /><Button variant="danger">Delete</Button></DialogActions>
        </DialogContent>
      </Dialog>
      <OutsideReadout />
    </div>
  );
}

// ---- 5. The hit box of a lone checkbox and link in a table, on touch ----

function HitBoxes() {
  const [boxes, setBoxes] = React.useState<Array<{ left: number; top: number; width: number; height: number; drawn: DOMRect }>>([]);
  React.useEffect(() => {
    const measure = () => {
      const found = [...document.querySelectorAll<HTMLElement>("[data-wt-hit] .basalt-checkbox, [data-wt-hit] td a")].map((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const owns = (x: number, y: number) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)); };
        const reach = (dx: number, dy: number) => { let d = 0; while (d < 80 && owns(cx + dx * (d + 1), cy + dy * (d + 1))) d += 1; return d; };
        const left = reach(-1, 0); const right = reach(1, 0); const up = reach(0, -1); const down = reach(0, 1);
        return { left: cx - left, top: cy - up, width: left + right + 1, height: up + down + 1, drawn: r };
      });
      setBoxes(found);
    };
    const timer = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(timer); window.removeEventListener("resize", measure); };
  }, []);
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100000 }}>
      {boxes.map((b, i) => <div key={i} style={{ position: "absolute", left: b.left, top: b.top, width: b.width, height: b.height, outline: "1px dashed var(--basalt-text-primary)", background: "color-mix(in srgb, var(--basalt-text-primary) 8%, transparent)" }} />)}
      <div style={{ ...readout, position: "fixed" }}>dashed boxes: where a tap lands on the control ({boxes.map((b) => `${Math.round(b.width)}×${Math.round(b.height)}`).join(", ")}). The review page draws them; Basalt draws nothing.</div>
    </div>
  );
}

function HitBoxDemo({ state }: { state: string }) {
  return (
    <div style={{ ...col, maxWidth: 420 }} data-wt-hit="">
      {caption("On a coarse pointer a lone checkbox or link in a cell has a 44px hit box. The drawn control is the same size and the rows stay 44px.")}
      <TableContainer label="Runs table">
        <Table columns={[{ width: 56 }, { width: 150 }, {}]}>
          <TableHeader><TableRow><TableHead><Checkbox aria-label="Select all runs" /></TableHead><TableHead>Run</TableHead><TableHead>Region</TableHead></TableRow></TableHeader>
          <TableBody>
            {["run-0142", "run-0141"].map((id, i) => (
              <TableRow key={id}><TableCell><Checkbox aria-label={`Select ${id}`} /></TableCell><TableCell><Link href={`#${id}`}>{id}</Link></TableCell><TableCell>{i ? "Ashburn" : "Frankfurt"}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {state === "touch" ? <HitBoxes /> : null}
    </div>
  );
}

// ---- 6. Right to left ----

function RtlDemo({ state }: { state: string }) {
  const [dir, setDir] = React.useState(state === "flip" ? "ltr" : "rtl");
  React.useEffect(() => {
    if (state !== "flip") return undefined;
    const timer = window.setTimeout(() => setDir("rtl"), 500);
    return () => window.clearTimeout(timer);
  }, [state]);
  React.useEffect(() => {
    document.documentElement.dir = dir;
    return () => { document.documentElement.dir = "ltr"; };
  }, [dir]);
  return (
    <div style={{ ...col, maxWidth: 480 }}>
      {caption(`dir="${dir}". The underline follows the selected tab (after a flip too), and the numeric header's label ends on the numbers' edge.`)}
      <Tabs defaultValue="b">
        <TabsList aria-label="Sections"><Tab value="a">Runs</Tab><Tab value="b">Regions</Tab><Tab value="c">Agents</Tab></TabsList>
      </Tabs>
      <TableContainer label="Counts">
        <Table columns={[{}, { width: 140 }]} minWidth={360}>
          <TableHeader><TableRow><TableHead>Region</TableHead><TableHead numeric onSortChange={() => {}}>Runs</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>Frankfurt</TableCell><TableCell numeric>1,284</TableCell></TableRow>
            <TableRow><TableCell>Ashburn</TableCell><TableCell numeric>96</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ---- 7. Forced colours: the selected tab, pressed segment and current page, focused ----

function ForcedFocusDemo({ state }: { state: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!state.startsWith("focus")) return undefined;
    const timer = window.setTimeout(() => host.current?.querySelector<HTMLElement>("[role='tab'][aria-selected='true']")?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div ref={host} style={{ ...col, maxWidth: 520 }}>
      {caption("The selected tab, the pressed segment and the current page, with keyboard focus on the tab (the others at rest). Focus draws the standard ring; the selected mark at rest is unchanged.")}
      <Tabs defaultValue="a"><TabsList aria-label="Sections"><Tab value="a">Runs</Tab><Tab value="b">Regions</Tab></TabsList></Tabs>
      <SegmentedControl aria-label="Range" defaultValue="week"><Segment value="day">Day</Segment><Segment value="week">Week</Segment><Segment value="month">Month</Segment></SegmentedControl>
      <Pagination page={2} pageCount={5} onPageChange={() => {}} />
    </div>
  );
}

// ---- 8. The four selected fills, with light-dark() unknown ----

function FillsDemo({ state }: { state: string }) {
  // The command list lights its first row while its field has focus: focus it once cmdk has arrived, so the plate shows in both shots.
  React.useEffect(() => {
    const wait = window.setInterval(() => {
      const field = document.querySelector<HTMLInputElement>(".basalt-command-input");
      if (!field || !document.querySelector("[cmdk-item]")) return;
      window.clearInterval(wait);
      field.focus({ preventScroll: true });
    }, 30);
    return () => window.clearInterval(wait);
  }, []);
  React.useLayoutEffect(() => {
    if (state !== "legacy") return;
    // What a browser without light-dark() sees: the function name is not one it knows.
    for (const style of document.querySelectorAll("style")) if (style.textContent?.includes("light-dark(")) style.textContent = style.textContent.replaceAll("light-dark(", "light-dark-unknown(");
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 520 }}>
      {caption(state === "legacy" ? "The page's own stylesheet with the function name light-dark() made unknown. The four fills still paint." : "As shipped: the lit row's plate, the segment pill, the selected choice card and the pressed toggle.")}
      <SegmentedControl aria-label="Range" defaultValue="week"><Segment value="day">Day</Segment><Segment value="week">Week</Segment></SegmentedControl>
      <ChoiceCardGroup><ChoiceCard title="Pro" description="For teams that deploy daily." defaultChecked /></ChoiceCardGroup>
      <div style={row}><Button variant="secondary" aria-pressed>Pause animations</Button><Button variant="ghost" aria-pressed>Pinned</Button></div>
      <CommandList label="Commands" groups={COMMANDS} />
    </div>
  );
}

export const ROUND_30: Round = {
  id: "30",
  title: "Accessibility faults the audit proved: keyboard, focus, the command menu, a modal's outside, touch, right-to-left and forced colours",
  reviewed: false,
  summary:
    "The second audit fix batch of the components stream (DECISIONS 133): eleven findings from the full audit, each restoring behaviour that foundations or a WCAG 2.2 A or AA criterion already commits to. A table that scrolls sideways is a named keyboard stop; focus is never under the phone tab bar; the command menu's field names the lit row, and the lazy list keeps focus; an open modal leaves nothing outside it operable; a table's lone checkbox and link have 44px hit boxes on touch; the tabs' underline and the numeric header follow right-to-left; code and transcript regions have a role; TabBar and TableScrollHint forward their refs; the selected tab, pressed segment and current page show the focus ring in forced colours; the selected fills paint without light-dark(); and the header bar prints static. Nothing changes at rest: the pixel comparison against the base is in the PR. There was no vote (a bug fix that restores documented behaviour is engineering), and the design panel has not reviewed this. Every word is synthetic.",
  steps: [
    {
      id: "table-region",
      name: "A table that scrolls sideways is a keyboard stop",
      intro: "TableContainer's label prop. While its table overflows, the frame is tabindex 0, role region, with that name and the control ring.",
      widths: [390],
      scales: [1, 2],
      height: 520,
      decisions: [
        "Engineering, no vote: the HTML skill's .table-wrap already is tabindex=0 role=region with a label and the control ring (WCAG 2.1.1).",
        "With no label, aria-label or aria-labelledby, the frame is still a stop (the scroll must be reachable) but gets no role, because a region with no name is not a landmark. A table that fits is none of this.",
      ],
      tryIt: ["Tab to the table, then press the arrow keys: it scrolls sideways."],
      states: ["focus", "focus-forced-colours", "focus-reduced-motion"],
      demo: ({ state }) => <TableRegionDemo state={state} />,
    },
    {
      id: "tab-bar-focus",
      name: "Focus is never under the phone tab bar",
      intro: "The page's scroll-padding-bottom is the bar's height, its inset and space-4 while a bar is present, as scroll-padding-top is for the header.",
      widths: [390],
      scales: [1, 2],
      height: 700,
      decisions: ["Engineering, no vote (WCAG 2.4.11): it changes where the page scrolls to on focus, not a pixel at rest. The HTML skill's tab-bar module carries the same rule."],
      tryIt: ["Tab down the links: each one stops above the bar, never behind it."],
      states: ["focus-last", "focus-last-reduced-motion"],
      demo: ({ state }) => <TabBarDemo state={state} />,
    },
    {
      id: "command-menu",
      name: "The command menu's field names the lit row",
      intro: "The field's aria-activedescendant follows the lit row at every moment, in the dialog's panel as in the in-page list. The lazy list also keeps keyboard focus when it arrives.",
      widths: [1440, 390],
      scales: [1],
      height: 640,
      decisions: ["Engineering, no vote (WCAG 4.1.2): one hook shared by both panels; the in-page list already did this."],
      tryIt: ["Type, arrow, type again, clear: the readout always says the same row."],
      states: ["open", "typed", "arrowed"],
      demo: ({ state }) => <CommandDemo state={state} />,
    },
    {
      id: "modal-outside",
      name: "An open modal leaves nothing outside it operable",
      intro: "Base UI hides the page behind a modal but skips anything holding an aria-live node, which left a morphing button reachable. Controls outside an open modal are now inert while it is open.",
      widths: [1440, 390],
      scales: [1],
      height: 640,
      decisions: [
        "Route taken: the controls the modal left exposed are made inert while it is open (the audit's second suggestion), not TextMorph's live region made opt-in. Nothing outside a modal changes: the label is still one polite live region, and so is every other live region that is not inside a control. The toast stack stays operable.",
        "What a screen reader is told when a morphing label changes: with no modal open, the whole string once, politely, as before. With a modal open, nothing: the button is out of the tree. The slider's printed value is aria-hidden and no longer marked aria-live off.",
      ],
      tryIt: ["Open the dialog: the readout counts the controls outside it and how many assistive technology can reach."],
      states: ["open"],
      demo: ({ state }) => <ModalDemo state={state} />,
    },
    {
      id: "touch-hit-box",
      name: "A cell's checkbox and link have a 44px hit box on touch",
      intro: "The drawn control is the same size and the rows stay 44px; the box draws nothing.",
      widths: [390],
      scales: [1, 2],
      height: 420,
      decisions: ["Engineering, no vote: AGENTS.md's 44px touch rule, as a labelled checkbox already meets it. The link takes its box from padding that an equal negative margin gives back, and its focus ring offset is pulled in by the same amount, so the ring hugs the text as before."],
      tryIt: ["On a phone, tap just beside a checkbox or under a link name: it still lands."],
      states: ["touch"],
      demo: ({ state }) => <HitBoxDemo state={state} />,
    },
    {
      id: "rtl",
      name: "Right to left: the underline and the numeric column",
      intro: "The horizontal tabs' underline sits under the selected tab, including after the page's direction flips while it is open; a numeric column's header and numbers share one edge.",
      widths: [1440, 390],
      scales: [1],
      height: 520,
      decisions: [
        "Engineering, no vote. The audit's repro changed dir after mount: with dir right from the start the underline was already under the tab, and a flip left it where the tab was. The tabs list now measures again when the direction changes.",
        "Left to right is unchanged: the headers and numbers keep their computed alignments.",
      ],
      tryIt: ["Choose another tab: the underline slides to it."],
      states: ["flip"],
      demo: ({ state }) => <RtlDemo state={state} />,
    },
    {
      id: "forced-focus",
      name: "Forced colours: focus on the selected tab",
      intro: "The selected tab, the pressed segment and the current page carry an inset Highlight outline as their selected mark. With keyboard focus the standard ring draws instead of hiding.",
      widths: [1440, 390],
      scales: [1],
      height: 520,
      decisions: [
        "Engineering for the focus half only (restores the documented ring). What marks selected in forced colours is a design question for the council: the mark at rest is exactly as it was.",
      ],
      tryIt: ["Turn on forced colours and Tab to the selected tab."],
      states: ["forced-colours", "focus-forced-colours"],
      demo: ({ state }) => <ForcedFocusDemo state={state} />,
    },
    {
      id: "no-light-dark",
      name: "The selected fills without light-dark()",
      intro: "Safari before 17.5, Chrome before 123 and Firefox before 120 do not know light-dark(). The lit row's plate, the segment pill, the selected choice card and the pressed toggle are mixed there instead of picked.",
      widths: [1440, 390],
      scales: [1],
      height: 700,
      decisions: ["Engineering, no vote: a browser with light-dark() skips the fallback, so not one pixel changes there; the two shots below should look the same."],
      tryIt: ["Compare the default and legacy shots in the zip."],
      states: ["legacy"],
      demo: ({ state }) => <FillsDemo state={state} />,
    },
  ],
};
