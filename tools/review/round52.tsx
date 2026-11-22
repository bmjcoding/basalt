// Round 52: what CIMIP's Declare dialog needed from Basalt (DECISIONS 237, 239 to 242). The owner decided Declare's looks in CIMIP (a sliding pill for severity with nothing chosen at first, two columns on
// one grid, a text button on the Title's label row); Basalt takes the gaps in without a vote (DECISIONS 242, under DECISIONS 234), and the implementation has not been reviewed. Declare is drawn here from Basalt's
// own parts with synthetic words: the form grid, a wide form dialog that keeps the form's first focus, `SegmentedControl` `fullWidth` / `required` / `invalid` in a `Field`, `TextButton` keeping focus and holding
// the width of its words, a `Switch` description, and `ActionShortcut` in the foot. States: the default (empty), `filled`, `errors` (all three at once) and `scrolled` (the body scrolled to its end, for the phone's foot).

import * as React from "react";

import {
  ActionShortcut,
  Button,
  Combobox,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
  Form,
  FormGrid,
  FormGridItem,
  Input,
  Reserve,
  Segment,
  SegmentedControl,
  SheetBody,
  SheetFooter,
  SheetHeader,
  Switch,
  Text,
  Textarea,
  TextButton,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const SEVERITY = [
  ["SEV1", "Customers cannot use a core service."],
  ["SEV2", "A core service is degraded for many customers."],
  ["SEV3", "A feature is degraded for some customers."],
  ["SEV4", "A minor problem with a workaround."],
] as const;
const APPS = [
  { value: "pay", label: "Payments API" },
  { value: "web", label: "Checkout web" },
  { value: "id", label: "Identity" },
  { value: "ledger", label: "Ledger" },
];
const DESCRIPTION = "Checkout is timing out for about one in twenty customers since the 14:05 deploy. Payments API latency is up and the error rate is elevated. We have rolled back the worker change and are watching it.";
const TITLES = ["Checkout timing out for some customers", "Payments API latency and elevated errors after a deploy", "Intermittent checkout failures since the 14:05 deploy"];
const DESCRIPTION_HINT = "The agent starts from this, and it stays inside the room.";
const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");

/** The Title's text button on the label's row, from the owner's pick (DECISIONS 241). Placement is the page's here: Basalt has no slot for it yet. */
const onLabelRow: React.CSSProperties = { gridRow: 1, gridColumn: 1, justifySelf: "end", alignSelf: "start", font: "var(--basalt-font-weight-regular) var(--basalt-text-sm-size) / var(--basalt-text-sm-line-height) var(--basalt-font-family-sans)" };
/** From 720 the label has the form gap above it (a row after the first), so the button on its line takes the same. Only this class: nothing of Basalt's is overridden. */
const LABEL_ROW_CSS = "@media (width >= 720px) { .review-label-action { margin-block-start: var(--basalt-space-4); } }";

function DeclareGaps({ state }: { state: string }) {
  const kind = kindOf(state);
  const filled = kind === "filled";
  const [open, setOpen] = React.useState(false);
  const [errors, setErrors] = React.useState(false);
  const [text, setText] = React.useState(filled ? DESCRIPTION : "");
  const [sev, setSev] = React.useState<string | undefined>(filled ? "SEV2" : undefined);
  const [app, setApp] = React.useState<string | null>(filled ? "pay" : null);
  const [ticket, setTicket] = React.useState(filled ? "SYN-1042" : "");
  const [title, setTitle] = React.useState(filled ? TITLES[0]! : "");
  const [written, setWritten] = React.useState(filled ? 1 : 0);
  const body = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    // Opened by the input the reader would use: a tap on a phone, a click otherwise, so focus goes by it (the title for a touch, the first field for a pointer).
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const opened = window.setTimeout(() => trigger.current?.dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true, pointerType: coarse ? "touch" : "mouse", detail: 1 })), 60);
    const failed = kind === "errors" ? window.setTimeout(() => setErrors(true), 420) : 0;
    const scrolled = kind === "scrolled" ? window.setTimeout(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; }, 420) : 0;
    return () => { window.clearTimeout(opened); window.clearTimeout(failed); window.clearTimeout(scrolled); };
  }, [kind]);
  const canWrite = text.trim().length >= 10;
  const spent = written >= 3;
  const generate = () => { setTitle(TITLES[written % TITLES.length]!); setWritten((n) => n + 1); };
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)" }}>
      <style>{LABEL_ROW_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--basalt-space-3)" }}>
        <Text size="sm" tone="secondary">Declare from Basalt's parts: the form grid at 992 from 720 (two columns on one set of tracks), one column under it, in the full-screen form modal.</Text>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setErrors(false); }}>
          <div><DialogTrigger ref={trigger} render={<Button variant="primary">Declare incident</Button>} /></div>
          <DialogContent form size="wide">
            <SheetHeader closeLabel="Close declare incident"><DialogTitle>Declare an incident</DialogTitle></SheetHeader>
            <SheetBody ref={body}>
              <DialogDescription>Say what is happening. Everyone on the list is told, and an incident room opens.</DialogDescription>
              <Form id="declare-form" onFormSubmit={() => setErrors(true)}>
                <FormGrid columns="3-2">
                  <Field name="what" label="What is happening" required column={1} row={1} rows={3} invalid={errors && text.trim().length < 10 ? true : undefined} error="Say what is happening, in at least ten characters."
                    description={<Reserve show={text.length > 1800 ? "count" : "hint"} alternatives={{ hint: DESCRIPTION_HINT, count: `${DESCRIPTION_HINT} 1,900 of 2,000 characters.` }} />}>
                    <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
                  </Field>
                  <Field label="Severity" required column={2} row={1} invalid={errors && !sev ? true : undefined} error="Choose a severity."
                    description={<Reserve show={sev ?? "none"} alternatives={{ none: "Choose one: SEV1 is the most severe, SEV4 the least.", ...Object.fromEntries(SEVERITY) }} />}>
                    <SegmentedControl fullWidth value={sev} onValueChange={setSev}>
                      {SEVERITY.map(([value]) => <Segment key={value} value={value}>{value}</Segment>)}
                    </SegmentedControl>
                  </Field>
                  <Field label="Application" optional column={2} row={2} description="Its owners and their numbers appear beside the room.">
                    <Combobox options={APPS} value={app} onValueChange={setApp} placeholder="Search the registry" emptyMessage="No application matches" />
                  </Field>
                  <Field name="ticket" label="ServiceNow ticket" optional column={2} row={3} description="Paste the number once the ticket exists. You can add it later.">
                    <Input value={ticket} onChange={(e) => setTicket(e.target.value)} />
                  </Field>
                  <Field name="title" label="Title" required column={1} row={4} invalid={errors && title.trim().length < 3 ? true : undefined} error="Write a title of at least three characters."
                    description={<Reserve show={spent ? "spent" : "hint"} alternatives={{ hint: "Shown in the incident list and to everyone told.", spent: "No more titles can be generated here. Write your own." }} />}>
                    <TextButton className="review-label-action" style={onLabelRow} aria-label={written > 0 ? "Generate another title" : "Generate a title from the description"} disabled={!canWrite || spent} onClick={generate}>
                      <Reserve show={written > 0 ? "again" : "first"} style={{ justifyItems: "end" }} alternatives={{ first: "Generate a title", again: "Regenerate title" }} />
                    </TextButton>
                    <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <FormGridItem column={2} row={4}>
                    <Switch defaultChecked description="The agent reads the description and drafts the first message. Everything stays inside the room.">Agent first look</Switch>
                  </FormGridItem>
                </FormGrid>
              </Form>
            </SheetBody>
            <SheetFooter>
              <DialogActions>
                <DialogClose render={<Button variant="secondary">Cancel</Button>} />
                <ActionShortcut shortcut="⌘↵"><Button variant="primary" type="submit" form="declare-form" disabled={!(canWrite && title.trim().length >= 3 && sev)}>Declare incident</Button></ActionShortcut>
              </DialogActions>
            </SheetFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

