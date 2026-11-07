// Behaviour of the controls and surfaces, driven in Chromium against the built package. Each test
// stands for a reproduction from the system review (main at 28566c1 and PRs 12 and 13).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;

/** The colour the browser resolves a system colour keyword to, under the page's current emulation. */
const systemColors = (page) => page.evaluate(() => {
  const probe = document.createElement("div");
  document.body.append(probe);
  const read = (value) => { probe.style.backgroundColor = value; return getComputedStyle(probe).backgroundColor; };
  const colors = { Highlight: read("Highlight"), Canvas: read("Canvas") };
  probe.style.color = "ButtonText"; colors.ButtonText = getComputedStyle(probe).color;
  probe.style.color = "HighlightText"; colors.HighlightText = getComputedStyle(probe).color;
  probe.remove();
  return colors;
});

describe("forced colours", () => {
  test("choice marks and the selected row keep their structure in system colours", async () => {
    const { page } = await fixturePage(browser, render(`<>
      <B.Checkbox defaultChecked>On</B.Checkbox><B.Checkbox indeterminate>Mixed</B.Checkbox><B.Checkbox>Off</B.Checkbox>
      <B.RadioGroup aria-label="Radios" defaultValue="a"><B.Radio value="a">Selected</B.Radio><B.Radio value="b">Other</B.Radio></B.RadioGroup>
      <B.Switch defaultChecked>Switch on</B.Switch><B.Switch>Switch off</B.Switch>
      <B.TableContainer><B.Table><B.TableBody><B.TableRow selected><B.TableCell>Selected row</B.TableCell></B.TableRow><B.TableRow><B.TableCell>Other row</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
    </>`));
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const c = await systemColors(page);
    const style = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
    const checkbox = (name) => page.locator(".basalt-choice", { hasText: name }).locator(".basalt-checkbox");
    const radio = (name) => page.locator(".basalt-choice", { hasText: name }).locator(".basalt-radio");
    const sw = (name) => page.locator(".basalt-choice", { hasText: name }).locator(".basalt-switch");

    for (const name of ["On", "Mixed"]) {
      const box = await style(checkbox(name), "backgroundColor", "borderTopColor", "borderTopWidth");
      assert.equal(box.backgroundColor, c.Highlight, `${name} checkbox fill`);
      assert.equal(box.borderTopWidth, "1px");
      const mark = await style(checkbox(name).locator(".basalt-checkbox-indicator"), "color", "forcedColorAdjust");
      assert.equal(mark.color, c.HighlightText, `${name} checkbox mark`);
      assert.equal(mark.forcedColorAdjust, "none");
    }
    const off = await style(checkbox("Off"), "backgroundColor", "borderTopColor", "borderTopWidth");
    assert.deepEqual([off.backgroundColor, off.borderTopColor, off.borderTopWidth], [c.Canvas, c.ButtonText, "1px"]);

    assert.equal((await style(radio("Selected"), "backgroundColor")).backgroundColor, c.Highlight);
    const dot = await style(radio("Selected").locator(".basalt-radio-indicator"), "backgroundColor", "forcedColorAdjust");
    assert.deepEqual([dot.backgroundColor, dot.forcedColorAdjust], [c.HighlightText, "none"]);
    assert.deepEqual(await style(radio("Other"), "backgroundColor", "borderTopColor"), { backgroundColor: c.Canvas, borderTopColor: c.ButtonText });

    assert.equal((await style(sw("Switch on"), "backgroundColor")).backgroundColor, c.Highlight);
    assert.equal((await style(sw("Switch on").locator(".basalt-switch-thumb"), "backgroundColor")).backgroundColor, c.HighlightText);
    const offTrack = await style(sw("Switch off"), "backgroundColor", "borderTopColor");
    assert.deepEqual(offTrack, { backgroundColor: c.Canvas, borderTopColor: c.ButtonText });
    assert.equal((await style(sw("Switch off").locator(".basalt-switch-thumb"), "backgroundColor")).backgroundColor, c.ButtonText, "an off thumb is visible on its track");

    const bar = await style(page.locator("tr[data-selected] td"), "borderInlineStartWidth", "borderInlineStartColor", "borderInlineStartStyle");
    assert.deepEqual(bar, { borderInlineStartWidth: "2px", borderInlineStartColor: c.Highlight, borderInlineStartStyle: "solid" });
    assert.equal((await style(page.locator("tr:not([data-selected]) td"), "borderInlineStartWidth")).borderInlineStartWidth, "0px");
    await page.close();
  });
});

