// A deployment diagram (DECISIONS 359, Ops 3): read as an architecture and routed by the engine, with what is its own here: one environment a figure, the
// first words of its source line; its artifacts as rows, which a line may name (it lands on the host in this build). A third group
// level is not drawn in this build: it ships only with its label seat and line cut at every level. DeploymentDiagram hands this module to the engine on
// the spec. A host's copies (`× 3`) are the engine's (DECISIONS 405, G151), as an architecture card's are: read, drawn, said, listed, keyed and measured in
// diagram-core.ts. Nothing runs at load. The implementation has not been reviewed.

import { copiesOf, h, iso, kindLine, linkName, nodeText, txt } from "./diagram-core";
import type { DeploymentNode, DiagramFlowEdge, DiagramGroup, DiagramSpec, DiagramTypeExt, ExtBuildKit, MNode, Model, VChild, VElement, VNode } from "./diagram-core";

function prepare(spec: DiagramSpec, kit: ExtBuildKit): DiagramSpec {
  const { dev, error, warn } = kit;
  if (dev && !txt(spec.environment)) error("a deployment needs its environment: one environment a figure, the first words of its source line");
  const nodes = (Array.isArray(spec.nodes) ? spec.nodes : []) as DeploymentNode[];
  // The third level: refused in this build, so a group whose parent has a parent is a group of the top level.
  const groups = (Array.isArray(spec.groups) ? spec.groups : []) as DiagramGroup[];
  const parentOf = new Map(groups.map((g) => [String(g.id), g.parent ? String(g.parent) : undefined]));
  const flat = groups.map((g) => {
    const p = g.parent ? String(g.parent) : undefined;
    if (p && parentOf.get(p)) { dev && error(`the group "${g.label}" is a third level: a deployment's third level is not drawn in this build, so it is a group of the top level`); return { ...g, parent: undefined }; }
    return g;
  });
  const hostOf = new Map<string, string>();
  const ids = new Set(nodes.map((n) => String(n.id)));
  for (const n of nodes) for (const a of Array.isArray(n.artifacts) ? n.artifacts : []) {
    if (dev && (ids.has(String(a.id)) || hostOf.has(String(a.id)))) error(`the id "${String(a.id)}" is used twice (ids are unique across hosts and artifacts)`);
    hostOf.set(String(a.id), String(n.id));
  }
  const edges = ((Array.isArray(spec.edges) ? spec.edges : []) as DiagramFlowEdge[]).map((e) => {
    const from = String(e.from ?? ""), to = String(e.to ?? "");
    if (dev && !txt(e.label)) warn(`the line from ${from} to ${to} has no label: a deployment's line says what it carries`);
    return { ...e, from: hostOf.get(from) ?? from, to: hostOf.get(to) ?? to, fromArtifact: hostOf.has(from) ? from : undefined, toArtifact: hostOf.has(to) ? to : undefined };
  });
  return { ...spec, groups: flat, edges };
}

function adopt(m: Model, spec: DiagramSpec) {
  m.plan = { environment: txt(spec.environment) };
  for (const raw of (spec.nodes ?? []) as DeploymentNode[]) {
    const n = m.byId.get(String(raw.id));
    if (!n) continue;
    const rows = Array.isArray(raw.artifacts) ? raw.artifacts.map((a) => ({ id: String(a.id ?? ""), name: String(a.name ?? ""), detail: txt(a.detail) })) : [];
    n.artifacts = rows.length ? rows : undefined;
  }
  let k = 0;
  for (const e of (spec.edges ?? []) as Array<{ from: string; to: string; fromArtifact?: string; toArtifact?: string }>) {
    if (!m.byId.has(String(e.from)) || !m.byId.has(String(e.to))) continue;
    const me = m.edges[k++];
    if (me) { me.fromArtifact = e.fromArtifact; me.toArtifact = e.toArtifact; }
  }
}

/** A host: its kind line with its copies (the engine's), and with artifacts the node with no padding: a header band, then a row an artifact. */
function card(P: string, m: Model, n: MNode): VChild[] {
  if (!copiesOf(n) && !n.artifacts) return nodeText(P, m, n);
  const kind = kindLine(P, n);
  const words: VChild[] = [kind, h("span", { class: `${P}-name` }, linkName(P, n)), n.detail ? h("span", { class: `${P}-detail`, "data-mono": n.mono ? "" : undefined }, iso(n.detail)) : null];
  if (!n.artifacts) return words;
  return [
    h("span", { class: `${P}-host-head` }, words),
    h("span", { class: `${P}-host-rows` }, n.artifacts.map((a) => h("span", { class: `${P}-artifact`, "data-artifact": a.id }, h("span", { class: `${P}-artifact-name` }, iso(a.name)), a.detail ? h("span", { class: `${P}-artifact-detail` }, iso(a.detail)) : null))),
  ];
}

const artifactName = (m: Model, host: string, id?: string) => (id ? m.byId.get(host)?.artifacts?.find((a) => a.id === id)?.name : undefined);

function listLines(P: string, m: Model, H: (text: string) => VElement): VNode[] {
  const code = (s: string) => h("code", { class: `${P}-code` }, iso(s));
  const name = (id: string, row?: string) => [h("strong", null, iso(m.byId.get(id)?.name ?? id)), row ? [" (", code(row), ")"] : ""];
  return [H("Connections"), h("ol", { class: `${P}-list-items` }, m.edges.map((e) => h("li", null, name(e.from, artifactName(m, e.from, e.fromArtifact)), " to ", name(e.to, artifactName(m, e.to, e.toArtifact)), e.label ? [": ", code(e.label.replace(/\n/g, " "))] : "", m.legend[e.kind] ? ` (${m.legend[e.kind]})` : "", ".")))];
}

let made: DiagramTypeExt | undefined;
/** The deployment diagram's module, made at its first use. */
export function deploymentType(): DiagramTypeExt {
  return (made ??= {
    type: "deployment",
    as: "architecture",
    routed: true,
    stop: ["a part", "part"],
    prepare,
    adopt,
    card: (P, m, n) => card(P, m, n),
    nodeAttrs: (_m, n) => ({ "data-rows": n.artifacts ? "" : undefined }),
    sentenceMore: (_m, n) => (n.artifacts ? [`Runs ${n.artifacts.map((a) => (a.detail ? `${a.name} ${a.detail}` : a.name)).join(", ")}.`] : []),
    listPart: (P, _m, n) => [n.artifacts ? [" Runs ", n.artifacts.flatMap((a, j) => [j ? ", " : "", h("code", { class: `${P}-code` }, iso(a.name)), a.detail ? [" ", iso(a.detail)] : ""]), "."] : ""],
    listLines,
    sourceLead: (m) => (m.plan as { environment?: string } | undefined)?.environment,
  });
}