const STATES = ["filled", "errors", "scrolled", "filled-forced-colours", "errors-reduced-motion"];
const SHOT = { widths: [1440, 390], scales: [1, 2], bleed: true, touch: true };

export const ROUND_52: Round = {
  id: "52",
  title: "Declare's gaps: the form grid, a segmented control in a form, a text button that keeps focus, a switch with a description (DECISIONS 237, 239 to 242)",
  reviewed: false,
  summary:
    "The owner decided Declare's looks in CIMIP (a sliding pill for severity with nothing chosen at first, two columns on one grid, a text button on the Title's label row). Basalt takes in what Declare needed (DECISIONS 242, under DECISIONS 234), with no vote, and the implementation has not been reviewed. Declare is drawn here from Basalt's parts with synthetic words: empty, filled and with all three errors at once, at 1440 and at 390 on touch, in both themes. Nothing visual was decided here: the Title's button sits on the label's row by the page's own style because Basalt has no slot for it yet, and no invalid look was added to the segmented control.",
  steps: [
    {
      id: "declare",
      name: "Declare, from Basalt's parts",
      intro: "“Declare an incident” as the wide form dialog (992 from 720, full screen under it): a description spanning three rows on the left, severity, application and ticket on the right, the title and the agent's switch on row 4.",
      decisions: [
        "The form grid: each field takes four tracks a row (label, control, hint, error) and is a subgrid on them, so beside each other the labels, controls' tops and bottoms and hints sit on the same pixel, 0px at 1440, 1024 and 720, with errors showing. The spaces are Basalt's: 6 inside a field, 16 between rows, 32 between columns; every control is 32 tall.",
        "A wide form dialog keeps a form's first focus: the first field (the title when a touch opened it), not the title as a reading dialog does.",
        "Severity: `SegmentedControl` `fullWidth`, four equal segments, nothing chosen at first and no pill; the pill appears where the first choice lands. In a `Field` the label names the group (“Severity, Required”), Tab lands on the chosen value (the first while none is chosen), and an error is `aria-invalid` and the line under it. It draws no invalid look of its own (not decided).",
        "The Title's button is a `TextButton` on the label's row: it keeps focus when a press disables it, and “Generate a title” / “Regenerate title” hold the width of the longer with the underline under the words shown. Placement on the label's row is this page's own style (Basalt has no slot for it yet).",
        "The agent's switch has a `description` at the column's start edge, not indented past the switch. A hint whose words change (the severity's line, the count, the title's hint) is a block that wraps and holds its seat.",
        "Under 720 the foot's two actions are equal 44px buttons, with Declare's button inside its `ActionShortcut`.",
        "The implementation has not been reviewed by the design panel or the owner.",
      ],
      tryIt: ["Tab from the description: it lands on SEV1 (nothing chosen). Press the right arrow twice and Space; Tab out and Shift+Tab back: it lands on SEV3.", "Type ten characters in the description, then press “Generate a title” three times: focus stays on the button while it goes dim, and the hint says so.", "Press ⌘↵ or Declare incident with nothing chosen: three errors under their fields, and the rows stay on their lines."],
      states: [...STATES],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <DeclareGaps state={state} />,
    },
  ],
};