describe("a disabled Fieldset", () => {
  test("disables the checkbox, switch and radios inside it, however they are labelled", async () => {
    const { page } = await fixturePage(browser, render(`<>
      <B.Fieldset legend="Locked" disabled>
        <B.Checkbox>Check</B.Checkbox><B.Switch>Switch</B.Switch><B.Checkbox aria-label="Bare checkbox" />
        <B.RadioGroup aria-label="Radios" defaultValue="a"><B.Radio value="a">First</B.Radio><B.Radio value="b">Second</B.Radio></B.RadioGroup>
        <B.Fieldset legend="Nested"><B.Switch>Nested switch</B.Switch></B.Fieldset>
      </B.Fieldset>
      <B.Fieldset legend="Open"><B.Checkbox>Open check</B.Checkbox><B.Switch>Open switch</B.Switch></B.Fieldset>
    </>`));
    for (const [role, name] of [["checkbox", "Check"], ["switch", "Switch"], ["checkbox", "Bare checkbox"], ["radio", "Second"], ["switch", "Nested switch"]]) {
      const control = page.getByRole(role, { name, exact: true });
      await control.focus();
      await page.keyboard.press("Space");
      assert.equal(await control.getAttribute("aria-disabled"), "true", `${name} is announced as disabled`);
      assert.equal(await control.getAttribute("aria-checked"), "false", `${name} did not toggle`);
    }
    assert.equal(await page.getByRole("radio", { name: "First" }).getAttribute("aria-checked"), "true", "the group's value is untouched");
    for (const [role, name] of [["checkbox", "Open check"], ["switch", "Open switch"]]) {
      const control = page.getByRole(role, { name, exact: true });
      await control.focus();
      await page.keyboard.press("Space");
      assert.equal(await control.getAttribute("aria-checked"), "true", `${name} still works outside the disabled group`);
    }
    await page.close();
  });
});

