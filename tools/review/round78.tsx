// Round 78: cimip-gaps-3 topic t4, forms and controls (the council's decision on the owner's handoff, DECISIONS 385; Fable decided between two drafts and a
// check). A field's hint and error in one seat, the filter toolbar's fold on a phone, a status dot in a segment, FileInput, FormPreview, tab rows and segmented
// controls that scroll, a count on an option chip, FilterResult's spoken form and held width, the stepper's gate, and Reserve block. Built by Opus; the
// implementation has not been reviewed, and the browser tests are written and not run (DECISIONS 359).
//
// Every part is shown in two unlike domains with synthetic data. Where a shipped part's pixels change, "today" is this build with the batch's new rules taken
// back by a scoped override (r78-today), so the two sides differ only where the batch does.

import * as React from "react";

import {
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
  FileInput,
  FilterResult,
  FilterToolbar,
  Form,
  FormGrid,
  FormPreview,
  Input,
  MultiSelect,
  OptionChips,
  Reserve,
  Segment,
  SegmentedControl,
  Select,
  SheetBody,
  SheetFooter,
  SheetHeader,
  Stepper,
  Tab,
  Tabs,
  TabsList,
  Textarea,
} from "../../packages/react/src/index";
import type { FilterToolbarActions } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const NOT_REVIEWED = "Decided by the council on the owner's handoff (DECISIONS 385; cimip-gaps-3/t4/decision.md, with its revisions after the final positions). Built by Opus; the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";
const MEDIA = ["forced-colours", "reduced-motion"];

const caption: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-6)", minWidth: 0 };
const PAIR = ".r78-pair { display: grid; gap: var(--basalt-space-8); grid-template-columns: minmax(0, 1fr); align-items: start; } @media (min-width: 720px) { .r78-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";
// "Today": the batch's new rules on a shipped part taken back, scoped to that side.
const TODAY = [
  ".r78-today .basalt-tabs-scroll { overflow: visible !important; padding: 0 !important; margin: 0 !important; margin-inline-start: calc(-1 * var(--_hang)) !important; }",
  ".r78-today .basalt-tabs-scroll > .basalt-tabs-list { width: auto !important; min-width: 0 !important; }",
  ".r78-today .basalt-tabs-scroll .basalt-tab { flex: 0 1 auto !important; }",
  ".r78-today .basalt-segmented { max-width: none !important; overflow: visible !important; }",
  ".r78-today .basalt-segment { flex: 0 1 auto !important; }",
  ".r78-today .basalt-filter-result { min-height: 0 !important; }",
].join(" ");

function Caption({ children }: { children: React.ReactNode }) {
  return <p style={caption}>{children}</p>;
}

function Pair({ children }: { children: React.ReactNode }) {
  return (
    <div className="r78-pair">
      <style>{`${PAIR} ${TODAY}`}</style>
      {children}
    </div>
  );
}

/** A box of a fixed width with a hairline, so a row's overflow is visible against it. */
function Column({ width, children }: { width: string; children: React.ReactNode }) {
  return <div style={{ width, maxWidth: "100%", padding: "var(--basalt-space-3)", boxShadow: "inset 0 0 0 var(--basalt-size-hairline) var(--basalt-border-divider)", borderRadius: "var(--basalt-radius-md)", boxSizing: "border-box" }}>{children}</div>;
}

const after: React.CSSProperties = { margin: 0, fontSize: "var(--basalt-text-sm-size)", color: "var(--basalt-text-tertiary)" };

// ---- 1. A field's hint and error in one seat ----

