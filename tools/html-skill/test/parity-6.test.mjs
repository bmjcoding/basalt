// The sixth parity PR (forms and selection of batch 7, DECISIONS 108), in a browser: the checkbox, radio and switch as styled native inputs (labels, names, the
// keys, the form's value, the mixed state), the select (typeahead, two-line rows, the closed trigger's label, the keys, touch), the choice card, the pressed toggle,
// a table's checkbox column (select-all and its mixed state, the count, the columns unmoved through selection) and the loops hold (every loop stopped, remembered,
// carried across tabs, released to the shared clock), held to what React gives them. parity.test.mjs compares each part's computed styles with React's; this file
// pins behaviour. Both themes, 390 wide, touch, reduced motion, forced colours, axe. Anything timed runs on the shared animation clock. The data is synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
};

const PAGE = `<main class="page stack">
  <h1>Forms and selection</h1>
  <form id="form" class="panel panel-pad stack" onsubmit="return false">
    <div class="field"><label for="region">Region</label>
      <span class="select"><select class="input" id="region" name="region">
        <button><selectedcontent></selectedcontent></button>
        <option value="" disabled selected hidden>Select…</option>
        <option value="eu">Frankfurt<span class="option-description">eu-central, lowest latency</span></option>
        <option value="us">Ashburn</option>
        <option value="ap">Singapore<span class="option-description">ap-southeast</span></option>
        <option value="sa">Sao Paulo</option>
      </select></span></div>
    <div class="field"><label for="plain">Plain</label><span class="select"><select class="input" id="plain" name="plain"><option value="one">One</option><option value="two">Two</option></select></span></div>
    <label class="choice"><input type="checkbox" name="notify" value="yes"> Email me about builds</label>
    <label class="choice"><input type="checkbox" id="mixed" name="mixed"> Mixed</label>
    <label class="choice"><input type="checkbox" name="off" disabled> Disabled</label>
    <div class="radio-group" role="radiogroup" aria-label="Plan">
      <label class="choice"><input type="radio" name="plan" value="free" checked> Free</label>
      <label class="choice"><input type="radio" name="plan" value="pro"> Pro</label>
      <label class="choice"><input type="radio" name="plan" value="team"> Team</label></div>
    <label class="choice"><input type="checkbox" role="switch" name="auto" value="on"> Auto-deploy</label>
    <label class="choice"><input type="checkbox" role="switch" name="live" value="on" checked> Live updates</label>
  </form>
  <div class="choice-card-group" role="radiogroup" aria-label="Billing">
    <label class="panel choice-card"><input class="choice-card-input" type="radio" name="bill" value="month" checked aria-labelledby="c1t" aria-describedby="c1d"><span class="choice-card-head"><span class="choice-card-title" id="c1t">Monthly</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c1d">Pay as you go.</span></label>
    <label class="panel choice-card"><input class="choice-card-input" type="radio" name="bill" value="year" aria-labelledby="c2t" aria-describedby="c2d"><span class="choice-card-head"><span class="choice-card-title" id="c2t">Yearly</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c2d">Two months free.</span></label>
    <label class="panel choice-card"><input class="choice-card-input" type="radio" name="bill" value="team" disabled aria-labelledby="c3t" aria-describedby="c3d"><span class="choice-card-head"><span class="choice-card-title" id="c3t">Team</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c3d">Not available.</span></label>
  </div>
  <div class="cluster">
    <button class="btn" id="tog" aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Watch</button>
    <button class="btn" id="tog2" data-variant="ghost" aria-pressed="true"><span class="btn-check" aria-hidden="true"></span>Follow</button>
  </div>
  <p role="status" data-select-count id="count"></p>
  <div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0"><table id="runs">
    <thead><tr><th class="select-col"><input type="checkbox" id="all" data-select-all aria-label="Select all runs"></th><th>Run</th><th>Status</th><th data-numeric>Time</th></tr></thead>
    <tbody>
      <tr><td class="select-col"><input type="checkbox" aria-label="Select run-0141" checked></td><td data-mono>run-0141</td><td><span class="status" data-status="success">Passed</span></td><td data-numeric>4.2 s</td></tr>
      <tr><td class="select-col"><input type="checkbox" aria-label="Select run-0140"></td><td data-mono>run-0140</td><td><span class="status" data-status="danger">Failed</span></td><td data-numeric>11.8 s</td></tr>
      <tr><td class="select-col"><input type="checkbox" aria-label="Select run-0139"></td><td data-mono>run-0139</td><td><span class="status"><braille-spinner></braille-spinner>Running</span></td><td data-numeric>1.1 s</td></tr>
    </tbody></table></div>
  <div class="cluster">
    <span class="spinner" role="status" aria-label="Loading"></span>
    <span class="status"><braille-spinner></braille-spinner>Running</span>
    <button class="btn" id="busy" aria-busy="true">Saving</button>
    <button class="btn" id="hold" data-loops-toggle aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Pause animations</button>
    <label class="choice"><input type="checkbox" role="switch" id="holdsw" data-loops-toggle> Pause animations</label>
  </div>
  <figure class="code terminal" id="replay" data-replay data-interval="600"><figcaption>Deploy</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="command">npm run build</span><span data-kind="output">building</span><span data-kind="done">Built</span></code></pre></figure>
  <script>document.getElementById("mixed").indeterminate = true;
    document.getElementById("tog").addEventListener("click", function (e) { var b = e.currentTarget; b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); });</script>
</main>`;

