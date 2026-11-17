// The charts port (DECISIONS 153, D7a): the skill's `Basalt.trailingMean` against React's `trailingMean`, on the same inputs, in Chromium. The skill's chart module is the only
// one the charts ballot names (the trend maths); the other new parts are React-only in this batch (see parity-differences.mjs). The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const INPUTS = [
  [1, 2, 3, 4, 5, 6, 7, 8],
  [1, 2],
  [5],
  [],
  [null, null, null, null],
  [1, 2, 3, null, 5, 6, 7],
  [1, 2, 3, 4, null, null, 7, 8, 9],
  [82.1, 81.9, null, 81.5, 81.7, 81.2, 81.4, null, null, 80.9, 81, 80.7],
];
const OPTIONS = [undefined, { window: 3 }, { window: 5, min: 2 }, { window: 1 }, { min: 1 }];

describe("the trend maths, React's against the skill's", () => {
  test("they agree on every input and every option, and never write NaN or Infinity", async () => {
    const react = await fixturePage(reactBrowser, "window.B = B;", { theme: "dark" });
    const skill = await openHtml(browser, compose(`<title>Chart</title><!-- basalt:use chart --><p>x</p>`, { fonts: false }).html, { scheme: "dark" });
    const run = (page, name) => page.evaluate(({ inputs, options, name }) => {
      const fn = name === "react" ? window.B.trailingMean : window.Basalt.trailingMean;
      return inputs.flatMap((values) => options.map((o) => fn(values, o)));
    }, { inputs: INPUTS, options: OPTIONS, name });
    const a = await run(react.page, "react");
    const b = await run(skill.page, "skill");
    assert.deepEqual(b, a);
    for (const list of a) for (const v of list) assert.ok(v === null || Number.isFinite(v));
    assert.deepEqual(react.errors, []);
    assert.deepEqual(skill.errors, []);
    await react.page.close();
    await skill.context.close();
  });
});