function ErrorForms({ state }: { state: string }) {
  const error = state.startsWith("error");
  return (
    <Pair>
      <div style={stack}>
        <Caption>A bakery's pickup form. Left of each pair: the two-line form, still the default. Right: reserveError, the hint and the error in one seat.</Caption>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--basalt-space-6)" }}>
          <Form>
            <Field label="Pickup date" description="As MM/DD, at least two days out." invalid={error} error="Write the date as MM/DD, two days out or more (for example 12/04)."><Input defaultValue={error ? "12/1" : ""} placeholder="MM/DD" /></Field>
            <Field label="Name on the order"><Input placeholder="Rosa Díaz" /></Field>
          </Form>
          <Form reserveErrors>
            <Field label="Pickup date" description="As MM/DD, at least two days out." invalid={error} error="Write the date as MM/DD, two days out or more (for example 12/04)."><Input defaultValue={error ? "12/1" : ""} placeholder="MM/DD" /></Field>
            <Field label="Name on the order"><Input placeholder="Rosa Díaz" /></Field>
          </Form>
        </div>
      </div>
      <div style={stack}>
        <Caption>A photo library's export, in a FormGrid row: the seat sits on the hint track, and a listed two-line message holds its room.</Caption>
        <FormGrid reserveErrors>
          <Field column={1} row={1} label="File name" description="Letters, digits and dashes." reserveError={["Use letters, digits and dashes only: no spaces, slashes or dots, and at most 60 characters."]} invalid={error} error="Use letters, digits and dashes only: no spaces, slashes or dots, and at most 60 characters."><Input defaultValue={error ? "lisbon trip/2026" : "lisbon-trip-2026"} /></Field>
          <Field column={2} row={1} label="Longest edge" description="In pixels, 512 to 8192."><Input defaultValue="2048" /></Field>
          <Field column={1} row={2} label="Album"><Input defaultValue="Lisbon trip" /></Field>
          <Field column={2} row={2} label="Copies"><Input defaultValue="1" /></Field>
        </FormGrid>
      </div>
    </Pair>
  );
}

// ---- 2. The toolbar's fold on a phone ----

const FORMATS = ["Hardcover", "Paperback", "Audiobook", "Ebook"].map((v) => ({ value: v.toLowerCase(), label: v }));
const SHELF = ["On the shelf", "On loan", "On hold"].map((v) => ({ value: v.toLowerCase(), label: v }));
const LIGHT = ["Full sun", "Part shade", "Shade"].map((v) => ({ value: v.toLowerCase(), label: v }));
const SIZE = ["Small", "Medium", "Large"].map((v) => ({ value: v.toLowerCase(), label: v }));

function Fold({ state }: { state: string }) {
  const [format, setFormat] = React.useState<string[]>(["paperback"]);
  const [shelf, setShelf] = React.useState<string[]>([]);
  const [light, setLight] = React.useState<string[]>([]);
  const [size, setSize] = React.useState<string[]>(["small", "medium"]);
  const open = state.startsWith("open");
  const plants = React.useRef<FilterToolbarActions | null>(null);
  return (
    <Pair>
      <div style={{ minWidth: 0 }}>
        <Caption>A library's catalogue: a search, two filters and a sort. Under 720 the filters and the sort fold under one trigger; the result never moves.</Caption>
        <FilterToolbar
          label="Filter and sort books"
          narrow="fold"
          defaultFoldOpen={open}
          activeCount={(format.length ? 1 : 0) + (shelf.length ? 1 : 0)}
          search={<Input type="search" aria-label="Search books" placeholder="Search books" />}
          filter={[
            <MultiSelect key="f" toolbar label="Format" options={FORMATS} value={format} onValueChange={setFormat} />,
            <MultiSelect key="s" toolbar label="Shelf" options={SHELF} value={shelf} onValueChange={setShelf} />,
          ]}
          result={<FilterResult>{`Showing 214 of 1,862 books`}</FilterResult>}
          sort={<Select toolbar aria-label="Sort books" defaultValue="new" options={[{ value: "new", label: "Newest" }, { value: "title", label: "Title" }, { value: "author", label: "Author" }]} />}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <Caption>A garden shop's plants: no search, so the kind (here, the shop's section) shares the trigger's row.</Caption>
        <FilterToolbar
          label="Filter plants"
          narrow="fold"
          defaultFoldOpen={open}
          actionsRef={plants}
          activeCount={(light.length ? 1 : 0) + (size.length ? 1 : 0)}
          kind={<Select toolbar aria-label="Section" defaultValue="all" options={[{ value: "all", label: "All plants" }, { value: "herbs", label: "Herbs" }, { value: "trees", label: "Trees" }]} />}
          filter={[
            <MultiSelect key="l" toolbar label="Light" options={LIGHT} value={light} onValueChange={setLight} />,
            <MultiSelect key="z" toolbar label="Size" options={SIZE} value={size} onValueChange={setSize} />,
          ]}
          result={<FilterResult>{`Showing 38 of 120 plants`}</FilterResult>}
          sort={<Select toolbar aria-label="Sort plants" defaultValue="name" options={[{ value: "name", label: "Name" }, { value: "price", label: "Price" }]} />}
        />
        <p style={after}>The list starts here.</p>
      </div>
    </Pair>
  );
}