const html = () => compose(`<title>Forms</title>${PAGE}`, { fonts: false }).html;
/** Lets every finite animation and transition end (the loops run on, so they are not waited for): a state is read settled. */
const pickerSettled = (page, id) => page.waitForFunction((i) => { const s = getComputedStyle(document.getElementById(i), "::picker(select)"); return document.getElementById(i).matches(":open") && s.opacity === "1" && s.transform === "none"; }, id);
const settled = (page) => page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
async function open({ scheme = "dark", width = 1440, touch = false, reducedMotion = "no-preference", forced = false } = {}) {
  const opened = await openHtml(browser, html(), { scheme, width, touch, reducedMotion });
  if (forced) { await opened.page.emulateMedia({ forcedColors: "active" }); await settled(opened.page); }
  return opened;
}
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const css = (locator, ...props) => locator.evaluate((el, names) => { const s = getComputedStyle(el); return Object.fromEntries(names.map((n) => [n, s[n]])); }, props);
const form = (page) => page.evaluate(() => Object.fromEntries([...new FormData(document.getElementById("form"))].map(([k, v]) => [k, v])));
/** A token's colour as the browser resolves it, through a probe. */
const token = (page, name) => page.evaluate((n) => { const p = document.createElement("div"); p.style.color = `var(${n})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, name);
const loopCount = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity && /^bh-/.test(a.animationName ?? "")).length);

describe("checkbox, radio and switch: native inputs, named, keyboard, in the form", () => {
  for (const theme of THEMES) {
    test(`a label toggles its box, Space does, and the form carries the value (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      const notify = page.getByRole("checkbox", { name: "Email me about builds" });
      assert.equal(await notify.isChecked(), false);
      await page.getByText("Email me about builds").click();
      assert.equal(await notify.isChecked(), true);
      const sent = await form(page);
      assert.deepEqual([sent.notify, sent.plan, sent.live, sent.plain, "off" in sent, "mixed" in sent], ["yes", "free", "on", "one", false, false], "checked boxes send their value; a disabled or unchecked one sends nothing");
      await notify.focus();
      await page.keyboard.press("Space");
      assert.equal(await notify.isChecked(), false);
      // Disabled: not toggled by its label, not focusable, 50%.
      const off = page.getByRole("checkbox", { name: "Disabled" });
      await page.getByText("Disabled", { exact: true }).click({ force: true });
      assert.equal(await off.isChecked(), false);
      assert.equal((await css(off, "opacity")).opacity, "0.5");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`a mixed box is mixed, draws its Minus, and a press makes it checked (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const mixed = page.getByRole("checkbox", { name: "Mixed" });
      assert.equal(await mixed.evaluate((el) => el.indeterminate), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("mixed"), "::before").display), "block");
      assert.equal(await mixed.evaluate((el) => getComputedStyle(el).backgroundColor === getComputedStyle(document.querySelector("input[name=notify]")).backgroundColor), false, "filled with the action colour, not the raised surface");
      await mixed.click();
      assert.deepEqual(await mixed.evaluate((el) => [el.indeterminate, el.checked]), [false, true]);
      await context.close();
    });

    test(`a radio group is one tab stop, the arrows move and choose within it, and the form carries the choice (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const group = page.getByRole("radiogroup", { name: "Plan" });
      await group.getByRole("radio", { name: "Free" }).focus();
      await page.keyboard.press("ArrowDown");
      assert.equal(await group.getByRole("radio", { name: "Pro" }).isChecked(), true);
      assert.equal(await group.getByRole("radio", { name: "Free" }).isChecked(), false);
      assert.equal((await form(page)).plan, "pro");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      assert.equal(await group.getByRole("radio", { name: "Free" }).isChecked(), true, "the arrows wrap");
      await page.keyboard.press("Tab");
      assert.notEqual(await page.evaluate(() => document.activeElement.closest("[role=radiogroup]")?.getAttribute("aria-label")), "Plan", "Tab leaves the group");
      // The dot is a 6px disc in the box (the dot token), centred.
      const dot = await page.evaluate(() => { const s = getComputedStyle(document.querySelector("input[name=plan]:checked"), "::before"); return [s.width, s.height, s.borderTopLeftRadius]; });
      assert.deepEqual(dot, ["6px", "6px", "9999px"]);
      await context.close();
    });

    test(`a switch is a switch: named, Space flips it, the thumb travels 14px, the form carries it (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const auto = page.getByRole("switch", { name: "Auto-deploy" });
      assert.equal(await auto.isChecked(), false);
      const travel = () => page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector("input[name=auto]"), "::before").transform).m41);
      assert.equal(await travel(), 0);
      await auto.focus();
      await page.keyboard.press("Space");
      assert.equal(await auto.isChecked(), true);
      await settle(page); // the thumb's travel is a transition
      assert.equal(Math.round(await travel()), 14, "32 wide, 14 thumb, 2 either side");
      assert.equal((await form(page)).auto, "on");
      // 32 by 18, fully round; the on track is the action fill.
      assert.deepEqual(await auto.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }), [32, 18]);
      await context.close();
    });
  }

  test("a switch's thumb eases its move on the shared clock, and under reduced motion it only changes colour", async () => {
    const { page, context } = await open();
    const clock = await freezeAnimations(page);
    const thumb = () => page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector("input[name=auto]"), "::before").transform).m41);
    await page.locator("input[name=auto]").evaluate((el) => el.click());
    await clock.advance(50);
    const mid = await thumb();
    assert.ok(mid > 0 && mid < 14, `part-way: ${mid}`);
    await clock.advance(200);
    assert.ok(Math.abs((await thumb()) - 14) < 0.01);
    await clock.thaw();
    await context.close();
    const reduced = await open({ reducedMotion: "reduce" });
    assert.equal(await reduced.page.evaluate(() => getComputedStyle(document.querySelector("input[name=auto]"), "::before").transitionProperty), "background-color");
    await reduced.context.close();
  });

  test("on touch the label is the 44px target, the box stays 16px", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    const label = page.locator("label.choice").first();
    assert.ok((await box(label)).height >= 44 && (await box(label)).width >= 44);
    assert.deepEqual(await page.locator("input[name=notify]").evaluate((el) => [el.offsetWidth, el.offsetHeight]), [16, 16]);
    await context.close();
  });

  test("forced colours: off is a ButtonText border on Canvas, on is Highlight with the mark in HighlightText, and the radio dot is a disc", async () => {
    const { page, context } = await open({ forced: true });
    const sys = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); const r = (v) => { p.style.color = v; return getComputedStyle(p).color; }; const o = { ButtonText: r("ButtonText"), Canvas: r("Canvas"), Highlight: r("Highlight"), HighlightText: r("HighlightText") }; p.remove(); return o; });
    const off = await css(page.locator("input[name=notify]"), "borderTopColor", "backgroundColor", "borderTopWidth");
    assert.deepEqual([off.borderTopColor, off.backgroundColor, off.borderTopWidth], [sys.ButtonText, sys.Canvas, "1px"]);
    const on = await css(page.locator("input[name=plan]:checked"), "backgroundColor");
    assert.equal(on.backgroundColor, sys.Highlight);
    const dot = await page.evaluate(() => { const s = getComputedStyle(document.querySelector("input[name=plan]:checked"), "::before"); return { bg: s.backgroundColor, border: s.borderTopColor, width: s.borderTopWidth, box: s.boxSizing }; });
    assert.deepEqual([dot.border, dot.width, dot.box, dot.bg === "rgba(0, 0, 0, 0)"], [sys.HighlightText, "3px", "border-box", true]);
    const thumb = await page.evaluate(() => getComputedStyle(document.querySelector("input[name=live]"), "::before").backgroundColor);
    assert.equal(thumb, sys.HighlightText);
    await context.close();
  });
});

describe("the select", () => {
  test("a closed select shows its label alone and tertiary while empty; opened, a two-line row is 58 high and a plain row 40", async () => {
    const { page, context } = await open();
    const select = page.locator("#region");
    assert.equal((await css(select, "color")).color, await token(page, "--basalt-text-tertiary"), "empty: the placeholder's ink");
    assert.equal((await css(page.locator("#plain"), "color")).color, await token(page, "--basalt-text-primary"), "chosen: primary");
    await select.click();
    await pickerSettled(page, "region");
    const rows = await page.evaluate(() => [...document.querySelectorAll("#region option")].filter((o) => !o.hidden).map((o) => [o.value, Math.round(o.getBoundingClientRect().height), o.querySelector(".option-description")?.textContent ?? null]));
    assert.deepEqual(rows, [["eu", 58, "eu-central, lowest latency"], ["us", 40, null], ["ap", 58, "ap-southeast"], ["sa", 40, null]]);
    await page.keyboard.press("Escape");
    await context.close();
  });

  test("typeahead lights the option that starts with what is typed, Enter chooses it, the closed select says the label alone, and Escape closes without choosing", async () => {
    const { page, context } = await open();
    const select = page.locator("#region");
    await select.focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.getElementById("region").matches(":open"));
    await page.keyboard.type("Si");
    const lit = await page.evaluate(() => { const o = document.activeElement; return [o.tagName, o.value, getComputedStyle(o).color]; });
    assert.deepEqual(lit.slice(0, 2), ["OPTION", "ap"]);
    const ink = await page.evaluate(() => [getComputedStyle(document.querySelector("#region option[value=ap]")).color, getComputedStyle(document.querySelector("#region option[value=sa]")).color]);
    assert.notEqual(ink[0], ink[1], "the lit row's ink steps up from the rest row's");
    await page.keyboard.press("Enter");
    assert.equal(await select.inputValue(), "ap");
    assert.equal(await page.locator("#region selectedcontent").innerText(), "Singapore", "the closed select carries the label alone");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#region selectedcontent .option-description")).display), "none");
    await page.waitForTimeout(1100); // a Space inside the typeahead's window would be a letter of it
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.getElementById("region").matches(":open"));
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    assert.equal(await select.inputValue(), "ap", "Escape leaves the value");
    assert.equal(await page.evaluate(() => document.activeElement.id), "region");
    assert.deepEqual((await form(page)).region, "ap");
    await context.close();
  });

  test("a pointer resting on a row lights it and only it; a key lights the keyed row; the chosen row has its check and the others hold the seat", async () => {
    const { page, context } = await open();
    await page.locator("#plain").click();
    await pickerSettled(page, "plain");
    await page.locator("#plain option[value=two]").hover();
    await settled(page);
    const lit = await page.evaluate(() => [...document.querySelectorAll("#plain option")].map((o) => getComputedStyle(o, "::before").backgroundColor !== "rgba(0, 0, 0, 0)"));
    assert.deepEqual(lit, [false, true], "the chosen row's plain focus is not lit under the pointer's");
    const checks = await page.evaluate(() => [...document.querySelectorAll("#plain option")].map((o) => [getComputedStyle(o, "::checkmark").visibility, getComputedStyle(o, "::checkmark").width]));
    assert.deepEqual(checks, [["visible", "16px"], ["hidden", "16px"]]);
    await page.keyboard.press("Escape");
    await context.close();
  });

  test("one row is lit at a time, by whichever of the pointer and the keys moved last", async () => {
    const { page, context } = await open();
    const lit = () => page.evaluate(() => [...document.querySelectorAll("#region option")].filter((o) => !o.hidden && getComputedStyle(o, "::before").backgroundColor !== "rgba(0, 0, 0, 0)").map((o) => o.value));
    await page.locator("#region").click();
    await pickerSettled(page, "region");
    await page.locator("#region option[value=ap]").hover();
    await settled(page);
    assert.deepEqual(await lit(), ["ap"], "the pointer lit its row");
    await page.keyboard.press("ArrowDown");
    await settled(page);
    assert.equal(await page.locator("#region").getAttribute("data-input"), "key");
    assert.equal((await lit()).length, 1, "one row, with the pointer still over the other");
    assert.notDeepEqual(await lit(), ["ap"], "the keys' row, not the resting pointer's");
    await page.locator("#region option[value=us]").hover();
    await page.mouse.move(await page.evaluate(() => document.querySelector("#region option[value=us]").getBoundingClientRect().x + 30), await page.evaluate(() => document.querySelector("#region option[value=us]").getBoundingClientRect().y + 10));
    await settled(page);
    assert.equal(await page.locator("#region").getAttribute("data-input"), "pointer");
    assert.deepEqual(await lit(), ["us"], "the pointer moved last");
    await page.keyboard.press("Escape");
    await context.close();
  });

  test("the list is a popup with the rim, the overlay shadow and the 12 radius, 4 inline and 2 block of padding; it enters over duration-base on ease-out; under reduced motion it only fades", async () => {
    const { page, context } = await open();
    await page.locator("#plain").click();
    await pickerSettled(page, "plain");
    const popup = await page.evaluate(() => { const s = getComputedStyle(document.getElementById("plain"), "::picker(select)"); const ms = (v) => parseFloat(v) * (v.endsWith("ms") ? 1 : 1000); return { o: s.opacity, t: s.transform, r: s.borderTopLeftRadius, p: s.paddingLeft + " " + s.paddingTop, sh: s.boxShadow !== "none", rim: s.borderTopWidth, dur: ms(s.transitionDuration.split(",")[0].trim()), ease: s.transitionTimingFunction.match(/^(cubic-bezier\([^)]*\)|[\w-]+)/)[0], min: s.minWidth }; });
    assert.deepEqual([popup.o, popup.t, popup.r, popup.p, popup.sh, popup.rim], ["1", "none", "12px", "4px 2px", true, "1px"]);
    const base = await page.evaluate(() => { const p = document.createElement("div"); p.style.transitionDuration = "var(--basalt-duration-base)"; p.style.transitionTimingFunction = "var(--basalt-ease-out)"; document.body.append(p); const s = getComputedStyle(p); const ms = (v) => parseFloat(v) * (v.endsWith("ms") ? 1 : 1000); const o = [ms(s.transitionDuration), s.transitionTimingFunction]; p.remove(); return o; });
    assert.deepEqual([popup.dur, popup.ease], base, "duration-base on ease-out");
    assert.equal(popup.min, await page.evaluate(() => getComputedStyle(document.getElementById("plain")).width), "at least as wide as its trigger");
    await page.keyboard.press("Escape");
    await context.close();
    const reduced = await open({ reducedMotion: "reduce" });
    await reduced.page.locator("#plain").click();
    await pickerSettled(reduced.page, "plain");
    // Under reduced motion the closed state's scale is gone: only opacity differs.
    assert.equal(await reduced.page.evaluate(() => getComputedStyle(document.getElementById("plain"), "::picker(select)").transform), "none");
    await reduced.page.keyboard.press("Escape");
    await reduced.context.close();
  });

  test("on touch the trigger is 44 high with 16px text and a row is at least 44", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    assert.deepEqual(await css(page.locator("#plain"), "height", "fontSize"), { height: "44px", fontSize: "16px" });
    assert.equal((await css(page.locator("#plain option").first(), "minHeight")).minHeight, "44px");
    assert.equal((await css(page.locator("#region option[value=eu]"), "minHeight")).minHeight, "58px", "a two-line row is taller than the touch floor");
    await context.close();
  });

  test("forced colours: the placeholder is GrayText and the caret ButtonText", async () => {
    const { page, context } = await open({ forced: true });
    const sys = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); const r = (v) => { p.style.color = v; return getComputedStyle(p).color; }; const o = { GrayText: r("GrayText"), ButtonText: r("ButtonText") }; p.remove(); return o; });
    assert.equal((await css(page.locator("#region"), "color")).color, sys.GrayText);
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("plain"), "::picker-icon").backgroundColor), sys.ButtonText);
    await context.close();
  });
});

describe("the choice card and the pressed toggle", () => {
  for (const theme of THEMES) {
    test(`choosing a card fills it with the selected wash and moves nothing; the arrows move between cards; the ring shows on the keyboard only (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const cards = page.locator(".choice-card");
      const before = [await box(cards.nth(0)), await box(cards.nth(1)), await box(page.locator(".choice-card-title").nth(0)), await box(page.locator(".choice-card-box").nth(1))];
      const fill = (n) => css(cards.nth(n), "backgroundColor").then((s) => s.backgroundColor);
      for (const n of [0, 1, 2]) assert.equal((await css(cards.nth(n).locator("input"), "opacity")).opacity, "0", "the hidden input is never drawn, checked or not");
      const selected = await fill(0);
      const rest = await fill(1);
      assert.notEqual(selected, rest);
      await cards.nth(1).click();
      await page.mouse.move(0, 0);
      await settled(page);
      assert.equal(await page.getByRole("radio", { name: "Yearly" }).isChecked(), true);
      assert.equal(await fill(1), selected, "one solid fill, the same at every card");
      assert.equal(await fill(0), rest);
      assert.equal((await css(cards.nth(1), "outlineStyle")).outlineStyle, "none", "a pointer press shows no ring");
      assert.deepEqual([await box(cards.nth(0)), await box(cards.nth(1)), await box(page.locator(".choice-card-title").nth(0)), await box(page.locator(".choice-card-box").nth(1))], before, "0px");
      await page.keyboard.press("ArrowUp");
      await settled(page);
      assert.equal(await page.getByRole("radio", { name: "Monthly" }).isChecked(), true);
      const ring = await css(cards.nth(0), "outlineStyle", "outlineWidth", "outlineOffset");
      assert.deepEqual(ring, { outlineStyle: "solid", outlineWidth: "2px", outlineOffset: "2px" });
      // Named by its title and described by its words.
      assert.equal(await page.getByRole("radio", { name: "Monthly", description: "Pay as you go." }).count(), 1);
      await context.close();
    });

    test(`a pressed toggle is a plate, a check and primary ink; the button is the same width either way (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const tog = page.locator("#tog");
      const at = async () => ({ w: (await box(tog)).width, h: (await box(tog)).height, bg: (await css(tog, "backgroundColor")).backgroundColor, check: await page.evaluate(() => getComputedStyle(document.querySelector("#tog .btn-check"), "::before").opacity) });
      const rest = await at();
      await tog.click();
      await page.mouse.move(0, 0);
      await settle(page);
      const on = await at();
      assert.equal(await tog.getAttribute("aria-pressed"), "true");
      assert.deepEqual([on.w, on.h], [rest.w, rest.h], "0px");
      assert.deepEqual([rest.check, on.check], ["0", "1"]);
      assert.notEqual(on.bg, rest.bg);
      assert.equal((await css(page.locator("#tog2"), "backgroundColor")).backgroundColor, on.bg, "the ghost, pressed from the start, has the same plate");
      assert.equal((await css(page.locator("#tog2"), "color")).color, await token(page, "--basalt-text-primary"), "pressed ink is primary");
      await context.close();
    });
  }

  test("forced colours: a pressed toggle is Highlight with HighlightText, and a chosen card's box is Highlight", async () => {
    const { page, context } = await open({ forced: true });
    const sys = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); const r = (v) => { p.style.color = v; return getComputedStyle(p).color; }; const o = { Highlight: r("Highlight"), HighlightText: r("HighlightText"), Canvas: r("Canvas") }; p.remove(); return o; });
    const pressed = await css(page.locator("#tog2"), "backgroundColor", "color");
    assert.deepEqual([pressed.backgroundColor, pressed.color], [sys.Highlight, sys.HighlightText]);
    assert.equal((await css(page.locator(".choice-card-box").first(), "backgroundColor")).backgroundColor, sys.Highlight);
    assert.equal((await css(page.locator(".choice-card").first(), "backgroundColor")).backgroundColor, sys.Canvas, "the wash drops");
    await context.close();
  });
});

describe("table selection", () => {
  for (const theme of THEMES) {
    test(`select-all, the mixed header box, the count in words, and the columns unmoved through every state (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      const heads = () => page.locator("#runs th").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.width]; }));
      const cells = () => page.locator("#runs tbody tr:first-child td").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.width, getComputedStyle(el).textAlign]; }));
      const rest = [await heads(), await cells()];
      const all = page.getByRole("checkbox", { name: "Select all runs" });
      const count = page.locator("#count");
      assert.equal(await count.innerText(), "1 of 3 selected");
      assert.deepEqual(await all.evaluate((el) => [el.checked, el.indeterminate]), [false, true], "one of three is mixed");
      assert.deepEqual(await page.locator("#runs tbody tr").evaluateAll((rows) => rows.map((r) => r.getAttribute("aria-selected"))), ["true", "false", "false"]);
      await all.click();
      assert.deepEqual(await all.evaluate((el) => [el.checked, el.indeterminate]), [true, false]);
      assert.equal(await count.innerText(), "3 of 3 selected");
      assert.deepEqual(await page.locator("#runs tbody tr").evaluateAll((rows) => rows.map((r) => r.getAttribute("aria-selected"))), ["true", "true", "true"]);
      assert.deepEqual([await heads(), await cells()], rest, "selecting all moves no header or column: 0px");
      await page.getByRole("checkbox", { name: "Select run-0140" }).click();
      assert.deepEqual(await all.evaluate((el) => [el.checked, el.indeterminate]), [false, true]);
      assert.equal(await count.innerText(), "2 of 3 selected");
      await all.click();
      assert.deepEqual(await all.evaluate((el) => [el.checked, el.indeterminate]), [true, false], "a mixed box chooses all");
      await all.click();
      assert.equal(await count.innerText(), "None selected");
      assert.deepEqual(await page.locator("#runs tbody tr").evaluateAll((rows) => rows.map((r) => r.getAttribute("aria-selected"))), ["false", "false", "false"]);
      assert.deepEqual([await heads(), await cells()], rest, "and none moves nothing either");
      // The wash band: a selected row's fill is the selected wash, an unselected row's is none; the box is the state (a checked box).
      await page.getByRole("checkbox", { name: "Select run-0139" }).click();
      const bands = await page.locator("#runs tbody tr").evaluateAll((rows) => rows.map((r) => getComputedStyle(r).backgroundColor));
      assert.equal(bands[0], "rgba(0, 0, 0, 0)");
      assert.notEqual(bands[2], "rgba(0, 0, 0, 0)");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("Space on the header box and on a row box does it from the keyboard; the boxes are named by their row", async () => {
    const { page, context } = await open();
    await page.getByRole("checkbox", { name: "Select all runs" }).focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#count").innerText(), "3 of 3 selected");
    await page.getByRole("checkbox", { name: "Select run-0141" }).focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#count").innerText(), "2 of 3 selected");
    await context.close();
  });

  test("the column is 32px wide with the 16px box centred, on touch the row is 44, and at 390 the columns still do not move", async () => {
    const { page, context } = await open();
    assert.deepEqual(await page.locator("#runs th.select-col").evaluate((el) => [el.getBoundingClientRect().width, el.querySelector("input").getBoundingClientRect().x - el.getBoundingClientRect().x]), [32, 8]);
    await context.close();
    const narrow = await open({ width: 390, touch: true });
    const widths = () => narrow.page.locator("#runs th").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    const before = await widths();
    await narrow.page.getByRole("checkbox", { name: "Select all runs" }).click();
    assert.deepEqual(await widths(), before, "0px");
    assert.equal((await box(narrow.page.locator("#runs tbody tr").first())).height, 44);
    await narrow.context.close();
  });

  test("forced colours: the wash drops and the checked box is the state", async () => {
    const { page, context } = await open({ forced: true });
    const sys = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); const r = (v) => { p.style.color = v; return getComputedStyle(p).color; }; const o = { Highlight: r("Highlight") }; p.remove(); return o; });
    assert.equal((await css(page.locator("#runs tbody tr").first().locator("input"), "backgroundColor")).backgroundColor, sys.Highlight);
    await context.close();
  });
});

