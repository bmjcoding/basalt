// A runs table with a filter row above it, as a TSX fixture for the still-table and multi-select tests. It is the shape the
// review round shows: a select column, a name that takes the rest, a status, a region, a duration and a cost (numbers), a
// start time, and a filter row of Window segments, status chips, a region checklist, Clear and the result line.
// The fixture sets `window.runs` so a test can read what the table shows and drive paging and loading.

export const NAMES = ["billing-worker", "edge-router", "ingest-batch", "mailer", "search-index", "thumbnailer", "auth-proxy", "report-builder"];
export const REGIONS = ["us-east", "us-west", "eu-central", "eu-west", "ap-south", "ap-northeast", "sa-east", "af-south"];

export const runsFixture = ({ rows = 24, long = true } = {}) => `
const NAMES = ${JSON.stringify(NAMES)};
const REGIONS = ${JSON.stringify(REGIONS)};
const STATUS = ["Succeeded", "Failed", "Running", "Queued"];
const RUNS = Array.from({ length: ${rows} }, (_, i) => ({
  id: i,
  name: NAMES[i % 8] + "-" + (100 + i) + (${long} && i % 5 === 0 ? "-with-a-long-suffix-that-has-to-truncate-in-its-column" : ""),
  status: STATUS[i % 4],
  region: REGIONS[(i * 3) % 8],
  duration: (i * 37) % 500 + 3,
  started: 1700000000 - i * 18000,
  cost: ((i * 13) % 90) / 10,
}));
const COLUMNS = [{ width: 44 }, {}, { width: 120 }, { width: 112 }, { width: 112 }, { width: 144 }, { width: 88 }];
const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function Runs() {
  const [sort, setSort] = React.useState({ key: "started", dir: "descending" });
  const [status, setStatus] = React.useState([]);
  const [region, setRegion] = React.useState([]);
  const [range, setRange] = React.useState("30d");
  const [picked, setPicked] = React.useState([]);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  window.runs = { setLoading, setPage, setQuery };
  const shown = RUNS
    .filter((r) => (status.length ? status.includes(r.status) : true) && (region.length ? region.includes(r.region) : true) && r.name.includes(query))
    .sort((a, b) => {
      const k = sort.key;
      const d = typeof a[k] === "string" ? a[k].localeCompare(b[k]) : a[k] - b[k];
      return (sort.dir === "ascending" ? d : -d) || a.id - b.id;
    });
  const pageRows = shown.slice(page * 10, page * 10 + 10);
  const head = (key, label, extra = {}) => (
    <B.TableHead sort={sort.key === key ? sort.dir : undefined} onSortChange={(dir) => setSort({ key, dir })} {...extra}>{label}</B.TableHead>
  );
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div id="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
        <B.SegmentedControl aria-label="Window" value={range} onValueChange={setRange}>
          <B.Segment value="24h">24h</B.Segment><B.Segment value="7d">7d</B.Segment><B.Segment value="30d">30d</B.Segment>
        </B.SegmentedControl>
        <B.MultiSelect label="Status" options={STATUS.map((s) => ({ value: s, label: s }))} value={status} onValueChange={setStatus} />
        <B.MultiSelect label="Region" toolbar options={REGIONS.map((s) => ({ value: s, label: s }))} value={region} onValueChange={setRegion} />
        <B.FilterResult>{"Showing " + shown.length + " of " + RUNS.length + " runs"}</B.FilterResult>
      </div>
      <B.TableContainer>
        <B.Table columns={COLUMNS} minWidth={760} pinned={2} aria-busy={loading || undefined} aria-label="Runs">
          <B.TableHeader>
            <B.TableRow>
              <B.TableHead aria-label="Select"><B.Checkbox aria-label="Select all" /></B.TableHead>
              {head("name", "Name")}
              {head("status", "Status")}
              {head("region", "Region")}
              {head("duration", "Duration", { numeric: true })}
              {head("started", "Started", { firstSort: "descending" })}
              {head("cost", "Cost", { numeric: true })}
            </B.TableRow>
          </B.TableHeader>
          <B.TableBody>
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <B.TableRow key={"s" + i}>{COLUMNS.map((c, j) => <B.TableCell key={j}><B.Skeleton style={{ width: j === 1 ? "60%" : 48, height: 12 }} /></B.TableCell>)}</B.TableRow>
                ))
              : pageRows.length === 0
                ? <B.TableEmpty colSpan={7} action={<B.Button size="sm" variant="secondary" onClick={() => { setStatus([]); setRegion([]); setQuery(""); }}>Clear filters</B.Button>}>No runs match these filters.</B.TableEmpty>
                : pageRows.map((r) => (
                    <B.TableRow key={r.id} selected={picked.includes(r.id)}>
                      <B.TableCell><B.Checkbox aria-label={"Select " + r.name} checked={picked.includes(r.id)} onCheckedChange={(on) => setPicked((p) => (on ? [...p, r.id] : p.filter((x) => x !== r.id)))} /></B.TableCell>
                      <B.TableCell><a href="#" className="name" style={{ color: "inherit" }}>{r.name}</a></B.TableCell>
                      <B.TableCell>{r.status}</B.TableCell>
                      <B.TableCell mono>{r.region}</B.TableCell>
                      <B.TableCell numeric>{r.duration + "s"}</B.TableCell>
                      <B.TableCell>{fmt.format(new Date(r.started * 1000))}</B.TableCell>
                      <B.TableCell numeric>{"$" + r.cost.toFixed(2)}</B.TableCell>
                    </B.TableRow>
                  ))}
          </B.TableBody>
        </B.Table>
      </B.TableContainer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Runs />);
`;

/**
 * Where every header is, relative to its table, and the left and right edges of its words. Measured at scroll 0 so the
 * pinned columns are where the layout puts them.
 */
export const measureHeaders = (page) => page.evaluate(() => {
  const table = document.querySelector(".basalt-table");
  const frame = document.querySelector(".basalt-table-container");
  // At scroll 0, where the layout puts every column: a pinned column is sticky, so it only moves relative to the table by design.
  const was = frame.scrollLeft;
  frame.scrollLeft = 0;
  const t = table.getBoundingClientRect();
  const out = {
    table: { w: t.width },
    heads: [...table.querySelectorAll("thead th")].map((th) => {
      const r = th.getBoundingClientRect();
      const words = th.querySelector(".basalt-sort-label") ?? th;
      const range = document.createRange();
      range.selectNodeContents(words);
      const w = range.getBoundingClientRect();
      return { x: +(r.left - t.left).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), y: +(r.top - t.top).toFixed(2), l: +(w.left - t.left).toFixed(2), r: +(w.right - t.left).toFixed(2), weight: getComputedStyle(words).fontWeight };
    }),
  };
  frame.scrollLeft = was;
  return out;
});