// ---- 3. A status dot in a segment ----

function Dots({ state }: { state: string }) {
  const kitchen = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (state === "focus") window.setTimeout(() => kitchen.current?.querySelector<HTMLElement>("[data-pressed]")?.focus({ focusVisible: true } as FocusOptions), 200);
  }, [state]);
  return (
    <Pair>
      <div style={{ minWidth: 0 }}>
        <Caption>A kitchen's tickets: "All" has no dot and keeps its natural width; the chosen label is 600 and nothing moves.</Caption>
        <SegmentedControl ref={kitchen} aria-label="Tickets" defaultValue="late">
          <Segment value="all">All</Segment>
          <Segment value="ready" status="success">Ready</Segment>
          <Segment value="late" status="danger">Late</Segment>
          <Segment value="waiting" status="pending">Waiting</Segment>
        </SegmentedControl>
      </div>
      <div style={{ minWidth: 0 }}>
        <Caption>A weather network's stations: degraded (warning), offline (neutral), and a disabled one.</Caption>
        <SegmentedControl aria-label="Stations" defaultValue="online">
          <Segment value="online" status="success">Online</Segment>
          <Segment value="degraded" status="warning">Degraded</Segment>
          <Segment value="offline" status="neutral">Offline</Segment>
          <Segment value="retired" status="neutral" disabled>Retired</Segment>
        </SegmentedControl>
      </div>
    </Pair>
  );
}

// ---- 4. A file field ----

/** Puts made-up files into a file input, as a pick would: the component reads input.files on the change it fires. */
function give(input: HTMLInputElement | null, files: Array<[string, number]>) {
  if (!input) return;
  const transfer = new DataTransfer();
  for (const [name, bytes] of files) transfer.items.add(new File([new Uint8Array(bytes)], name));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function Files({ state }: { state: string }) {
  const photo = React.useRef<HTMLInputElement>(null);
  const receipts = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (state === "chosen" || state === "chosen-forced-colours") {
      give(photo.current, [["sourdough-crumb-closeup-morning-light.jpg", 2_480_000]]);
      give(receipts.current, [["march.pdf", 14_300], ["april.pdf", 9_800], ["may.pdf", 21_000]]);
    }
    if (state === "focus") window.setTimeout(() => photo.current?.focus({ focusVisible: true } as FocusOptions), 200);
    if (state === "drag") {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["x"], "receipt.pdf"));
      receipts.current?.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: transfer }));
    }
  }, [state]);
  const invalid = state === "invalid";
  return (
    <Pair>
      <div style={{ minWidth: 0 }}>
        <Caption>A recipe card's photo: one file, its name cut to one line, its size, and Clear.</Caption>
        <Form>
          <Field label="Photo" description="A JPEG or PNG, up to 10 MB." invalid={invalid} error="Choose a JPEG or PNG: this file is a HEIC.">
            <FileInput ref={photo} name="photo" accept="image/jpeg,image/png" />
          </Field>
        </Form>
      </div>
      <div style={{ minWidth: 0 }}>
        <Caption>A tax return's receipts: several files, in a required field.</Caption>
        <Form>
          <Field label="Receipts" required description="PDFs of each month's receipts.">
            <FileInput ref={receipts} name="receipts" multiple accept="application/pdf" />
          </Field>
        </Form>
      </div>
    </Pair>
  );
}

// ---- 5. A form beside what it writes ----

