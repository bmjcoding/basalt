// Round 51: lists and modals (DECISIONS 222, 224 and 226). The owner picked Opus's prototype (no council vote); this is Sonnet 5.5's build of it, and the implementation has not been reviewed.
// `Pagination` fixed in place (seven slots, arrows that never move), `ListBand` (the count, the pager and the page size above a list, sticky from 720), a numeric `Select`, a `MultiSelect` trigger
// that holds its width in a toolbar, `FilterToolbar` with a search, the empty state of DECISIONS 207, and `DialogContent form`: a centered modal from 720, a full-screen modal under it. The
// builds on #101 (the morphs). Every word and number is synthetic. States: `page-1`, `page-4`, `page-last`, `size-10`, `size-100`, `filtered`, `search-empty`, `filters-empty` for the list;
// `dialog`, `dialog-scrolled`, `dialog-error` for the form (at 390 the form is the full-screen modal). Each also ends `-forced-colours` or `-reduced-motion` for those emulations.

import * as React from "react";

import {
  Badge,
  Button,
  Card,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Dialog,
  Field,
  FilterResult,
  FilterToolbar,
  Icon,
  Input,
  ListBand,
  MultiSelect,
  Select,
  SearchGlyph,
  SheetBody,
  SheetFooter,
  SheetHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const SEV = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;
const STATUS = ["Investigating", "Identified", "Mitigating", "Monitoring", "Resolved"] as const;
const TITLES = ["Checkout timing out for one in twenty customers", "Payments API latency and elevated 5xx", "SMS delivery delayed for some customers", "Database proxy pool exhausted after the worker increase", "Search results missing recent orders", "Login fails for single sign-on users", "Card refunds stuck in pending", "Order router dropping partner orders", "Media uploads failing over 20 MB", "Status page not updating"];
const APPS = ["Payments API", "Checkout web", "Identity", "Ledger", "Notifications", "Order router", "Search index", "Media upload", "Partner feed", "Status page"];
const PEOPLE = ["Ama Kestrel", "Lio Brask", "Noor Feldane", "Rui Talmont", "Jo Vantree", "Kit Oyelaran"];

interface Incident { n: number; ref: string; sev: (typeof SEV)[number]; status: (typeof STATUS)[number]; title: string; who: string; app: string; age: string }

const INCIDENTS: Incident[] = Array.from({ length: 214 }, (_, i) => {
  const sev = SEV[(i * 7 + (i >> 3)) % 4]!;
  let status = STATUS[(i * 3 + (i >> 2)) % 5]!;
  if (sev === "SEV4" && status === "Mitigating") status = "Resolved";
  const n = 214 - i;
  return { n, ref: `INC-${String(n + 486).padStart(4, "0")}`, sev, status, title: TITLES[(i * 3) % TITLES.length]!, who: PEOPLE[(i * 5) % PEOPLE.length]!, app: APPS[(i * 7) % APPS.length]!, age: `${(i * 13) % 55 + 5} min` };
});
const PAST = Array.from({ length: 486 }, (_, j) => ({ ref: `INC-${String(486 - j).padStart(4, "0")}`, title: TITLES[(j * 3) % TITLES.length]!, sev: SEV[(j * 5) % 4]!, who: PEOPLE[(j * 7) % PEOPLE.length]!, when: `Nov ${(j % 28) + 1}, ${(j % 11) + 1}:${String((j * 7) % 60).padStart(2, "0")} PM`, took: `${(j * 11) % 14} h ${(j * 17) % 60} min`, app: APPS[(j * 3) % APPS.length]! }));

const tone = (sev: string) => (sev === "SEV1" ? "danger" : sev === "SEV2" ? "warning" : "neutral");

interface Start { page: number; size: number; q: string; sev: string[]; status: string[] }
const START: Record<string, Start> = {
  default: { page: 1, size: 25, q: "", sev: [], status: [] },
  "page-1": { page: 1, size: 25, q: "", sev: [], status: [] },
  "page-4": { page: 4, size: 25, q: "", sev: [], status: [] },
  "page-last": { page: 9, size: 25, q: "", sev: [], status: [] },
  "size-10": { page: 1, size: 10, q: "", sev: [], status: [] },
  "size-100": { page: 1, size: 100, q: "", sev: [], status: [] },
  filtered: { page: 1, size: 25, q: "", sev: ["SEV1", "SEV2"], status: ["Investigating"] },
  "search-empty": { page: 1, size: 25, q: "zzq", sev: [], status: [] },
  "filters-empty": { page: 1, size: 25, q: "", sev: ["SEV4"], status: ["Mitigating"] },
};
const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");

function Incidents({ state }: { state: string }) {
  const start = START[kindOf(state)] ?? START.default!;
  const [page, setPage] = React.useState(start.page);
  const [size, setSize] = React.useState(start.size);
  const [q, setQ] = React.useState(start.q);
  const [sev, setSev] = React.useState<string[]>(start.sev);
  const [status, setStatus] = React.useState<string[]>(start.status);
  const needle = q.trim().toLowerCase();
  const shown = INCIDENTS.filter((r) => (!sev.length || sev.includes(r.sev)) && (!status.length || status.includes(r.status)) && (!needle || `${r.title} ${r.ref} ${r.who} ${r.app}`.toLowerCase().includes(needle)));
  const rows = shown.slice((page - 1) * size, page * size);
  const filtered = sev.length > 0 || status.length > 0;
  const first = React.useRef<HTMLInputElement>(null);
  const clear = () => { setQ(""); setSev([]); setStatus([]); setPage(1); };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <FilterToolbar
        label="Filter incidents"
        search={
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", insetInlineStart: "var(--basalt-space-2-5)", top: "50%", transform: "translateY(-50%)", color: "var(--basalt-text-tertiary)", display: "inline-flex", pointerEvents: "none" }}><Icon icon={SearchGlyph} size={16} /></span>
            <Input ref={first} aria-label="Search incidents" placeholder="Search incidents" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ width: "100%", paddingInlineStart: "var(--basalt-space-8)" }} />
          </div>
        }
        filter={[
          <MultiSelect key="sev" toolbar label="Severity" options={SEV.map((v) => ({ value: v, label: v }))} value={sev} onValueChange={(v) => { setSev(v); setPage(1); }} />,
          <MultiSelect key="status" toolbar label="Status" options={STATUS.map((v) => ({ value: v, label: v }))} value={status} onValueChange={(v) => { setStatus(v); setPage(1); }} />,
        ]}
        result={<FilterResult>{`Showing ${shown.length} of ${INCIDENTS.length} incidents`}</FilterResult>}
      />
      <ListBand total={shown.length} maxTotal={INCIDENTS.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} noun="Incidents" />
      <Card style={{ overflow: "hidden", padding: 0 }}>
        {rows.length ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((r, i) => (
              <li key={r.n} style={i ? { borderTop: "var(--basalt-size-hairline) solid var(--basalt-border-divider)" } : undefined}>
                <a href={`#${r.ref}`} style={{ display: "grid", gridTemplateColumns: "var(--basalt-space-16) minmax(0, 1fr) auto", columnGap: "var(--basalt-space-4)", padding: "var(--basalt-space-3) var(--basalt-space-4)", color: "inherit", textDecoration: "none" }}>
                  <span><Badge status={tone(r.sev)}>{r.sev}</Badge></span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ color: "var(--basalt-text-primary)", fontWeight: 500 }}>{r.title}</span>
                    <span style={{ color: "var(--basalt-text-secondary)", fontSize: "var(--basalt-text-sm-size)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ref} · {r.status} · Commander {r.who} · {r.app}</span>
                  </span>
                  <span style={{ color: "var(--basalt-text-tertiary)", fontSize: "var(--basalt-text-sm-size)", fontVariantNumeric: "tabular-nums" }}>{r.age}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--basalt-space-3)", padding: "var(--basalt-space-12) var(--basalt-space-4)", textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--basalt-text-primary)", fontWeight: 500 }}>{filtered ? (needle ? `No incidents match “${q.trim()}” with these filters.` : "No incidents match these filters.") : `No incidents match “${q.trim()}”.`}</p>
            <Button onClick={() => { clear(); }}>{filtered ? "Clear filters" : "Clear search"}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function PastTable() {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(25);
  const [sort, setSort] = React.useState<"ascending" | "descending">("descending");
  const rows = [...PAST].sort((a, b) => (sort === "ascending" ? 1 : -1) * (a.ref < b.ref ? -1 : 1)).slice((page - 1) * size, page * size);
  return (
    <div>
      <ListBand total={PAST.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} noun="Past incidents" />
      <TableContainer label="Past incidents">
        <Table columns={[{ width: 100 }, { width: 80 }, { width: 150 }, { width: 150 }, { width: 120 }, { width: 140 }, {}]} minWidth={940}>
          <TableHeader><TableRow><TableHead onSortChange={() => { setSort(sort === "ascending" ? "descending" : "ascending"); setPage(1); }} sort={sort}>Ref</TableHead><TableHead>Severity</TableHead><TableHead>Commander</TableHead><TableHead>Declared</TableHead><TableHead numeric>Took</TableHead><TableHead>Application</TableHead><TableHead>Title</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => <TableRow key={r.ref}><TableRowHead>{r.ref}</TableRowHead><TableCell>{r.sev}</TableCell><TableCell>{r.who}</TableCell><TableCell>{r.when}</TableCell><TableCell numeric>{r.took}</TableCell><TableCell>{r.app}</TableCell><TableCell>{r.title}</TableCell></TableRow>)}
            {rows.length === 0 ? <TableEmpty colSpan={7}>No past incidents.</TableEmpty> : null}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// The Declare form. Its body is tall enough to scroll in a short window; `dialog-error` has submitted with nothing entered.
