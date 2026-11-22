// A synthetic models table for the three sort states and the column explainers (DECISIONS 257 and 261), as a TSX fixture: a pinned name,
// three numeric columns (two prices and a latency, two of them not observed), a release date with ties, and two yes/no columns with
// explainers. The rows sort from the table's own order with `sortRows`, so the third press gives the load order back. `window.models`
// reads the order on screen; `window.MODEL_ORDER` is the load order.

export const MODELS = [
  ["lumen/atlas-3", 2, 8, 0.62, "2026-11-19", 1, 1],
  ["lumen/atlas-3-mini", 0.25, 1, 0.31, "2026-11-19", 1, 1],
  ["quill/sparrow-2", 1.2, 4.8, 0.48, "2026-11-12", 0, 1],
  ["quill/sparrow-2-long-context-extended", 3, 15, null, "2026-11-12", 0, 0],
  ["harbor/tern-8b", 0.05, 0.2, 0.18, "2026-10-30", 1, 0],
  ["harbor/tern-70b", 0.6, 0.9, 0.74, "2026-10-30", 1, 0],
  ["meridian/kestrel", 5, 25, 1.2, "2026-10-21", 0, 1],
  ["meridian/kestrel-fast", 6, 30, 0.55, "2026-10-21", 0, 1],
  ["basin/heron-1.5", 0.8, 3.2, null, "2026-09-28", 1, 1],
  ["basin/heron-1", 0.4, 1.6, 0.95, "2026-08-14", 0, 0],
];
export const HEADS = ["Model", "Input", "Output", "Latency", "Released", "Zero retention", "No training"];

export const modelsFixture = ({ top = 280, width } = {}) => `
const MODELS = ${JSON.stringify(MODELS)};
window.MODEL_ORDER = MODELS.map((m) => m[0]);
const COLUMNS = [{}, { width: 104 }, { width: 104 }, { width: 120 }, { width: 140 }, { width: 192 }, { width: 168 }];
const KEYS = [
  { label: "Model" },
  { label: "Input", numeric: true },
  { label: "Output", numeric: true },
  { label: "Latency", numeric: true },
  { label: "Released", firstSort: "descending" },
  { label: "Zero retention", firstSort: "descending", explain: ["Zero retention", "At least one provider for this model says it keeps no prompts or outputs once it has answered. Providers report this themselves.", "How retention is reported"] },
  { label: "No training", firstSort: "descending", explain: ["No training", "No provider for this model trains on your prompts or outputs. Providers report this themselves.", "How training terms are read"] },
];
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
function Models() {
  const [sort, setSort] = React.useState({ index: -1, dir: undefined });
  const rows = B.sortRows(MODELS, (m) => m[sort.index], sort.dir);
  window.models = { order: () => [...document.querySelectorAll("tbody tr > th")].map((t) => t.textContent), setSort };
  return (
    <div style={{ padding: "${top}px 16px 16px"${width ? `, width: ${width}` : ""} }}>
      <B.TableContainer label="Models">
        <B.Table columns={COLUMNS} minWidth={1008} pinned={1} aria-label="Models">
          <B.TableHeader>
            <B.TableRow>
              {KEYS.map((k, i) => (
                <B.TableHead key={k.label} numeric={k.numeric} firstSort={k.firstSort} sort={sort.index === i ? sort.dir : undefined} onSortChange={(dir) => setSort({ index: dir ? i : -1, dir })}
                  explainer={k.explain ? <B.TableHeadExplainer title={k.explain[0]}><p>{k.explain[1]}</p><p><B.Link href={"#note-" + i}>{k.explain[2]}</B.Link></p></B.TableHeadExplainer> : undefined}>{k.label}</B.TableHead>
              ))}
            </B.TableRow>
          </B.TableHeader>
          <B.TableBody>
            {rows.map((m) => (
              <B.TableRow key={m[0]}>
                <B.TableRowHead>{m[0]}</B.TableRowHead>
                <B.TableCell numeric>{"$" + m[1].toFixed(2)}</B.TableCell>
                <B.TableCell numeric>{"$" + m[2].toFixed(2)}</B.TableCell>
                {m[3] === null ? <B.TableCell numeric notObserved /> : <B.TableCell numeric>{m[3].toFixed(2) + " s"}</B.TableCell>}
                <B.TableCell>{date.format(new Date(m[4]))}</B.TableCell>
                <B.TableCell>{m[5] ? "Yes" : "No"}</B.TableCell>
                <B.TableCell>{m[6] ? "Yes" : "No"}</B.TableCell>
              </B.TableRow>
            ))}
          </B.TableBody>
        </B.Table>
      </B.TableContainer>
      <p style={{ height: 1200 }}><a href="#after">After the table</a></p>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Models />);
`;