function Previews({ state }: { state: string }) {
  const [title, setTitle] = React.useState("Winter potluck");
  const [when, setWhen] = React.useState("Saturday, December 12, 6 PM");
  const [note, setNote] = React.useState("Bring a dish to share. We have plates, cups and a long table.");
  const [label, setLabel] = React.useState("Heirloom tomatoes");
  const [price, setPrice] = React.useState("$4.50 / lb");
  const wide = React.useRef<HTMLButtonElement>(null);
  const narrow = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    const opener = state === "invite" ? wide.current : state === "label" ? narrow.current : null;
    const timer = opener ? window.setTimeout(() => opener.click(), 60) : 0;
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div style={{ display: "flex", gap: "var(--basalt-space-3)", flexWrap: "wrap" }}>
      <Dialog>
        <DialogTrigger ref={wide} render={<Button variant="primary">Write an invitation</Button>} />
        <DialogContent form size="wide">
          <SheetHeader closeLabel="Close"><DialogTitle>Write an invitation</DialogTitle></SheetHeader>
          <SheetBody>
            <DialogDescription>Guests get the preview card by email.</DialogDescription>
            <FormPreview
              preview={<Card><CardContent><CardTitle>{title || "Untitled"}</CardTitle><CardDescription>{when}</CardDescription><p style={{ margin: "var(--basalt-space-2) 0 0", fontSize: "var(--basalt-text-base-size)" }}>{note}</p></CardContent></Card>}
            >
              <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="When"><Input value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
              <Field label="Note" optional><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </FormPreview>
          </SheetBody>
          <SheetFooter><DialogActions><DialogClose render={<Button variant="secondary">Cancel</Button>} /><Button variant="primary">Send</Button></DialogActions></SheetFooter>
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger ref={narrow} render={<Button>Print a shelf label</Button>} />
        <DialogContent form>
          <SheetHeader closeLabel="Close"><DialogTitle>Print a shelf label</DialogTitle></SheetHeader>
          <SheetBody>
            <DialogDescription>In the 480 dialog the preview sits under the fields.</DialogDescription>
            <FormPreview columns="3-2" previewLabel="Label" preview={<Card><CardContent><CardTitle>{label}</CardTitle><CardDescription>{price}</CardDescription></CardContent></Card>}>
              <Field label="Produce"><Input value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
              <Field label="Price"><Input value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            </FormPreview>
          </SheetBody>
          <SheetFooter><DialogActions><DialogClose render={<Button variant="secondary">Cancel</Button>} /><Button variant="primary">Print</Button></DialogActions></SheetFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- 6. Tabs wider than their column ----

const RECIPE = ["Overview", "Ingredients", "Method", "Notes", "Nutrition", "Reviews"];
const LIBRARY = ["All photos", "Albums", "People", "Places", "Favourites", "Shared"];

function TabRow({ names, label, chosen }: { names: string[]; label: string; chosen: string }) {
  return (
    <Tabs defaultValue={chosen}>
      <TabsList aria-label={label}>
        {names.map((name) => <Tab key={name} value={name}>{name}</Tab>)}
      </TabsList>
    </Tabs>
  );
}

function TabRows({ state }: { state: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (state !== "focus") return undefined;
    const timer = window.setTimeout(() => {
      const tabs = box.current?.querySelectorAll<HTMLElement>("[role=tab]");
      tabs?.[tabs.length - 1]?.focus({ focusVisible: true } as FocusOptions);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <Pair>
      <div className="r78-today" style={{ minWidth: 0 }}>
        <Caption>Today (main): in a 292px column a row wider than it overflows the column.</Caption>
        <div style={stack}>
          <Column width="292px"><TabRow names={RECIPE} label="Recipe" chosen="Method" /></Column>
          <Column width="292px"><TabRow names={LIBRARY} label="Library" chosen="All photos" /></Column>
        </div>
      </div>
      <div ref={box} style={{ minWidth: 0 }}>
        <Caption>This build: the row scrolls in its own port, no scrollbar drawn; the chosen tab is in view with space-6 clear, and the next tab's start shows.</Caption>
        <div style={stack}>
          <Column width="292px"><TabRow names={RECIPE} label="Recipe" chosen="Method" /></Column>
          <Column width="292px"><TabRow names={LIBRARY} label="Library" chosen="All photos" /></Column>
        </div>
      </div>
    </Pair>
  );
}

// ---- 7. Segments wider than their column ----

function SegmentRows({ state }: { state: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!state.startsWith("focus")) return undefined;
    const timer = window.setTimeout(() => box.current?.querySelector<HTMLElement>(".r78-scrolls [data-pressed]")?.focus({ focusVisible: true } as FocusOptions), 200);
    return () => window.clearTimeout(timer);
  }, [state]);
  const range = (
    <SegmentedControl aria-label="Forecast" defaultValue="14">
      <Segment value="today">Today</Segment>
      <Segment value="3">Next 3 days</Segment>
      <Segment value="7">Next 7 days</Segment>
      <Segment value="14">Next 14 days</Segment>
      <Segment value="30">Next 30 days</Segment>
    </SegmentedControl>
  );
  const crust = (
    <SegmentedControl aria-label="Crust" defaultValue="thin" fullWidth>
      <Segment value="thin">Thin</Segment>
      <Segment value="classic">Classic</Segment>
      <Segment value="deep">Deep dish</Segment>
    </SegmentedControl>
  );
  return (
    <Pair>
      <div className="r78-today" style={{ minWidth: 0 }}>
        <Caption>Today (main): a forecast's ranges in a 320px column hang past it.</Caption>
        <div style={stack}>
          <Column width="320px">{range}</Column>
          <Column width="320px">{crust}</Column>
        </div>
      </div>
      <div ref={box} style={{ minWidth: 0 }}>
        <Caption>This build: the track holds to the column and scrolls inside, the chosen segment in view; a control that fits (a pizza's crust, fullWidth) is as shipped, its ring at +2.</Caption>
        <div style={stack}>
          <div className="r78-scrolls"><Column width="320px">{range}</Column></div>
          <Column width="320px">{crust}</Column>
          <div dir="rtl"><Column width="320px">{range}</Column></div>
        </div>
      </div>
    </Pair>
  );
}

// ---- 8. A count on an option chip, and the result line ----

function Counts({ state }: { state: string }) {
  const [paper, setPaper] = React.useState<string | null>("kraft");
  const [count, setCount] = React.useState(state === "many" ? 428 : 12);
  return (
    <Pair>
      <div style={stack}>
        <Caption>A print shop's paper stock: every count holds the widest figure (512), so 7 to 512 moves no chip; zero is drawn and "out of stock" is its own fact.</Caption>
        <OptionChips
          legend="Paper"
          countLabel={(n) => `${n} sheets`}
          value={paper}
          onValueChange={setPaper}
          options={[
            { value: "cotton", label: "Cotton", count: 18 },
            { value: "linen", label: "Linen Laid", count: 0, unavailable: "out of stock" },
            { value: "kraft", label: "Kraft", count: 512 },
            { value: "vellum", label: "Vellum", count: 7 },
          ]}
        />
        <Caption>A running club's distances, counted by race.</Caption>
        <OptionChips legend="Distance" defaultValue="10k" options={[{ value: "5k", label: "5K", count: 9 }, { value: "10k", label: "10K", count: 14 }, { value: "half", label: "Half", count: 3 }, { value: "full", label: "Marathon", count: 1 }]} />
      </div>
      <div style={stack}>
        <Caption>An auction's lots: FilterResult with reserve (its widest form) holds the line's width, so the sort after it stays put from 12 to 428.</Caption>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--basalt-space-4)" }}>
          <Button size="sm" onClick={() => setCount((n) => (n === 12 ? 428 : 12))}>Change the count</Button>
          <FilterResult reserve="Showing 428 of 428 lots">{`Showing ${count} of 428 lots`}</FilterResult>
          <span style={{ fontSize: "var(--basalt-text-sm-size)", color: "var(--basalt-text-secondary)" }}>Sort: Ending soonest</span>
        </div>
        <Caption>A bookshop's search, the figure set apart and said as a sentence (spoken).</Caption>
        <FilterResult spoken={`${count} books shown`}>
          <span>Books shown </span><span style={{ color: "var(--basalt-text-primary)" }}>({count})</span>
        </FilterResult>
        <div className="r78-today">
          <Caption>Today (main): an empty result line has no height, and what is under it moves when words arrive.</Caption>
          <FilterResult>{""}</FilterResult>
          <p style={after}>The list starts here.</p>
        </div>
        <div>
          <Caption>This build: an empty result keeps one line's height.</Caption>
          <FilterResult>{""}</FilterResult>
          <p style={after}>The list starts here.</p>
        </div>
      </div>
    </Pair>
  );
}

// ---- 9. A step flow whose next waits ----

const SETUP = [{ id: "plan", label: "Choose a plan" }, { id: "team", label: "Invite the team" }, { id: "pay", label: "Pay" }];
const PRINT = [{ id: "photos", label: "Pick photos" }, { id: "paper", label: "Choose paper" }, { id: "review", label: "Review the order" }];

function Steps({ state }: { state: string }) {
  const [setup, setSetup] = React.useState("plan");
  const [plan, setPlan] = React.useState<string | undefined>(state === "free" ? "studio" : undefined);
  const [print, setPrint] = React.useState(state === "done-wait" ? "review" : "photos");
  const [ordered, setOrdered] = React.useState(false);
  const setupBox = React.useRef<HTMLDivElement>(null);
  const printBox = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (state === "held") window.setTimeout(() => setupBox.current?.querySelector<HTMLElement>(".basalt-button[data-variant=primary]")?.focus({ focusVisible: true } as FocusOptions), 200);
    if (state === "done-wait") window.setTimeout(() => printBox.current?.querySelector<HTMLElement>(".basalt-button[data-variant=primary]")?.click(), 200);
  }, [state]);
  return (
    <Pair>
      <div ref={setupBox} style={stack}>
        <Caption>A workspace's setup: Next waits for a plan, says why under the row, and keeps focus. The reason keeps its room once a plan is chosen.</Caption>
        <div>
          <SegmentedControl aria-label="Plan" value={plan} onValueChange={setPlan}>
            <Segment value="solo">Solo</Segment>
            <Segment value="studio">Studio</Segment>
            <Segment value="company">Company</Segment>
          </SegmentedControl>
        </div>
        <div><Stepper steps={SETUP} value={setup} onValueChange={setSetup} nextDisabled={setup === "plan" && !plan} nextReason="Choose a plan to go on." onDone={() => {}} /></div>
      </div>
      <div ref={printBox} style={stack}>
        <Caption>A photo print order: Done sends the order and waits for it; a second press does nothing.</Caption>
        <Stepper steps={PRINT} value={print} onValueChange={setPrint} onDone={() => new Promise<void>((resolve) => window.setTimeout(() => { setOrdered(true); resolve(); }, 4000))} />
        <p style={after}>{ordered ? "Order placed." : "Nothing ordered yet."}</p>
      </div>
    </Pair>
  );
}