describe("nothing fades in on load", () => {
  /** A page opened with the hold stored, so its controls and the table's header box are set by script on load. */
  async function openStill(scheme) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    await context.addInitScript(() => { try { localStorage.setItem("basalt-loops", "held"); } catch (e) { /* ignore */ } });
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html() }));
    const page = await context.newPage();
    // Count the transitions the page starts in its first frames, on the controls these modules draw.
    await page.addInitScript(() => {
      window.__started = [];
      const poll = () => { for (const a of document.getAnimations()) if (a instanceof CSSTransition) { const t = a.effect?.target; const tag = t?.matches?.("input, .btn, .btn-check, tr, .choice-card") ? (t.id || t.getAttribute("aria-label") || t.className || t.tagName) : null; if (tag && !window.__started.includes(tag)) window.__started.push(tag + ":" + a.transitionProperty); } requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
    });
    await page.goto("https://basalt.test/");
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    return { page, context };
  }
  for (const theme of THEMES) {
    test(`a stored hold, a mixed header box and the count paint at once, with no transition (${theme})`, async () => {
      const { page, context } = await openStill(theme);
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
      assert.equal(await page.locator("#hold").getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator("#holdsw").isChecked(), true);
      assert.deepEqual(await page.locator("#all").evaluate((el) => [el.checked, el.indeterminate]), [false, true]);
      assert.equal(await page.locator("#count").innerText(), "1 of 3 selected");
      assert.deepEqual(await page.evaluate(() => window.__started), [], "no control crossfaded into its state");
      // The rule is only for the first frame: a press afterwards still eases.
      assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-still")), false);
      assert.notEqual((await css(page.locator("#holdsw"), "transitionProperty")).transitionProperty, "none");
      assert.notEqual((await css(page.locator("#hold"), "transitionProperty")).transitionProperty, "none");
      await context.close();
    });
  }
});