function Declare({ state }: { state: string }) {
  const kind = kindOf(state);
  const [error, setError] = React.useState(kind === "dialog-error");
  const [open, setOpen] = React.useState(kind.startsWith("dialog"));
  const body = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (kind !== "dialog-scrolled") return undefined;
    const timer = window.setTimeout(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; }, 400);
    return () => window.clearTimeout(timer);
  }, [kind]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--basalt-space-3)" }}>
      <Text size="sm" tone="secondary">A form opens in the center from 720 (480 wide, its top held where it opened) and fills the window under it. Esc, Close and Cancel always close it; the scrim closes it only while nothing has been typed.</Text>
      <Dialog open={open} onOpenChange={setOpen}>
        <div><DialogTrigger render={<Button variant="primary">Declare incident</Button>} /></div>
        <DialogContent form>
          <SheetHeader closeLabel="Close declare incident"><DialogTitle>Declare an incident</DialogTitle></SheetHeader>
          <SheetBody ref={body}>
            <DialogDescription>Say what is happening. Everyone on call for the application is told, and a room opens for it.</DialogDescription>
            <form id="declare-form" onSubmit={(e) => { e.preventDefault(); setError(true); }} style={{ display: "flex", flexDirection: "column", gap: "var(--basalt-space-5)" }}>
              <Field label="What is happening" required invalid={error} error={error ? "Say what is happening, in at least three characters." : undefined}><Input name="what" placeholder="Checkout timing out for some customers" /></Field>
              <Field label="Severity" description="SEV2: a core service is degraded."><Select aria-label="Severity" defaultValue="sev2" options={[{ value: "sev1", label: "SEV1" }, { value: "sev2", label: "SEV2" }, { value: "sev3", label: "SEV3" }, { value: "sev4", label: "SEV4" }]} /></Field>
              <Field label="Application" optional><Input name="app" placeholder="Search the registry" /></Field>
              <Field label="ServiceNow ticket" optional><Input name="ticket" placeholder="INC0012345" /></Field>
              <Field label="Agent first look" description="The agent reads recent deploys and alerts for the application and posts what it finds in the room."><Switch defaultChecked>Run it when the room opens</Switch></Field>
              <Field label="Who else should be told" optional description="Names or teams, one a line."><Input name="who" placeholder="Payments on call" /></Field>
            </form>
          </SheetBody>
          <SheetFooter><DialogActions><DialogClose render={<Button variant="secondary">Cancel</Button>} /><Button variant="primary" type="submit" form="declare-form">Declare incident</Button></DialogActions></SheetFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LIST_STATES = ["page-4", "page-last", "size-10", "size-100", "filtered", "search-empty", "filters-empty", "page-1-forced-colours", "page-1-reduced-motion", "filtered-forced-colours"];
