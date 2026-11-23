// compose.mjs's placer (DECISIONS 306, 1.8): reads a figure's JSON on stdin and writes its placement for both directions on stdout, through React's own
// placeDiagram (elkjs, a build-time dependency of the tool, resolved from the repository). A page never holds elkjs. Bundled into parts/ by build.mjs.
import { placeDiagram } from "../../../packages/react/src/diagram-layout.ts";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => { input += c; });
process.stdin.on("end", async () => {
  const spec = JSON.parse(input);
  const directions = spec.direction ? [spec.direction] : spec.type === "flowchart" ? ["down", "right"] : ["right", "down"];
  const out = [];
  for (const d of directions) out.push(await placeDiagram(spec, d));
  process.stdout.write(JSON.stringify(out));
});