describe("the loops hold", () => {
  test("holding stops the ring, a busy button's ring and every braille (a status's and the terminal's), and releasing runs them again in phase", async () => {
    const { page, context, errors } = await open();
    await page.locator("#replay").getByRole("button", { name: "Play" }).click();
    await page.waitForSelector("#replay braille-spinner");
    const running = await loopCount(page);
    assert.ok(running >= 6 * 3 + 2, `ring, busy ring and three braille cells run: ${running}`);
    await page.locator("#hold").click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.equal(await loopCount(page), 0, "every loop is held");
    const still = await page.evaluate(() => ({
      ring: getComputedStyle(document.querySelector(".spinner")).animationName,
      busy: getComputedStyle(document.getElementById("busy"), "::after").animationName,
      dots: [...document.querySelectorAll("braille-spinner .braille-dot[data-dot]")].map((d) => getComputedStyle(d).animationName).join(),
      lit: [...document.querySelectorAll("#replay braille-spinner .braille-dot")].map((d) => getComputedStyle(d).opacity).join(),
      ringTop: getComputedStyle(document.querySelector(".spinner")).borderTopColor === getComputedStyle(document.querySelector(".spinner")).color,
    }));
    assert.equal(still.ring, "none");
    assert.equal(still.busy, "none");
    assert.ok(still.dots.split(",").every((n) => n === "none"));
    assert.equal(still.lit, "1,1,0,1,0,0", "braille holds its first frame, dots 1, 2 and 4 lit");
    assert.equal(still.ringTop, true, "the ring stands at its drawing, at full strength");
    await page.locator("#hold").click();
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-loops")), false);
    assert.equal(await loopCount(page) >= running, true);
    assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => /^bh-/.test(a.animationName ?? "") && a.effect.getComputedTiming().iterations === Infinity).every((a) => a.startTime === 0)), true, "every loop rejoins the shared clock");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("both controls speak their own state, nothing is announced, and a button and a switch stay in step", async () => {
    const { page, context } = await open();
    assert.equal(await page.locator("#hold").getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator("#holdsw").isChecked(), false);
    await page.evaluate(() => { window.__live = []; new MutationObserver((m) => m.forEach((r) => window.__live.push(r.target.id))).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    await page.locator("#holdsw").click();
    assert.equal(await page.locator("#hold").getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.equal(await page.evaluate(() => Boolean(document.getElementById("basalt-live"))), false, "nothing is announced");
    await page.locator("#hold").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#holdsw").isChecked(), false);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-loops")), false);
    // The name stays fixed.
    assert.equal(await page.getByRole("button", { name: "Pause animations" }).count(), 1);
    assert.equal(await page.getByRole("switch", { name: "Pause animations" }).count(), 1);
    await context.close();
  });

  test("the hold is remembered for the origin, applied before the page runs, carried to the origin's other tabs, and the page can read it", async () => {
    const { page, context } = await open();
    const events = await page.evaluate(() => { window.__events = []; document.addEventListener("basalt:loops", (e) => window.__events.push(e.detail.held)); });
    await page.evaluate(() => Basalt.loops.set(true));
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-loops")), "held");
    assert.deepEqual(await page.evaluate(() => [Basalt.loops.held(), window.__events]), [true, [true]]);
    // A second tab of the same origin, opened afterwards, is held at once; and the first tab's release reaches it.
    const other = await context.newPage();
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html() }));
    await other.goto("https://basalt.test/");
    assert.equal(await other.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.equal(await other.locator("#hold").getAttribute("aria-pressed"), "true");
    await page.evaluate(() => Basalt.loops.toggle());
    await other.waitForFunction(() => !document.documentElement.hasAttribute("data-loops"));
    assert.equal(await other.locator("#holdsw").isChecked(), false);
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-loops")), null);
    // The head line applies the stored hold before any script of the page: read the document's own head script.
    await page.evaluate(() => localStorage.setItem("basalt-loops", "held"));
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.ok((await page.content()).split("</head>")[0].includes('localStorage.getItem("basalt-loops")'));
    await context.close();
  });

  test("held outranks reduced motion: the ring stands still at full strength instead of fading, and braille holds its first frame", async () => {
    const { page, context } = await open({ reducedMotion: "reduce" });
    const ring = () => page.evaluate(() => { const s = getComputedStyle(document.querySelector(".spinner")); return [s.animationName, s.borderTopColor === s.color]; });
    assert.equal((await ring())[0], "bh-fade", "reduced motion alone fades the ring");
    await page.locator("#hold").click();
    assert.deepEqual(await ring(), ["none", true]);
    await context.close();
  });

  test("forced colours: held braille is still currentColor and the ring still draws", async () => {
    const { page, context } = await open({ forced: true });
    await page.locator("#hold").click();
    assert.equal(await loopCount(page), 0);
    assert.notEqual((await css(page.locator(".spinner"), "borderTopColor")).borderTopColor, "rgba(0, 0, 0, 0)");
    await context.close();
  });
});

describe("axe", () => {
  for (const theme of THEMES) {
    for (const width of [1440, 390]) {
      test(`axe finds nothing on the forms and selection page (${theme}, ${width})`, async () => {
        const { page, context } = await open({ scheme: theme, width });
        assert.deepEqual(await axeViolations(page), []);
        await context.close();
      });
    }
  }
  test("axe finds nothing in forced colours, with a box mixed and the hold on", async () => {
    const { page, context } = await open({ forced: true });
    await page.locator("#hold").click();
    await page.waitForFunction(() => document.querySelector("#hold").getAttribute("aria-pressed") === "true");
    await settle(page); // axe reads a settled page: the press, the hold and the colours it changes have ended
    assert.deepEqual(await axeViolations(page), []);
    await context.close();
  });
});
