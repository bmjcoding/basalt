// RunAnnouncer (DECISIONS 316, 1.10): every event once, in order, each its own appended node; a repeated id adds nothing; nothing at mount; the role
// and name; it draws nothing; axe. Chromium, built package, real stylesheet. (No screen reader is heard here: backlog 6.)
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const FIXTURE = `
function App() {
  const [events, setEvents] = React.useState([{ id: "old", text: "Deploy 811 passed in 9.1 seconds" }]);
  React.useEffect(() => { window.send = (e) => setEvents((all) => [...all, e]); }, []);
  return <main style={{ padding: 24 }}><h1>Deploy 812</h1><B.RunAnnouncer label="Deploy 812 updates" events={events} /></main>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async () => {
  const { page, errors } = await fixturePage(browser, FIXTURE, { viewport: { width: 600, height: 400 }, theme: "dark", clock: true });
  await page.clock.runFor(20);
  page.errors = errors;
  return page;
};
const said = (page) => page.evaluate(() => [...document.querySelector(".basalt-run-announcer").children].map((c) => c.textContent));

test("nothing at mount; the role and name: a polite log of additions", async () => {
  const page = await open();
  assert.deepEqual(await said(page), []);
  const r = await page.evaluate(() => { const el = document.querySelector(".basalt-run-announcer"); return [el.getAttribute("role"), el.getAttribute("aria-live"), el.getAttribute("aria-relevant"), el.getAttribute("aria-label")]; });
  assert.deepEqual(r, ["log", "polite", "additions", "Deploy 812 updates"]);
  assert.equal(await page.getByRole("log", { name: "Deploy 812 updates" }).count(), 1);
  assert.equal(await page.locator("[role=alert]").count(), 0);
});

test("three events inside 300ms are all there, each one appended node, in order; the nodes already said are never replaced", async () => {
  const page = await open();
  await page.evaluate(() => window.send({ id: "start", text: "Deploy 812 started" }));
  await page.clock.runFor(20);
  const first = await page.evaluate(() => { window.__first = document.querySelector(".basalt-run-announcer").firstElementChild; return true; });
  void first;
  await page.clock.runFor(100);
  await page.evaluate(() => window.send({ id: "fail", text: "Test failed: 3 tests failed in session.test.ts. Retry is available." }));
  await page.clock.runFor(100);
  await page.evaluate(() => window.send({ id: "retry", text: "Retrying Test, attempt 2 of 2" }));
  await page.clock.runFor(20);
  assert.deepEqual(await said(page), ["Deploy 812 started", "Test failed: 3 tests failed in session.test.ts. Retry is available.", "Retrying Test, attempt 2 of 2"]);
  assert.ok(await page.evaluate(() => document.querySelector(".basalt-run-announcer").firstElementChild === window.__first), "the first node is the same node: appended to, never rewritten");
});

test("a repeated id adds nothing", async () => {
  const page = await open();
  await page.evaluate(() => { window.send({ id: "start", text: "Deploy 812 started" }); });
  await page.clock.runFor(20);
  await page.evaluate(() => { window.send({ id: "start", text: "Deploy 812 started" }); window.send({ id: "old", text: "Deploy 811 passed in 9.1 seconds" }); });
  await page.clock.runFor(20);
  assert.deepEqual(await said(page), ["Deploy 812 started"]);
});

test("it draws nothing: a visually hidden box", async () => {
  const page = await open();
  await page.evaluate(() => window.send({ id: "start", text: "Deploy 812 started" }));
  await page.clock.runFor(20);
  const box = await page.evaluate(() => { const b = document.querySelector(".basalt-run-announcer").getBoundingClientRect(); return [b.width, b.height]; });
  assert.ok(box[0] <= 1 && box[1] <= 1, `${box}`);
});

test("axe: no WCAG 2.2 AA violations, light and dark", async () => {
  for (const theme of ["light", "dark"]) {
    const { page } = await fixturePage(browser, FIXTURE, { viewport: { width: 600, height: 400 }, theme });
    await settle(page);
    await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; window.send({ id: "start", text: "Deploy 812 started" }); });
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((v) => v.id));
    assert.deepEqual(violations, [], theme);
  }
});
