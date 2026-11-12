// Re-records the pixel baselines (fixtures/baseline-*.html) from the pages the skill composes today, with Geist replaced by the
// placeholder the pixel test fills in (so the fixtures stay small and the font stays out of the diff).
//
//   node tools/html-skill/test/record-baseline.mjs
//
// Run it only in a PR that changes a pixel on purpose, in the same commit, after `npm run build`; the fixtures' diff then shows what
// moved. Look at the before and after of every region that differs (the PR says which parts changed) before committing. It never
// loosens pixel.test.mjs: the test still compares the composed page with the fixture, pixel for pixel.
import fs from "node:fs";
import path from "node:path";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { EXAMPLES, here, read } from "./support.mjs";

const pages = {
  static: EXAMPLES.static,
  interactive: EXAMPLES.interactive,
  "kitchen-sink": read(here, "fixtures", "kitchen-sink.body.html"),
  forms: read(here, "fixtures", "forms.body.html"),
  tables: read(here, "fixtures", "tables.body.html"),
  commands: read(here, "fixtures", "commands.body.html"),
  art: read(here, "fixtures", "art.body.html"),
  rest: read(here, "fixtures", "rest.body.html"),
};

for (const [name, body] of Object.entries(pages)) {
  const html = compose(body, { fonts: false }).html.replace(/(<style>)/, "<!-- basalt:fonts -->\n$1");
  fs.writeFileSync(path.join(here, "fixtures", `baseline-${name}.html`), html);
  console.log(`baseline-${name}.html: ${Buffer.byteLength(html)} bytes`);
}
