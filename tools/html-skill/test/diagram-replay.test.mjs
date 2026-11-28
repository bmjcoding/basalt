// The skill's "Draw again" and a card's count (DECISIONS 405, G149 and G151): `"replay": true` draws the button in the diagram-motion module's foot, a
// press plays the entrance again, a Basalt.diagram call that only sends keeps a replay in progress and one that changes "replay" draws a new figure, and a
// motion button that leaves while it holds focus hands it back. An architecture's `replicas` is the diagram module's own: no deployment module is needed
// for it. Written while tests are paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { animated, kit, STILL } from "../../../packages/react/test/diagram-motion-fixture.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const figure = (spec, id) => `<figure class="diagram"${id ? ` id="${id}"` : ""}><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure>`;
const page = (figs) => `<title>Replay</title><main style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:48px">${figs.join("")}</main>`;
const frames = (p, n = 3) => p.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
const entrance = (p, id) => p.evaluate((id) => document.getElementById(id).getAttribute("data-entrance"), id);
const finish = (p, id) => p.evaluate((id) => { for (const a of document.getElementById(id).getAnimations({ subtree: true })) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish(); }, id);
const until = (p, fn, arg) => p.waitForFunction(fn, arg, { polling: "raf", timeout: 5000 });
async function atRest(p, id) {
  await p.evaluate((id) => document.getElementById(id).scrollIntoView({ block: "center" }), id);
  await until(p, (id) => ["running", "done"].includes(document.getElementById(id).getAttribute("data-entrance")), id);
  await finish(p, id);
  await until(p, (id) => document.getElementById(id).getAttribute("data-entrance") === "done", id);
}

describe("Draw again", () => {
  test("the foot: View as list, Expand, Draw again, Pause animations; named with its figure; not drawn without \"replay\": true", async () => {
    const { page: p, errors } = await openHtml(browser, compose(page([figure({ ...kit(), replay: true }, "fig-kit"), figure(kit(), "fig-plain")])).html);
    await p.waitForSelector("#fig-kit .diagram-replay:not([hidden])");
    const words = await p.evaluate(() => [...document.querySelectorAll("#fig-kit .diagram-foot button")].filter((b) => !b.hidden).map((b) => b.textContent.trim()));
    assert.deepEqual(words, ["View as list", "Expand", "Draw again", "Pause animations"]);
    const named = await p.evaluate(() => { const b = document.querySelector("#fig-kit .diagram-replay"); return [b.id, b.getAttribute("aria-labelledby"), document.getElementById("fig-kit").getAttribute("aria-labelledby")]; });
    assert.match(named[0], /-replay$/);
    assert.equal(named[1], `${named[0]} ${named[2]}`);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#fig-plain .diagram-replay")].filter((b) => !b.hidden).length), 0);
    assert.deepEqual(errors, []);
  });

  test("a press plays the entrance from its first frame at once; a call that only sends keeps it; a call that changes replay draws a new figure at rest", async () => {
    const spec = (send, replay = true) => ({ ...animated("dataFlow"), replay, packet: { path: ["send", "append", "row", "hear", "see"], send } });
    const { page: p } = await openHtml(browser, compose(page([figure(spec(0), "fig-send")])).html);
    await atRest(p, "fig-send");
    await p.click("#fig-send .diagram-replay");
    assert.equal(await entrance(p, "fig-send"), "running");
    await p.evaluate((s) => window.Basalt.diagram(document.getElementById("fig-send"), s), spec(1));
    assert.equal(await entrance(p, "fig-send"), "running", "a send-only call keeps the replay");
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#fig-send .diagram-packet")].filter((d) => d.style.display !== "none").length), 0, "and its send waits");
    await finish(p, "fig-send");
    await until(p, () => { const d = document.querySelector("#fig-send .diagram-packet"); return d && d.style.display !== "none"; });
    await p.evaluate((s) => window.Basalt.diagram(document.getElementById("fig-send"), s), spec(1, false));
    await frames(p, 4);
    assert.equal(await entrance(p, "fig-send"), "done", "a new figure, which never replays");
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("#fig-send .diagram-replay")].filter((b) => !b.hidden).length), 0);
  });

  test("under the hold a press plays; reduced motion turned on mid-play settles it, removes the button and hands focus to the control before it", async () => {
    const { page: p } = await openHtml(browser, compose(page([figure({ ...animated("sequence"), replay: true }, "fig-seq")])).html);
    await atRest(p, "fig-seq");
    await p.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await p.focus("#fig-seq .diagram-replay");
    await p.keyboard.press("Enter");
    assert.equal(await entrance(p, "fig-seq"), "running", "it plays under the hold");
    await p.emulateMedia({ reducedMotion: "reduce" });
    await until(p, () => document.querySelector("#fig-seq .diagram-replay").hidden);
    assert.equal(await entrance(p, "fig-seq"), "done");
    assert.equal(await p.evaluate(() => document.activeElement.className), "btn diagram-play", "the run button, before it, has focus");
  });

  test("narrowed to a layout with no lines: a focused motion button hands focus to the control before it that stays", async () => {
    for (const cls of ["diagram-play", "diagram-replay"]) {
      const { page: p } = await openHtml(browser, compose(page([figure({ ...animated("sequence"), replay: true }, "fig-seq")])).html);
      await atRest(p, "fig-seq");
      await p.focus(`#fig-seq .${cls}`);
      await p.setViewportSize({ width: 390, height: 844 });
      await frames(p, 8);
      assert.equal(await p.evaluate(() => document.querySelectorAll("#fig-seq .diagram-edge").length), 0);
      assert.match(await p.evaluate(() => document.activeElement.className), /diagram-expand/, cls);
    }
  });

  test("the viewer draws none", async () => {
    const { page: p } = await openHtml(browser, compose(page([figure({ ...kit(), replay: true }, "fig-kit")])).html);
    await atRest(p, "fig-kit");
    await p.click("#fig-kit .diagram-expand");
    await p.waitForSelector("dialog[open] .diagram[data-layout]");
    assert.equal(await p.evaluate(() => [...document.querySelectorAll("dialog .diagram-replay")].length), 0);
  });
});

describe("a card's count", () => {
  test("an architecture's replicas is the diagram module's: the count, its words and its key with no deployment module", async () => {
    const spec = { ...STILL.architecture, nodes: STILL.architecture.nodes.map((n) => (n.id === "svc" ? { ...n, replicas: 3 } : n)) };
    const made = compose(page([figure(spec, "fig-a")]));
    assert.ok(!made.modules.includes("diagram-deployment"));
    const { page: p, errors } = await openHtml(browser, made.html);
    const seen = await p.evaluate(() => {
      const c = document.querySelector('#fig-a .diagram-node[data-node="svc"] .diagram-replicas');
      const cs = getComputedStyle(c);
      return { text: c.textContent, numeric: cs.fontVariantNumeric, weight: cs.fontWeight, key: [...document.querySelectorAll("#fig-a .diagram-legend li")].some((li) => li.textContent.includes("How many copies run")), list: document.querySelector("#fig-a .diagram-list").textContent.includes("3 copies.") };
    });
    assert.deepEqual(seen, { text: "× 3", numeric: "tabular-nums", weight: "500", key: true, list: true });
    assert.deepEqual(errors, []);
  });
});