describe("table density", () => {
  test("a row density does not reset the size of the controls inside the table", async () => {
    const { page } = await fixturePage(browser, render(`<>
      <B.Button>Outside</B.Button>
      <B.TableContainer><B.Table><B.TableBody><B.TableRow><B.TableCell><B.Button>Inside</B.Button></B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
      <B.TableContainer density="compact"><B.Table><B.TableBody><B.TableRow><B.TableCell>Compact row</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
    </>`));
    await page.evaluate(() => { document.documentElement.dataset.density = "compact"; });
    const heights = await page.locator(".basalt-button").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    assert.deepEqual(heights, [28, 28], "a button in a default table follows the app's compact density");
    assert.equal(await page.locator(".basalt-table-container").first().getAttribute("data-density"), null, "the table claims no control density");
    assert.equal(await page.locator(".basalt-table-container").first().getAttribute("data-row-density"), "default");
    assert.equal(await page.locator("td", { hasText: "Compact row" }).evaluate((e) => e.getBoundingClientRect().height), 32);
    await page.close();
  });

  test("every row is at least 44px on a touch device, whatever the density", async () => {
    const { page } = await fixturePage(browser, render(`<>${["compact", "default", "comfortable"].map((d) => `<B.TableContainer density="${d}"><B.Table><B.TableBody><B.TableRow><B.TableCell>${d}</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>`).join("")}</>`), { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
    const heights = await page.locator("td").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    assert.deepEqual(heights, [44, 44, 44]);
    await page.close();
  });
});

describe("a right-to-left page", () => {
  test("keeps the checked switch thumb inside its track", async () => {
    const { page } = await fixturePage(browser, render(`<><div dir="rtl"><B.Switch defaultChecked>RTL on</B.Switch><B.Switch>RTL off</B.Switch></div><B.Switch defaultChecked>LTR on</B.Switch></>`));
    await settle(page);
    const fits = await page.locator(".basalt-switch").evaluateAll((els) => els.map((el) => {
      const track = el.getBoundingClientRect();
      const thumb = el.querySelector(".basalt-switch-thumb").getBoundingClientRect();
      return thumb.x >= track.x - 0.01 && thumb.right <= track.right + 0.01;
    }));
    assert.deepEqual(fits, [true, true, true]);
    // and it sits at the inline end: the left edge in RTL, the right edge in LTR
    const [rtl, ltr] = await Promise.all([0, 2].map((i) => page.locator(".basalt-switch").nth(i).evaluate((el) => {
      const track = el.getBoundingClientRect();
      const thumb = el.querySelector(".basalt-switch-thumb").getBoundingClientRect();
      return { left: thumb.x - track.x, right: track.right - thumb.right };
    })));
    assert.ok(rtl.left < rtl.right, "RTL: the thumb is at the left");
    assert.ok(ltr.right < ltr.left, "LTR: the thumb is at the right");
    await page.close();
  });
});

describe("motion in CSS", () => {
  test("indeterminate progress moves by transform and lays nothing out", async () => {
    const { page } = await fixturePage(browser, render(`<B.Progress label="Working" value={null} />`));
    const keyframes = await page.locator(".basalt-progress-indicator").evaluate((el) => el.getAnimations().flatMap((a) => a.effect.getKeyframes().map((k) => Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p)))));
    assert.ok(keyframes.length >= 2);
    for (const properties of keyframes) assert.deepEqual(properties, ["transform"]);
    const session = await page.context().newCDPSession(page);
    await session.send("Performance.enable");
    const layouts = async () => (await session.send("Performance.getMetrics")).metrics.find((m) => m.name === "LayoutCount").value;
    const before = await layouts();
    await page.waitForTimeout(700);
    assert.ok((await layouts()) - before <= 1, "the animation triggers layout");
    await page.close();
  });

  test("exits run at 0.75 of their entry and ease in: tooltip, toast, accordion", async () => {
    const { page } = await fixturePage(browser, render(`null`));
    await page.setContent(`<style>${await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).map((r) => r.cssText).join("\n"))}</style><div class="basalt-tooltip" id="tip">T</div><div class="basalt-toast" id="toast">T</div><div class="basalt-accordion-panel" id="panel">P</div>`);
    const times = (s) => s.split(",").map((v) => Math.round(parseFloat(v) * 1000 * 10000) / 10000);
    const read = (id) => page.locator("#" + id).evaluate((el) => { const s = getComputedStyle(el); return { d: s.transitionDuration, e: s.transitionTimingFunction }; });
    const entry = { tip: await read("tip"), toast: await read("toast"), panel: await read("panel") };
    await page.evaluate(() => document.querySelectorAll("#tip, #toast, #panel").forEach((el) => el.setAttribute("data-ending-style", "")));
    const exit = { tip: await read("tip"), toast: await read("toast"), panel: await read("panel") };
    for (const name of ["tip", "toast", "panel"]) {
      const from = times(entry[name].d);
      const to = times(exit[name].d);
      assert.equal(to.length, from.length, name);
      to.forEach((ms, i) => assert.ok(Math.abs(ms - from[i] * 0.75) < 0.01, `${name}: ${ms}ms is not 0.75 of ${from[i]}ms`));
      assert.notEqual(exit[name].e, entry[name].e, `${name} leaves on its own curve`);
    }
    const tokens = await page.evaluate(() => ({ easeIn: getComputedStyle(document.documentElement).getPropertyValue("--basalt-ease-in").trim() }));
    assert.equal(exit.toast.e.replace(/\s/g, "").split("),")[0].replace(/\)$/, ""), tokens.easeIn.replace(/\s/g, "").replace(/\)$/, ""));
    assert.equal(exit.panel.e.replace(/\s/g, ""), tokens.easeIn.replace(/\s/g, ""));
    await page.close();
  });

  test("reduced motion: the toast stack sits at its final offsets and only fades; progress jumps", async () => {
    const { page } = await fixturePage(browser, render(`<B.ToastProvider><Fixture /></B.ToastProvider>`).replace("createRoot", `function Fixture(){const t=B.useToast();const[v,sv]=React.useState(20);return <><B.Button onClick={()=>t.show({title:"Toast "+Date.now(),timeout:0})}>Toast</B.Button><B.Button onClick={()=>sv(80)}>Change progress</B.Button><B.Progress label="Progress" value={v}/></>}\ncreateRoot`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Toast", exact: true }).click();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: "Toast", exact: true }).click();
    await page.waitForTimeout(150);
    await page.locator(".basalt-toast").first().hover();
    await page.waitForTimeout(150);
    const toasts = await page.locator(".basalt-toast").evaluateAll((els) => els.map((el) => ({
      property: getComputedStyle(el).transitionProperty,
      running: el.getAnimations().map((a) => a.transitionProperty),
    })));
    assert.equal(toasts.length, 2);
    for (const toast of toasts) {
      assert.equal(toast.property, "opacity", "only opacity may transition");
      assert.ok(!toast.running.some((p) => ["transform", "height", "top", "bottom", "width"].includes(p)), `animating ${toast.running}`);
    }
    await page.getByRole("button", { name: "Change progress" }).click();
    const progress = await page.locator(".basalt-progress-indicator").evaluate((el) => ({ transition: getComputedStyle(el).transitionProperty, animations: el.getAnimations().map((a) => a.transitionProperty), width: el.style.width }));
    assert.deepEqual(progress.animations, []);
    assert.equal(progress.transition, "none");
    await page.close();
  });
});

