import assert from "node:assert/strict";
import { pixels, settle } from "./support.mjs";

// DECISIONS 156: verify the painted control ring and its geometry through real F6/Tab, in either build.
export async function assertToastRegionFocus(page, { toast, viewport, show, close }) {
  const region = page.locator(viewport);
  const item = (title) => page.locator(toast).filter({ hasText: title });
  let background;
  const read = (el) => el.evaluate((node) => {
    const r = node.getBoundingClientRect(), s = getComputedStyle(node);
    return { box: [r.x, r.y, r.width, r.height], width: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset, color: s.outlineColor };
  });
  const ring = async (title) => {
    const actual = await read(item(title));
    assert.deepEqual([actual.width, actual.style, actual.offset], ["2px", "solid", "2px"], "the front toast carries the control ring at +2");
    const expectedColor = await page.evaluate(() => {
      const el = document.createElement("i");
      el.style.cssText = "outline:var(--basalt-size-focus-width) solid var(--basalt-border-focus);outline-offset:var(--basalt-size-focus-offset)";
      if (matchMedia("(forced-colors: active)").matches) el.style.outlineColor = "Highlight";
      document.body.append(el); const color = getComputedStyle(el).outlineColor; el.remove(); return color;
    });
    assert.equal(actual.color, expectedColor, "the control token also maps correctly in forced colours");
    const rgb = await page.evaluate(({ color, background }) => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = `rgb(${background.join(",")})`; c.fillRect(0, 0, 1, 1); c.fillStyle = color; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); }, { color: actual.color, background });
    const [x, y, w, h] = actual.box;
    const painted = (await pixels(page, { x: Math.round(x - 3), y: Math.round(y + h / 2), width: 1, height: 1 }))[0];
    assert.ok(painted.every((v, i) => Math.abs(v - rgb[i]) <= 1), `the ring is painted 3px outside the toast, between its +2 and +4 edges: ${painted} versus ${rgb}`);
    return { ...actual, inner: [x - 2, y - 2, w + 4, h + 4], outer: [x - 4, y - 4, w + 8, h + 8] };
  };
  const regionFocus = async () => {
    await settle(page);
    assert.equal(await region.evaluate((el) => el === document.activeElement), true, "F6 focuses the region itself");
    const s = await read(region);
    assert.equal(s.style, "none", "the region's own zero-height box paints no outline");
  };
  await show("First toast"); await show("Front toast"); await settle(page);
  await page.locator("#origin").focus();
  const box = await item("Front toast").boundingBox();
  background = (await pixels(page, { x: Math.round(box.x - 3), y: Math.round(box.y + box.height / 2), width: 1, height: 1 }))[0];
  await page.keyboard.press("F6");
  await regionFocus();
  const before = await ring("Front toast");
  await page.keyboard.press("Tab"); await settle(page);
  assert.equal(await item("Front toast").evaluate((el) => el === document.activeElement), true);
  assert.deepEqual(await ring("Front toast"), before, "Tab moves the ring and the toast 0px");
  await page.keyboard.press("F6"); await regionFocus();
  await show("Newest toast"); await regionFocus();
  await ring("Newest toast");
  assert.equal((await read(item("Front toast"))).style, "none", "the former front has no ring");
  await close("Newest toast"); await item("Newest toast").waitFor({ state: "detached" });
  await settle(page);
  // Base UI hands focus to the surviving toast on close; the skill retains region focus. Both own the same ring.
  if (await region.evaluate((el) => el === document.activeElement)) await regionFocus();
  else assert.equal(await item("Front toast").evaluate((el) => el === document.activeElement), true, "removing the front toast keeps focus in the stack");
  await ring("Front toast");
  assert.equal((await read(item("First toast"))).style, "none", "only the front toast carries the region's ring");
}