// ---- 10. Notes that change in place ----

const SHIPPING: Record<string, React.ReactNode> = {
  short: <Callout status="success" title="Ships today">Orders placed before 2 PM leave the same day.</Callout>,
  long: <Callout status="warning" title="Ships in 3 to 5 days">The mill is restocking this paper. Orders placed now leave once the new reams arrive, usually within a week; we email you the tracking number when they do, and you can cancel until then.</Callout>,
};
const BACKUP: Record<string, React.ReactNode> = {
  short: <Callout title="Backed up 4 minutes ago" />,
  long: <Callout status="danger" title="The last backup failed">The drive was full at 3:12 AM. Free 18 GB or choose a larger drive, then back up again.</Callout>,
};

function Notes({ state }: { state: string }) {
  const [show, setShow] = React.useState(state === "long" ? "long" : "short");
  return (
    <Pair>
      <div style={{ minWidth: 0 }}>
        <Caption>A paper shop's shipping note: the cell is the tallest note's height, so the paragraph after it never moves. The short note hugs its words.</Caption>
        <Button size="sm" onClick={() => setShow((s) => (s === "short" ? "long" : "short"))}>Swap the note</Button>
        <div style={{ height: "var(--basalt-space-3)" }} />
        <Reserve block show={show} alternatives={SHIPPING} />
        <p style={{ ...after, marginTop: "var(--basalt-space-3)" }}>The order summary starts here.</p>
      </div>
      <div style={{ minWidth: 0 }}>
        <Caption>A laptop's backup status, one line or three.</Caption>
        <Reserve block show={show} alternatives={BACKUP} />
        <p style={{ ...after, marginTop: "var(--basalt-space-3)" }}>Settings start here.</p>
      </div>
    </Pair>
  );
}