describe("Tabs", () => {
  test("slide direction follows committed value changes, including controlled ones", async () => {
    const { page } = await fixturePage(browser, `
      const tabs = (value) => <B.Tabs value={value}><B.TabsList><B.Tab value="a">A</B.Tab><B.Tab value="b">B</B.Tab><B.Tab value="c">C</B.Tab></B.TabsList><B.TabsPanel value="a">AA</B.TabsPanel><B.TabsPanel value="b">BB</B.TabsPanel><B.TabsPanel value="c">CC</B.TabsPanel></B.Tabs>;
      const root = createRoot(document.getElementById("root"));
      window.show = (value) => flushSync(() => root.render(tabs(value)));
      window.show("a");`);
    const direction = () => page.locator(".basalt-tabs-root").getAttribute("data-direction");
    assert.equal(await direction(), null);
    await page.evaluate(() => window.show("c"));
    assert.equal(await direction(), "forward");
    await page.evaluate(() => window.show("b"));
    assert.equal(await direction(), "back");
    await page.evaluate(() => window.show("c"));
    assert.equal(await direction(), "forward");
    await page.close();
  });

  test("an uncontrolled click still sets the direction", async () => {
    const { page } = await fixturePage(browser, render(`<B.Tabs defaultValue="a"><B.TabsList><B.Tab value="a">A</B.Tab><B.Tab value="b">B</B.Tab></B.TabsList><B.TabsPanel value="a">AA</B.TabsPanel><B.TabsPanel value="b">BB</B.TabsPanel></B.Tabs>`));
    await page.getByRole("tab", { name: "B" }).click();
    assert.equal(await page.locator(".basalt-tabs-root").getAttribute("data-direction"), "forward");
    await page.getByRole("tab", { name: "A" }).click();
    assert.equal(await page.locator(".basalt-tabs-root").getAttribute("data-direction"), "back");
    await page.close();
  });
});

describe("Button", () => {
  test("a loading button does not submit a form or follow a link", async () => {
    const { page } = await fixturePage(browser, render(`<form onSubmit={(e) => { e.preventDefault(); window.submits = (window.submits ?? 0) + 1; }}>
      <B.Button loading type="submit" onClick={() => { window.clicks = (window.clicks ?? 0) + 1; }}>Save</B.Button>
      <B.Button loading nativeButton={false} render={<a href="#activated" />}>Link</B.Button>
      <B.Button type="submit">Ready</B.Button>
    </form>`));
    const save = page.getByRole("button", { name: "Save" });
    await save.click({ force: true });
    await save.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await page.getByText("Link", { exact: true }).click({ force: true });
    assert.deepEqual(await page.evaluate(() => ({ submits: window.submits ?? 0, clicks: window.clicks ?? 0, hash: location.hash })), { submits: 0, clicks: 0, hash: "" });
    await page.getByRole("button", { name: "Ready" }).click();
    assert.equal(await page.evaluate(() => window.submits), 1, "a button that is not loading still submits");
    await page.close();
  });
});

