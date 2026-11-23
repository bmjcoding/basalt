// StageBadge (DECISIONS 316, 1.6): the seven faces on Badge's marks, one seat as wide as the widest face (braille included, from a static measure), the
// sequential swap and its frames, one accessible name throughout, reduced motion and the hold. Chromium, built package, real stylesheet.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const STATES = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
const FIXTURE = `
const STATES = ${JSON.stringify(STATES)};
function App() {
  const [state, setState] = React.useState("queued");
  React.useEffect(() => { window.setState = setState; }, []);
  return <div style={{ padding: 24, display: "grid", gap: 12, justifyItems: "start", fontSize: 13, lineHeight: "18px" }}>
    {["outline", "plain"].map((variant) => <div key={variant} style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      {STATES.map((s) => <span key={s} id={variant + "-" + s} style={{ display: "inline-flex" }}><B.StageBadge variant={variant} state={s} words={{ retrying: "Retrying, 2 of 3" }} /><i>|</i></span>)}
    </div>)}
    <span id="live" style={{ display: "inline-flex" }}><B.StageBadge state={state} words={{ retrying: "Retrying, 2 of 3" }} /><i id="after">|</i></span>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async (options = {}) => {
  const { page, errors } = await fixturePage(browser, FIXTURE, { viewport: { width: 800, height: 700 }, theme: "dark", ...options });
  await settle(page);
  page.errors = errors;
  return page;
};

describe("the faces", () => {
  test("each state maps to Badge's mark: pending ring, braille, the success, danger and neutral dots", async () => {
    const page = await open();
    const r = await page.evaluate((states) => states.map((s) => {
      const badge = document.querySelector(`#outline-${s} .basalt-run-badge-face .basalt-badge`);
      return [s, badge.dataset.status ?? null, !!badge.querySelector(".basalt-spinner[data-variant='braille']"), badge.textContent];
    }), STATES);
    assert.deepEqual(r, [
      ["queued", "pending", false, "Queued"], ["running", null, true, "Running"], ["success", "success", false, "Passed"], ["failed", "danger", false, "Failed"],
      ["skipped", "neutral", false, "Skipped"], ["canceled", "neutral", false, "Canceled"], ["retrying", null, true, "Retrying, 2 of 3"],
    ]);
  });

  for (const variant of ["outline", "plain"]) {
    test(`one width for every face, braille included (0px), ${variant}`, async () => {
      const page = await open();
      const widths = await page.evaluate(({ states, variant }) => states.map((s) => document.querySelector(`#${variant}-${s} .basalt-run-badge`).getBoundingClientRect().width), { states: STATES, variant });
      assert.ok(widths.every((w) => w === widths[0]), widths.join(", "));
      if (variant === "outline") {
        const pills = await page.evaluate((states) => states.map((s) => document.querySelector(`#outline-${s} .basalt-run-badge-face .basalt-badge`).getBoundingClientRect().width), STATES);
        assert.ok(pills.every((w) => w === pills[0]), `the pill is one width: ${pills.join(", ")}`);
      }
    });
  }

  test("no animation runs in the hidden measure, and the measure holds no spinner", async () => {
    const page = await open();
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-badge-measure")].map((m) => [m.querySelectorAll(".basalt-spinner").length, m.getAnimations({ subtree: true }).length, m.getAttribute("aria-hidden")]));
    assert.ok(r.every(([spinners, animations, hidden]) => spinners === 0 && animations === 0 && hidden === "true"));
  });
});

describe("the swap", () => {
  const frames = async (page, clock, total, step = 8) => {
    const out = [];
    for (let t = 0; t <= total; t += step) {
      out.push(await page.evaluate(() => [...document.querySelectorAll("#live .basalt-run-badge-face")].map((f) => ({ leaving: f.hasAttribute("data-leaving"), opacity: Number(getComputedStyle(f).opacity), y: new DOMMatrix(getComputedStyle(f).transform).m42, hidden: f.getAttribute("aria-hidden") }))));
      await clock.advance(step);
    }
    return out;
  };

  test("out, then in: the two faces are never both above opacity 0, the new one never falls once it has risen, and nothing beside it moves", async () => {
    const page = await open();
    const after = () => page.evaluate(() => document.querySelector("#after").getBoundingClientRect().left);
    const at = await after();
    const clock = await freezeAnimations(page);
    await page.evaluate(() => window.setState("running"));
    await clock.advance(0);
    const seen = await frames(page, clock, 280);
    let rose = 0;
    for (const frame of seen) {
      const old = frame.find((f) => f.leaving);
      const fresh = frame.find((f) => !f.leaving);
      if (old && fresh) assert.ok(!(old.opacity > 0 && fresh.opacity > 0), `both above 0: ${JSON.stringify(frame)}`);
      if (old) {
        assert.equal(old.hidden, "true", "the leaving face is aria-hidden");
        assert.ok(old.y <= 0, "the old face rises");
      }
      assert.ok(fresh.opacity >= rose - 1e-6, `the new face never falls (${rose} to ${fresh.opacity})`);
      rose = fresh.opacity;
      assert.equal(fresh.hidden, null);
    }
    assert.equal(seen.at(-1).length, 1, "the old face has gone");
    assert.equal(seen.at(-1)[0].opacity, 1);
    assert.equal(await after(), at, "0px");
    await clock.thaw();
  });

  test("one accessible name at every moment: the new word", async () => {
    const page = await open();
    const clock = await freezeAnimations(page);
    await page.evaluate(() => window.setState("failed"));
    await clock.advance(40);
    const snapshot = await page.locator("#live").ariaSnapshot();
    assert.ok(snapshot.includes("Failed") && !snapshot.includes("Queued") && !snapshot.includes("Running"), snapshot);
    await clock.thaw();
  });

  test("reduced motion fades only; the hold swaps at once", async () => {
    const reduced = await open({ reducedMotion: "reduce" });
    const clock = await freezeAnimations(reduced);
    await reduced.evaluate(() => window.setState("success"));
    await clock.advance(0);
    const seen = await frames(reduced, clock, 280);
    assert.ok(seen.flat().every((f) => f.y === 0), "no rise");
    await clock.thaw();
    const held = await open();
    await held.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await held.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await held.evaluate(() => window.setState("success"));
    const faces = await held.evaluate(() => [...document.querySelectorAll("#live .basalt-run-badge-face")].map((f) => [f.textContent, getComputedStyle(f).opacity]));
    assert.deepEqual(faces, [["Passed", "1"]]);
    assert.deepEqual(held.errors, []);
  });
});