export const ROUND_78: Round = {
  id: "78",
  title: "cimip-gaps-3 t4: forms and controls",
  reviewed: false,
  summary:
    "The council's decision on forms and controls (DECISIONS 385; Fable decided between two drafts and a check): a field's hint and error in one seat (opt-in), the filter toolbar's fold on a phone (opt-in), a status dot in a segment, FileInput, FormPreview, tab rows and segmented controls that scroll when wider than their column, a count on an option chip, FilterResult's spoken form and held width, the stepper's gate, and Reserve block. Shipped pixels change in four places, shown beside today: a tab row and a segmented control wider than their column scroll inside themselves; an empty result line keeps one line's height; and a Stepper's Done is held without onDone. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "field-error",
      name: "A field's hint and error share one seat",
      intro: "reserveError (or a Form's or FormGrid's reserveErrors): the hint and the error stand in one cell under the control, the cell as tall as the tallest of them, so an error moves nothing under it.",
      decisions: [
        "Off by default: every shipped form is pixel-identical. A field's own reserveError, false included, wins over the form's.",
        "A sizer is text only (the error when it is a string, and each listed string), measured at the field's width: no element, id or form field is mounted unseen, so FormData and checkValidity() are as they were.",
        "While the error shows the hint is unseen and leaves aria-describedby, so the error states the fix and repeats the format. The incoming line fades in over duration-fast; the outgoing one goes at once.",
        "In a FormGrid the seat is on the hint track; the error track stays 0. No XCircle before the error: that would give one state two looks.",
        NOT_REVIEWED,
      ],
      tryIt: ["Compare the error state: on the left the next field moves down by the error's line; on the right it moves 0px."],
      states: ["error", "error-forced-colours"],
      widths: [1440, 390],
      height: 560,
      demo: ({ state }) => <ErrorForms state={state} />,
    },
    {
      id: "toolbar-fold",
      name: "The filter toolbar's fold on a phone",
      intro: "narrow=\"fold\": under 720 the search (or the kind) and a Filters trigger share a row, the result sits under them and never moves, and the filters and the sort open in a fold under it. From 720 it is the shipped row, pixel for pixel.",
      decisions: [
        "The trigger is the secondary Button at 44 with the count pill and the core chevron-down, turning 180°; aria-expanded and aria-controls, named \"Filters, 2 active\".",
        "The fold opens its height over duration-slow (grid rows 0fr to 1fr) and closes at 0.75× on ease-in; at once under reduced motion. Closed, it is unseen and inert; open and settled it clips nothing.",
        "Focus is never left in a closed fold: closing with focus inside, or a parent holding it closed as the window crosses 720, sends focus to the trigger first. focusFilters() is the empty state's Clear filters.",
        NOT_REVIEWED,
      ],
      tryIt: ["At 390, press Filters: the result line stays where it is. Tab into Sort, then close the fold: focus is on Filters."],
      states: ["open", "open-forced-colours", "open-reduced-motion"],
      widths: [1440, 390],
      touch: true,
      height: 520,
      demo: ({ state }) => <Fold state={state} />,
    },
    {
      id: "segment-dot",
      name: "A status dot in a segment",
      intro: "Segment status: Badge's 6px dot before the label, space-1-5 from it. The label names the state; the dot is aria-hidden.",
      decisions: [
        "Neutral is tertiary, pending the hollow ring in the label's ink, disabled the disabled ink; in forced colours Badge's disc, following the item.",
        "A segment with no status keeps its natural width: no empty seat. Never on an icon-only segment (development warns). No accent.",
        NOT_REVIEWED,
      ],
      tryIt: ["Choose another segment: its label goes to 600 and no edge moves."],
      states: ["focus", ...MEDIA],
      widths: [1440, 390],
      height: 320,
      demo: ({ state }) => <Dots state={state} />,
    },
    {
      id: "file-input",
      name: "A file field",
      intro: "FileInput, a control for Field: one box drawn as Input is, a paperclip, the file line, and Choose file (or one file's size and Clear). The native input covers the box and is the control.",
      decisions: [
        "What is drawn is only ever a reading of input.files, on change, on mount and after a reset; Basalt never writes input.files and handles no drop. Clear empties the input, fires one change and focuses it.",
        "The box is 32 at md and 44 on touch and under 720 from the first frame, and never changes height; Clear's 44 on touch is hit area.",
        "A drag that carries files takes the hover wash and the boundary's hover step. Nothing dashed. Invalid is Input's danger hairline.",
        NOT_REVIEWED,
      ],
      tryIt: ["Choose a file, then Clear: focus returns to the field and onValueChange is called once with []."],
      states: ["chosen", "invalid", "focus", "drag", "chosen-forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 360,
      demo: ({ state }) => <Files state={state} />,
    },
    {
      id: "form-preview",
      name: "A form beside what it writes",
      intro: "FormPreview: fields at the start and the preview at the end where its own width is 640 or more and the window 720 or more; one column, the preview under a divider, anywhere else.",
      decisions: [
        "In the wide form dialog at 1440 it is two 459px columns, space-8 apart, the preview sticky space-5 from the body's top. The 480 dialog and a phone get one column.",
        "The preview is a section named by its heading (\"Preview\", an h3), drawn as the preview kicker; it draws no rim or fill and holds no field, action or focus stop. Never a live region.",
        NOT_REVIEWED,
      ],
      tryIt: ["Type in the title: the card on the right follows."],
      states: ["invite", "label"],
      widths: [1440, 390],
      height: 720,
      demo: ({ state }) => <Previews state={state} />,
    },
    {
      id: "tabs-scroll",
      name: "A tab row wider than its column",
      intro: "The HTML skill's form, in React: the row scrolls in its own port, the ring at +2 (DECISIONS 358), no scrollbar drawn, and a tab brought into view keeps space-6 clear so the next tab's start shows.",
      decisions: [
        "On focus, on a change of the chosen tab and on first layout, at once and never smooth; the port's scroll is set from the two boxes' rects, so the window never moves.",
        "A row that fits is pixel-identical to today. No fade, no edge buttons. Vertical tabs and LinkTabs are untouched.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press End in a row: the last tab shows whole with its ring at +2."],
      states: ["focus", "forced-colours"],
      widths: [1440, 390],
      height: 340,
      demo: ({ state }) => <TabRows state={state} />,
    },
    {
      id: "segment-scroll",
      name: "A segmented control wider than its column",
      intro: "The track holds to its column and scrolls inside; it never wraps, narrows or cuts a label. While it fits it is as shipped.",
      decisions: [
        "While it fits the track is not a scrollport and the ring is at +2. While it overflows (data-overflow, measured before the first paint) it scrolls with no scrollbar drawn and a segment's ring is drawn inside at -2: a new named case for the inset ring.",
        "The chosen or focused segment is brought whole into view, space-6 clear; the pill travels with the content, in right to left too. A fullWidth control is equal while every label fits.",
        "Before script the control is as it ships. The theme choice keeps its wrap.",
        NOT_REVIEWED,
      ],
      tryIt: ["Arrow along the forecast's ranges: the track scrolls and the pill stays under the chosen one."],
      states: ["focus", "focus-forced-colours"],
      widths: [1440, 390],
      height: 420,
      demo: ({ state }) => <SegmentRows state={state} />,
    },
    {
      id: "counts",
      name: "A count on an option chip, and the result line",
      intro: "OptionChip count after the label in tertiary figures, in a seat as wide as the group's widest; FilterResult's spoken form and its held width (reserve).",
      decisions: [
        "13/18 at 400, tabular; secondary on hover and when chosen; ButtonText, HighlightText and GrayText in forced colours. Zero is drawn and disables nothing.",
        "FilterResult draws children (a string or a node) hidden from assistive technology and says spoken, or the words, through its one StatusLine after 400ms. reserve is a sizing copy: no form field and no id.",
        "An empty result keeps one line's height, for every FilterResult.",
        NOT_REVIEWED,
      ],
      tryIt: ["Change the count: the sort words after the line do not move."],
      states: ["many", "forced-colours"],
      widths: [1440, 390],
      height: 620,
      demo: ({ state }) => <Counts state={state} />,
    },
    {
      id: "stepper",
      name: "A step flow whose next waits",
      intro: "Stepper nextDisabled, nextReason and onDone: a held Next keeps focus and says why under the row; Done waits for onDone's promise.",
      decisions: [
        "Held is the disabled look with focus kept (aria-disabled); Back on the first step keeps focus too, with no change of pixels.",
        "The reason is in the layout whenever it is given and unseen while Next is live, so it keeps its height; it describes Next only while held and is not live.",
        "With no onDone, Done is held: a visible change for a flow that used Done as an end mark. The review rounds that use Stepper pass onDone.",
        NOT_REVIEWED,
      ],
      tryIt: ["Choose a plan: Next frees and the reason goes, and the row does not move."],
      states: ["held", "free", "done-wait"],
      widths: [1440, 390],
      height: 380,
      demo: ({ state }) => <Steps state={state} />,
    },
    {
      id: "reserve-block",
      name: "Notes that change in place",
      intro: "Reserve block: the alternatives are blocks in one full-width cell as tall as the tallest, each at its own height from the top. Callout is unchanged.",
      decisions: [
        "Each note hugs its own words; the room under a shorter one is the page, never paint inside a box. The swap is at once.",
        "The unseen copies hold nothing live: no form field and no id, and a Callout in one takes no live; the app says the change through its one StatusLine.",
        NOT_REVIEWED,
      ],
      tryIt: ["Swap the note: the paragraph after it moves 0px."],
      states: ["long"],
      widths: [1440, 390],
      height: 420,
      demo: ({ state }) => <Notes state={state} />,
    },
  ],
};
