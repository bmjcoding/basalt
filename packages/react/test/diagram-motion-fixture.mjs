// The animated examples (DECISIONS 292): CIMIP's five diagrams with what fixtures/diagram-motion.json adds to each, and the kit. Marks stay bundled ids,
// as the HTML skill writes them; React's side turns an id into its module (marks/<id>).
import fs from "node:fs";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
export const STILL = read("cimip-diagrams.json");
export const MOTION = read("diagram-motion.json");

/** One CIMIP figure, animated: a copy of the still fixture with its motion keys, its flow lines and its cards' marks. */
export function animated(key) {
  const { flow = [], marks = {}, ...keys } = MOTION.cimip[key];
  const spec = structuredClone(STILL[key]);
  Object.assign(spec, keys);
  if (spec.edges) spec.edges = spec.edges.map((e) => (flow.some(([f, t]) => f === e.from && t === e.to) ? { ...e, flow: true } : e));
  if (spec.nodes) spec.nodes = spec.nodes.map((n) => (marks[n.id] ? { ...n, mark: marks[n.id] } : n));
  return spec;
}

/** Every figure a page of the animated examples draws: the five, then the kit. */
export const FIGURES = ["architecture", "flowchart", "dataFlow", "sequence", "schema"];
export const kit = () => structuredClone(MOTION.kit);