describe("Stepper", () => {
  test("the chevrons sit on the same line as Back and Next", async () => {
    const { page } = await fixturePage(browser, render(`<B.Stepper steps={[{id:"a",label:"One"},{id:"b",label:"Two"},{id:"c",label:"Three"}]} value="b" onValueChange={() => {}} />`));
    await page.locator(".basalt-text-morph[data-font='ready']").first().waitFor();
    const buttons = await page.locator(".basalt-stepper .basalt-button").evaluateAll((els) => els.map((el) => {
      const box = el.getBoundingClientRect();
      const svg = el.querySelector("svg").getBoundingClientRect();
      const label = el.querySelector(".basalt-button-label").getBoundingClientRect();
      // the words: the morphing text where there is one, else the label's own text node
      const words = el.querySelector(".basalt-text-morph");
      const range = document.createRange();
      const node = [...el.querySelector(".basalt-button-label").childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
      if (node) range.selectNodeContents(node);
      const text = (words ?? range).getBoundingClientRect();
      return { height: box.height, svgMid: svg.y + svg.height / 2 - box.y, textMid: text.y + text.height / 2 - box.y, labelHeight: label.height, svgInside: svg.y >= box.y && svg.bottom <= box.bottom, gap: svg.x >= text.right ? svg.x - text.right : text.x - svg.right };
    }));
    for (const b of buttons) {
      assert.equal(b.height, 32);
      assert.ok(b.svgInside, "the icon is inside the button");
      assert.ok(Math.abs(b.svgMid - b.textMid) <= 1.5, `icon centre ${b.svgMid} against text centre ${b.textMid}`);
      assert.ok(b.labelHeight <= 32);
      assert.ok(Math.abs(b.gap - 6) <= 1, `icon and label are ${b.gap}px apart`);
    }
    await page.close();
  });
});

describe("CommandMenu", () => {
  const fixture = `function App(){const[c,sc]=React.useState(false);return <B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Parent</B.DialogTitle><B.AlertDialog defaultOpen><B.AlertDialogContent><B.AlertDialogTitle>Nested</B.AlertDialogTitle><B.AlertDialogCancel>Cancel</B.AlertDialogCancel><B.Button onClick={()=>sc(true)}>Commands</B.Button><B.CommandMenu hints open={c} onOpenChange={sc} groups={[{label:'Commands',commands:Array.from({length:12},(_,i)=>({id:''+i,label:'Command '+i,shortcut:i===1?'⌘D':undefined,onSelect:()=>{}}))}]}/></B.AlertDialogContent></B.AlertDialog></B.DialogContent></B.Dialog>};
    createRoot(document.getElementById("root")).render(<App/>);`;

  test("inside nested dialogs it sits above its parent and takes the click", async () => {
    const { page } = await fixturePage(browser, fixture);
    await page.getByRole("button", { name: "Commands", exact: true }).click();
    await page.getByRole("dialog", { name: "Command menu", exact: true }).waitFor();
    await page.getByRole("combobox").waitFor();
    await settle(page);
    const layers = await page.locator(".basalt-dialog").evaluateAll((els) => els.map((e) => ({ name: e.getAttribute("aria-label") ?? e.querySelector("h2")?.textContent, z: Number(getComputedStyle(e).zIndex) })));
    const z = Object.fromEntries(layers.map((l) => [l.name, l.z]));
    assert.ok(z["Command menu"] > z.Nested && z.Nested > z.Parent, JSON.stringify(z));
    const covered = await page.locator(".basalt-command").evaluate((e) => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
    assert.equal(covered, true, "nothing sits on top of the command menu");
    assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-command-input");
    await page.close();
  });

  test("rows sit in the list's padding like menu rows, with no sideways scroll", async () => {
    const { page } = await fixturePage(browser, fixture);
    await page.getByRole("button", { name: "Commands", exact: true }).click();
    await page.getByRole("combobox").waitFor();
    await settle(page);
    const m = await page.locator(".basalt-command-list").evaluate((list) => {
      const box = list.getBoundingClientRect();
      const row = list.querySelector("[cmdk-item]");
      const r = row.getBoundingClientRect();
      const styles = getComputedStyle(row);
      return { scroll: list.scrollWidth - list.clientWidth, left: r.x - box.x, right: box.right - r.right, radius: styles.borderTopLeftRadius, padding: getComputedStyle(list).paddingLeft };
    });
    assert.equal(m.scroll, 0, "the list scrolls sideways");
    assert.ok(Math.abs(m.left - 6) < 0.5, `left inset ${m.left}`);
    assert.ok(Math.abs(m.left - parseFloat(m.padding)) < 0.5, `left inset ${m.left} against padding ${m.padding}`);
    assert.ok(Math.abs(m.right - parseFloat(m.padding)) < 0.5, `right inset ${m.right} against padding ${m.padding}`);
    assert.equal(m.radius, "6px");
    await page.close();
  });
});

describe("CodeBlock", () => {
  test("the copy button swaps Phosphor Copy for Check, at once, and says Copied", async () => {
    const { page } = await fixturePage(browser, render(`<B.CodeBlock code="basalt deploy" language="bash" title="terminal" />`));
    await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { window.copied = text; } } }); });
    const button = page.getByRole("button", { name: "Copy code" });
    assert.equal(await page.locator(".basalt-code-copy .basalt-morph").count(), 0, "no hand-drawn icon");
    const copyShape = await button.locator("svg").innerHTML();
    assert.match(await button.locator("svg").getAttribute("class"), /basalt-icon/);
    assert.equal(await button.locator("svg").getAttribute("width"), "16");
    await button.click();
    const copied = page.getByRole("button", { name: "Copied" });
    await copied.waitFor();
    assert.notEqual(await copied.locator("svg").innerHTML(), copyShape, "the icon changed");
    assert.equal(await page.locator(".basalt-code-copy [role=status]").textContent(), "Copied");
    assert.equal(await page.evaluate(() => window.copied), "basalt deploy");
    await page.close();
  });
});
