// The second domains (cimip-gaps-2, batch AF): the demos rounds 51 to 54 add beside their first app's examples, and round 56 shows on their own. Each is a part of
// Basalt in an unlike domain (a shop's catalog, a build pipeline, an account and a delivery address, a product listing, a support reply, shared documents, a price
// table, energy readings), with every word and number synthetic. A state's name is the demo's own; a trailing "-forced-colours" or "-reduced-motion" is the emulation.

import * as React from "react";

import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Field,
  FilterResult,
  FilterToolbar,
  Form,
  FormGrid,
  FormGridItem,
  Heading,
  Input,
  ListBand,
  LoadingShape,
  MultiSelect,
  Select,
  SheetBody,
  SheetFooter,
  SheetHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableHeadExplainer,
  TableRow,
  TableRowHead,
  Text,
  Textarea,
  fillIn,
  standIn,
} from "../../packages/react/src/index";
import type { StandInVariant } from "../../packages/react/src/index";

export const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");
const later = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const note: React.CSSProperties = { margin: 0 };

// ---- A list in a pane that scrolls on its own (ListBand's `scroller`) ----

interface PaneRow { id: string; name: string; group: string; detail: string; figure: string }
const CATEGORIES = ["Kitchen", "Garden", "Lighting", "Textiles", "Stationery"] as const;
const PRODUCTS = ["Linen tea towel", "Stoneware mug", "Brass desk lamp", "Cedar planter", "Wool throw", "Notebook, dot grid", "Copper watering can", "Glass carafe", "Paper lantern", "Oak chopping board"];
const CATALOG: PaneRow[] = Array.from({ length: 138 }, (_, i) => ({
  id: `SKU-${String(3100 + i)}`,
  name: `${PRODUCTS[(i * 3) % PRODUCTS.length]!}${i % 4 === 0 ? ", large" : ""}`,
  group: CATEGORIES[(i * 7) % CATEGORIES.length]!,
  detail: `${(i * 11) % 40 + 2} in stock`,
  figure: `$${((i * 37) % 180) + 12}.00`,
}));
const BRANCHES = ["main", "release/4.2", "docs-refresh", "faster-builds"] as const;
const OUTCOMES = ["Passed", "Failed", "Running", "Queued"] as const;
const BUILDS: PaneRow[] = Array.from({ length: 412 }, (_, i) => ({
  id: `#${8120 - i}`,
  name: ["Unit tests", "Lint and typecheck", "Browser tests", "Package", "Deploy preview"][(i * 3) % 5]!,
  group: BRANCHES[(i * 5) % BRANCHES.length]!,
  detail: OUTCOMES[(i * 7) % OUTCOMES.length]!,
  figure: `${(i * 13) % 9 + 1}m ${String((i * 29) % 60).padStart(2, "0")}s`,
}));

const DOMAIN = {
  catalog: { title: "Catalog", noun: "Products", rows: CATALOG, groups: CATEGORIES as readonly string[], groupLabel: "Category", search: "Search products", empty: "No products match these filters.", aside: "Basket" },
  builds: { title: "Builds", noun: "Builds", rows: BUILDS, groups: BRANCHES as readonly string[], groupLabel: "Branch", search: "Search builds", empty: "No builds match these filters.", aside: "Pipeline" },
} as const;

/**
 * A two-column app at one viewport: a narrow aside, and a main pane that scrolls on its own with a paged list in it. The band sticks to the pane's top, a page change
 * returns the pane to the band's rest, and Back to top watches the pane. States: `page-4`, `filtered`, `back-down` (the pane scrolled past one screen), `foot-end` (the
 * pane at its end: the foot under 720).
 */