const DIALOG_STATES = ["dialog", "dialog-scrolled", "dialog-error", "dialog-forced-colours", "dialog-reduced-motion"];
const SHOT = { widths: [1440, 390], scales: [1, 2] };

export const ROUND_51: Round = {
  id: "51",
  title: "Lists and modals: paging with a page size, filters over a list, the centered form (DECISIONS 222, 224, 226)",
  reviewed: false,
  summary:
    "The owner picked Opus's prototype from the lists-and-modals round (DECISIONS 224, 226) with no council vote; this is its build, and the implementation has not been reviewed. Everything that changes a list sits above it: the filters, then one band with the count, the pager and the page size. Pagination is seven fixed slots and Previous and Next never move; the band is sticky under the bar from 720; a numeric Select and a toolbar MultiSelect hold their width; the empty state follows DECISIONS 207; and a form opens as a centered Dialog (the sheet's head, body and foot, its top held where it opened) over the scrim from 720 and as a full-screen modal under it. Built on #101. The back-to-top button (DECISIONS 225) is not built; the band leaves room for it.",
  steps: [
    {
      id: "incidents",
      name: "The incident rows: the band and the filters",
      intro: "214 synthetic incidents in a rimmed panel, with a search, Severity and Status filters, and the band above the rows. States: page 1, a middle page, the last page, 10 and 100 per page, a filter, the two empty states.",
      decisions: [
        "Everything that changes a list sits above it (DECISIONS 222): a bar under the list moved 891px across the pages and 7,939px across every action; above it nothing moved, at 1440, 1024, 720 and 390.",
        "The count is “1–25 of 214”, the pager is seven fixed slots, the page size is “25 per page” named “Incidents per page”. A new size keeps the first row in view.",
        "A search or a filter returns to page 1. The empty state follows DECISIONS 207: “Clear search” for a search alone, “Clear filters” for a filter (and “No incidents match “zzq” with these filters.” for both).",
        "Under 640px of its width the band is Previous, the count and Next with the page size after them; from 720 it is sticky under the app's bar.",
        "The implementation has not been reviewed by the design panel or the owner.",
      ],
      tryIt: ["Press Next, Next, Next: the arrows stay under the pointer.", "Choose 100 per page, then 10.", "Type “zzq”, then clear it. Choose SEV4 and Mitigating.", "Scroll: the band sticks under the top and a line shows under it."],
      states: [...LIST_STATES],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <Incidents state={state} />,
    },
    {
      id: "table",
      name: "A still table with the band",
      intro: "486 past incidents in a still table, sorted by Ref and paged. The columns do not move through any page, size or sort.",
      decisions: ["The band above a still table is the band above rows: the table's header positions, column widths and alignment never move.", "Sorting returns to page 1."],
      tryIt: ["Press Ref to sort; page through; choose 100 per page."],
      states: ["page-4", "size-10-forced-colours"],
      ...SHOT,
      height: 900,
      demo: () => <PastTable />,
    },
    {
      id: "declare",
      name: "The Declare form as a centered modal",
      intro: "“Declare an incident”: the sheet's head, body and foot in a 480 box over the scrim; at 390 it is the full-screen modal.",
      decisions: [
        "Tasks open in the center; columns open at their side. The head and foot are held while the body scrolls; the dialog is at most the window less 16px above and below.",
        "Its top is held where it opened: the error under the field grows it downward and the title does not move.",
        "A press on the scrim closes it only while nothing has been entered. Focus goes to the first field, or to the title when a touch opened it.",
        "Under 720: the whole window, square, no rim or shadow, rising from the bottom; the foot's two actions are equal 44px buttons. Reduced motion fades only.",
      ],
      tryIt: ["Open it, press Declare incident with the field empty: the error appears and the title stays put.", "Type, then press the scrim: nothing happens. Esc closes."],
      states: [...DIALOG_STATES],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <Declare state={state} />,
    },
  ],
};