export function PaneList({ domain, state }: { domain: keyof typeof DOMAIN; state: string }) {
  const d = DOMAIN[domain];
  const kind = kindOf(state);
  const pane = React.useRef<HTMLDivElement>(null);
  const [page, setPage] = React.useState(kind === "page-4" ? 4 : 1);
  const [size, setSize] = React.useState(kind === "back-down" || kind === "foot-end" ? 50 : 25);
  const [groups, setGroups] = React.useState<string[]>(kind === "filtered" ? [d.groups[1]!] : []);
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const shown = d.rows.filter((r) => (!groups.length || groups.includes(r.group)) && (!needle || `${r.name} ${r.id}`.toLowerCase().includes(needle)));
  const rows = shown.slice((page - 1) * size, page * size);
  const id = `${domain}-title`;
  // The scrolled states are real scrolls of the pane, in steps, as a reader's would be.
  React.useEffect(() => {
    if (kind !== "back-down" && kind !== "foot-end") return undefined;
    let live = true;
    void (async () => {
      await later(120);
      const el = pane.current;
      if (!el || !live) return;
      el.scrollTop = el.clientHeight * 0.5; await later(70); if (!live) return;
      el.scrollTop = kind === "foot-end" ? el.scrollHeight : el.clientHeight * 2.4;
    })();
    return () => { live = false; };
  }, [kind]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 15rem) minmax(0, 1fr)", height: "calc(100vh - var(--basalt-space-12))", minHeight: "32rem", border: "var(--basalt-size-hairline) solid var(--basalt-border-divider)" }} className="af-pane-app">
      <style>{"@media (width < 720px) { .af-pane-app { grid-template-columns: minmax(0, 1fr) !important; } .af-pane-aside { display: none; } }"}</style>
      <aside className="af-pane-aside" style={{ borderInlineEnd: "var(--basalt-size-hairline) solid var(--basalt-border-divider)", padding: "var(--basalt-space-4)" }}>
        <Text size="sm" tone="secondary">{d.aside}</Text>
      </aside>
      <div ref={pane} data-af-pane="" style={{ overflow: "auto", padding: "0 var(--basalt-space-4) var(--basalt-space-6)" }}>
        <h2 id={id} tabIndex={-1} style={{ margin: "var(--basalt-space-4) 0 var(--basalt-space-3)", font: "var(--basalt-font-weight-semibold) var(--basalt-text-lg-size) / var(--basalt-text-lg-line-height) var(--basalt-font-family-sans)" }}>{d.title}</h2>
        <FilterToolbar
          label={`Filter ${d.noun.toLowerCase()}`}
          search={<Input aria-label={d.search} placeholder={d.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ width: "100%" }} />}
          filter={<MultiSelect toolbar label={d.groupLabel} options={d.groups.map((v) => ({ value: v, label: v }))} value={groups} onValueChange={(v) => { setGroups(v); setPage(1); }} />}
          result={<FilterResult>{`Showing ${shown.length} of ${d.rows.length} ${d.noun.toLowerCase()}`}</FilterResult>}
        />
        <ListBand scroller={pane} heading={id} noun={d.noun} total={shown.length} maxTotal={d.rows.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} filterKey={`${q}|${groups}`} footLabel={`${d.noun.replace(/s$/, "")} pages, end of list`}>
          <Card style={{ overflow: "hidden", padding: 0 }}>
            {rows.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {rows.map((r, i) => (
                  <li key={r.id} style={i ? { borderTop: "var(--basalt-size-hairline) solid var(--basalt-border-divider)" } : undefined}>
                    <a href={`#${r.id}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: "var(--basalt-space-4)", padding: "var(--basalt-space-3) var(--basalt-space-4)", color: "inherit", textDecoration: "none" }}>
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ color: "var(--basalt-text-primary)", fontWeight: 500 }}>{r.name}</span>
                        <span style={{ color: "var(--basalt-text-secondary)", fontSize: "var(--basalt-text-sm-size)" }}>{r.id} · {r.group} · {r.detail}</span>
                      </span>
                      <span style={{ color: "var(--basalt-text-secondary)", fontSize: "var(--basalt-text-sm-size)", fontVariantNumeric: "tabular-nums" }}>{r.figure}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p style={{ margin: 0, padding: "var(--basalt-space-12) var(--basalt-space-4)", textAlign: "center" }}>{d.empty}</p>}
          </Card>
        </ListBand>
      </div>
    </div>
  );
}

// ---- One form in a wide dialog and in a narrow pane (FormGrid answers its own width) ----

const FORMS = {
  account: {
    title: "Account details",
    lead: "How your name and address appear to the rest of the team.",
    fields: (pre: string) => (
      <>
        <Field name={`${pre}-name`} label="Display name" required column={1} row={1} description="Shown on everything you share."><Input defaultValue="Rowan Ellery" /></Field>
        <Field name={`${pre}-email`} label="Email" required column={2} row={1} description="Sign-in and notices go here."><Input type="email" defaultValue="rowan@example.com" /></Field>
        <Field name={`${pre}-team`} label="Team" optional column={1} row={2}><Select aria-label="Team" defaultValue="design" options={[{ value: "design", label: "Design" }, { value: "support", label: "Support" }, { value: "finance", label: "Finance" }]} /></Field>
        <Field name={`${pre}-zone`} label="Time zone" column={2} row={2} description="Dates and times follow it."><Select aria-label="Time zone" defaultValue="utc" options={[{ value: "utc", label: "UTC" }, { value: "lis", label: "Lisbon" }, { value: "chi", label: "Chicago" }]} /></Field>
        <Field name={`${pre}-topics`} label="Email me about" optional column={1} row={3}><MultiSelect label="Email me about" options={[{ value: "mentions", label: "Mentions" }, { value: "invites", label: "Invites" }, { value: "digest", label: "Weekly digest" }]} defaultValue={["mentions"]} /></Field>
        <FormGridItem column={2} row={3}><Switch defaultChecked description="Others see when you were last active.">Show my activity</Switch></FormGridItem>
      </>
    ),
  },
  shipping: {
    title: "Delivery address",
    lead: "Where this order is sent. You can change it until it is packed.",
    fields: (pre: string) => (
      <>
        <Field name={`${pre}-to`} label="Recipient" required column={1} row={1}><Input defaultValue="Ines Marlowe" /></Field>
        <Field name={`${pre}-phone`} label="Phone" optional column={2} row={1} description="Only the courier sees it."><Input type="tel" /></Field>
        <Field name={`${pre}-street`} label="Street and number" required column={1} row={2}><Input defaultValue="14 Larch Row" /></Field>
        <Field name={`${pre}-city`} label="Town or city" required column={2} row={2}><Input defaultValue="Eastford" /></Field>
        <Field name={`${pre}-post`} label="Postcode" required column={1} row={3}><Input defaultValue="EF4 2LR" /></Field>
        <Field name={`${pre}-country`} label="Country" required column={2} row={3}><Select aria-label="Country" defaultValue="uk" options={[{ value: "uk", label: "United Kingdom" }, { value: "ie", label: "Ireland" }, { value: "pt", label: "Portugal" }]} /></Field>
      </>
    ),
  },
} as const;

/**
 * The same `FormGrid` at one desktop viewport in two places: a narrow pane beside the page (one column, in the markup's order) and a wide form dialog (its columns).
 * States: the default (the pane), `dialog` (the dialog open over it).
 */
export function FormPlaces({ form, state }: { form: keyof typeof FORMS; state: string }) {
  const f = FORMS[form];
  const kind = kindOf(state);
  const [open, setOpen] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (kind !== "dialog") return undefined;
    const t = window.setTimeout(() => trigger.current?.click(), 60);
    return () => window.clearTimeout(t);
  }, [kind]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 22.5rem)", gap: "var(--basalt-space-6)", padding: "var(--basalt-space-6) var(--basalt-gutter)" }} className="af-form-places">
      <style>{"@media (width < 720px) { .af-form-places { grid-template-columns: minmax(0, 1fr) !important; } }"}</style>
      <div style={{ display: "grid", alignContent: "start", gap: "var(--basalt-space-3)" }}>
        <Heading level={2} size="lg">{f.title}</Heading>
        <Text size="sm" tone="secondary">The pane on the side holds the form at 360: one column. The same form opens in the wide dialog: two columns.</Text>
        <Dialog open={open} onOpenChange={setOpen}>
          <div><DialogTrigger ref={trigger} render={<Button variant="secondary">Edit in a dialog</Button>} /></div>
          <DialogContent form size="wide">
            <SheetHeader closeLabel={`Close ${f.title.toLowerCase()}`}><DialogTitle>{f.title}</DialogTitle></SheetHeader>
            <SheetBody>
              <DialogDescription>{f.lead}</DialogDescription>
              <Form id={`${form}-dialog-form`}><FormGrid columns="1-1">{f.fields(`${form}-d`)}</FormGrid></Form>
            </SheetBody>
            <SheetFooter><DialogActions><DialogClose render={<Button variant="secondary">Cancel</Button>} /><Button variant="primary" type="submit" form={`${form}-dialog-form`}>Save</Button></DialogActions></SheetFooter>
          </DialogContent>
        </Dialog>
      </div>
      <aside aria-label={f.title} style={{ borderInlineStart: "var(--basalt-size-hairline) solid var(--basalt-border-divider)", paddingInlineStart: "var(--basalt-space-6)", display: "grid", alignContent: "start", gap: "var(--basalt-space-4)" }}>
        <Text size="sm" tone="secondary">{f.lead}</Text>
        <Form><FormGrid columns="1-1">{f.fields(`${form}-p`)}</FormGrid></Form>
      </aside>
    </div>
  );
}

// ---- A field written into by something else, in an unlike domain (`writing`, and `writingEmpty`) ----

const LISTING = "A heavy stoneware mug, glazed by hand in a deep green. Each one is a little different. Holds 350 ml; safe in the dishwasher and the microwave.";
const LISTING_FR = "Une tasse en grès épais, émaillée à la main d'un vert profond. Chacune est un peu différente. Contenance 350 ml ; va au lave-vaisselle et au micro-ondes.";
const REPLY = "Thanks for writing in. The refund for order 2291 went back to your card this morning; banks usually show it within three working days.";

/**
 * Two asynchronous edits that are not the first app's: a product listing translated again, and a support reply drafted again. `rewriting` keeps the last text while the new
 * one is written (the default, `writingEmpty="keep"`); `cleared` is an app that clears the field on purpose while the busy look stays (`writingEmpty="clear"`).
 */
export function RewriteFields({ state }: { state: string }) {
  const kind = kindOf(state);
  const writing = kind === "rewriting" || kind === "cleared";
  const [listing, setListing] = React.useState(writing ? "" : LISTING_FR);
  const [reply, setReply] = React.useState(writing ? "" : REPLY);
  const [live, setLive] = React.useState<null | "listing" | "reply">(null);
  const empty = kind === "cleared" ? "clear" : "keep";
  // Shown with its last text: the field kept what it held before the empty value arrived.
  React.useEffect(() => { if (kind === "rewriting") { setListing(LISTING); setReply(REPLY); window.setTimeout(() => { setListing(""); setReply(""); }, 30); } }, [kind]);
  const play = async (which: "listing" | "reply") => {
    const target = which === "listing" ? LISTING_FR : REPLY;
    const set = which === "listing" ? setListing : setReply;
    setLive(which);
    set("");
    await later(900);
    for (let n = 12; n <= target.length; n += 12) { set(target.slice(0, n)); await later(60); }
    set(target);
    setLive(null);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))", gap: "var(--basalt-space-8)", padding: "var(--basalt-space-6) var(--basalt-gutter)" }}>
      <div style={{ display: "grid", gap: "var(--basalt-space-3)", alignContent: "start" }}>
        <Field label="Description, French" description={kind === "cleared" ? "Cleared while the new translation is written." : "Translated from the English listing."}>
          <Textarea rows={5} value={listing} writing={writing || live === "listing"} writingEmpty={empty} onChange={(e) => setListing(e.target.value)} />
        </Field>
        <div><Button size="sm" variant="secondary" onClick={() => play("listing")}>Translate again</Button></div>
      </div>
      <div style={{ display: "grid", gap: "var(--basalt-space-3)", alignContent: "start" }}>
        <Field label="Reply" description={kind === "cleared" ? "Cleared while a new draft is written." : "A draft you can change before it is sent."}>
          <Textarea rows={5} value={reply} writing={writing || live === "reply"} writingEmpty={empty} onChange={(e) => setReply(e.target.value)} />
        </Field>
        <div><Button size="sm" variant="secondary" onClick={() => play("reply")}>Draft again</Button></div>
      </div>
    </div>
  );
}

// ---- Loading with a different data shape: a Date, an array and a known-empty field (`fillIn`) ----

interface Doc { title: string; owner: string; updated: Date; editors: string[]; note: string | null; size: string }
const DOCS: Doc[] = [
  { title: "Spring catalogue copy", owner: "Mara Quill", updated: new Date(Date.UTC(2026, 10, 18, 14, 5)), editors: ["MQ", "TB"], note: null, size: "48 KB" },
  { title: "Venue shortlist", owner: "Tobin Achebe", updated: new Date(Date.UTC(2026, 10, 17, 9, 40)), editors: ["TB"], note: "Waiting on two quotes", size: "12 KB" },
  { title: "Onboarding checklist", owner: "Ines Marlowe", updated: new Date(Date.UTC(2026, 10, 12, 16, 20)), editors: ["IM", "MQ", "RE"], note: null, size: "9 KB" },
  { title: "Quarterly budget", owner: "Rowan Ellery", updated: new Date(Date.UTC(2026, 10, 3, 11, 0)), editors: ["RE", "TB"], note: "Locked for review", size: "220 KB" },
];
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
/** Stand-ins of the same shape: other words, another date, one more editor and one more row in the unseen variant. */
const standInDocs = (variant: StandInVariant): Doc[] => Array.from({ length: DOCS.length + variant }, (_, i) => ({
  title: standIn(60 + i, 22 + (i % 2) * 6, variant),
  owner: standIn(70 + i, 12, variant),
  updated: new Date(Date.UTC(2026, variant ? 0 : 6, 1 + i * 3)),
  editors: Array.from({ length: 1 + ((i + variant) % 3) + variant }, (_, j) => (variant ? "ZZ" : "AA") + j),
  note: standIn(80 + i, 16, variant),
  size: variant ? `${900 + i} KB` : `${10 + i} KB`,
}));
/** What a list cache knows before the rows arrive: the titles, and that two of them have no note (known-empty, `null`), never stood in. */
const KNOWN_DOCS = DOCS.map((d) => ({ title: d.title, note: d.note === null ? null : undefined }));

function DocTable({ docs }: { docs: Doc[] }) {
  return (
    <TableContainer label="Shared documents">
      <Table minWidth={680}>
        <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Owner</TableHead><TableHead>Updated</TableHead><TableHead>Editors</TableHead><TableHead>Note</TableHead><TableHead numeric>Size</TableHead></TableRow></TableHeader>
        <TableBody>
          {docs.map((d, i) => (
            <TableRow key={i}>
              <TableRowHead>{d.title}</TableRowHead>
              <TableCell>{d.owner}</TableCell>
              <TableCell><time dateTime={d.updated.toISOString()}>{day(d.updated)}</time></TableCell>
              <TableCell>{d.editors.length} editing</TableCell>
              <TableCell>{d.note ?? ""}</TableCell>
              <TableCell numeric>{d.size}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Shared documents loading: `full` (nothing known), `prefill` (the titles known from a cache, and two notes known to be empty: they are drawn empty, never as a bone),
 * and loaded (the default).
 */
export function DocumentsLoading({ state }: { state: string }) {
  const kind = kindOf(state);
  const [run, setRun] = React.useState(0);
  const [arrived, setArrived] = React.useState(kind === "default");
  React.useEffect(() => {
    if (!run) return undefined;
    setArrived(false);
    const t = window.setTimeout(() => setArrived(true), 1400);
    return () => window.clearTimeout(t);
  }, [run]);
  const loading = kind === "full" || kind === "prefill" || !arrived;
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-4)", padding: "var(--basalt-space-6) var(--basalt-gutter)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--basalt-space-4)", flexWrap: "wrap" }}>
        <Heading level={2} size="lg">Shared with you</Heading>
        <Button variant="secondary" onClick={() => setRun((n) => n + 1)}>Play the load</Button>
      </div>
      <LoadingShape key={run} loading={loading} label="Loading documents"
        {...(kind === "full" ? { shape: () => <DocTable docs={standInDocs(0)} /> } : { prefill: (v: StandInVariant) => <DocTable docs={standInDocs(v).map((s, i) => (i < KNOWN_DOCS.length ? fillIn<Doc>(KNOWN_DOCS[i], s) : s))} /> })}>
        {() => <DocTable docs={DOCS} />}
      </LoadingShape>
    </div>
  );
}

// ---- An explainer on a header that does not sort ----

/** Two tables whose headers do not sort, each with one column a reader could misread: a price table ("Fair use") and energy readings ("Normalised"). */
export function FixedExplainers() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-10)", padding: "var(--basalt-space-16) var(--basalt-gutter) var(--basalt-space-6)" }}>
      <div data-wt-before=""><Button size="sm" variant="ghost">Compare plans</Button></div>
      <TableContainer label="Plans">
        <Table columns={[{}, { width: 112 }, { width: 152 }, { width: 120 }]} minWidth={520}>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead numeric>Seats</TableHead>
            <TableHead data-wt-explain="" explainer={<TableHeadExplainer title="Fair use"><p>What a plan allows before we ask you to move up: storage and sends a month, counted across every seat.</p></TableHeadExplainer>}>Fair use</TableHead>
            <TableHead numeric>Per month</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableRowHead>Starter</TableRowHead><TableCell numeric>3</TableCell><TableCell>20 GB, 2,000 sends</TableCell><TableCell numeric>$12</TableCell></TableRow>
            <TableRow><TableRowHead>Team</TableRowHead><TableCell numeric>15</TableCell><TableCell>200 GB, 20,000 sends</TableCell><TableCell numeric>$48</TableCell></TableRow>
            <TableRow><TableRowHead>Studio</TableRowHead><TableCell numeric>50</TableCell><TableCell>1 TB, 100,000 sends</TableCell><TableCell numeric>$140</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer label="Readings">
        <Table columns={[{}, { width: 120 }, { width: 128 }, { width: 120 }]} minWidth={520}>
          <TableHeader><TableRow><TableHead>Building</TableHead><TableHead numeric>kWh</TableHead>
            <TableHead numeric explainer={<TableHeadExplainer title="Normalised"><p>Use per square metre, adjusted to a mild month, so a cold week does not read as waste.</p></TableHeadExplainer>}>Normalised</TableHead>
            <TableHead>Read</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableRowHead>North hall</TableRowHead><TableCell numeric>4,210</TableCell><TableCell numeric>38.2</TableCell><TableCell>Nov 18</TableCell></TableRow>
            <TableRow><TableRowHead>Library</TableRowHead><TableCell numeric>2,870</TableCell><TableCell numeric>41.0</TableCell><TableCell>Nov 18</TableCell></TableRow>
            <TableRow><TableRowHead>Studio block</TableRowHead><TableCell numeric>1,045</TableCell><TableCell numeric>29.7</TableCell><TableCell>Nov 17</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <p style={note}><Text as="span" size="sm" tone="secondary">The headers do not sort. A header with an explainer is a focus stop of its own: Tab reaches it, and its words are its description.</Text></p>
    </div>
  );
}
