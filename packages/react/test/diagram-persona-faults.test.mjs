// Two diagram faults from CIMIP's persona review (main 43c486ef), in its document reader's shape: a form `DialogContent` with `SheetHeader` and `SheetBody`.
// 1. An Esc that clears a trace closed the whole Dialog: Base UI dismisses on Esc from a React handler on its popup and a listener on the document, and reads
//    neither preventDefault, so the figure's Esc went on to it. Now the figure stops the key when it consumed it: the first Esc clears the trace and focus stays
//    in the figure; the next, with nothing traced, closes the Dialog. In the viewer Esc still closes the viewer, traced or not (foundations, "Esc always closes").
// 2. A drawn sequence's messages read "1Ask to roll back", with no space after the number and no route ("Agent to Room · A request"): drawn, the route's row is
//    display: none (the lines are the route). Now the words are written beside it, unseen (`-spoken`), so the drawn figure reads the stacked one's words, and
//    nothing it draws changes.
// In Chromium against the built package. Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

const P = "basalt-diagram";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// A schema small enough to be drawn in a wide form Dialog (two tables of size-diagram-table, 224 + 48 + 224, under the dialog's content box).
const SCHEMA = {
  type: "schema", title: "Two tables", summary: "Runs reference incidents.", legend: { plain: "A foreign key" },
  tables: [
    { name: "incidents", col: 1, row: 1, columns: [{ name: "id", key: "PK", type: "uuid" }, { name: "title", type: "text" }] },
    { name: "runs", col: 2, row: 1, columns: [{ name: "id", key: "PK", type: "uuid" }, { name: "incident_id", key: "FK", type: "uuid", references: "incidents.id" }] },
  ],
};

// The host: `window.__show(kind, where, extra)` draws one figure on the page, or in a closed form Dialog (wide, so a figure can be drawn) or a Sheet opened by
// `#trigger`. `extra` is merged into the figure's props.
const HOST = `
import data from "./test/fixtures/cimip-diagrams.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, dataFlow: B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
const SCHEMA = ${JSON.stringify(SCHEMA)};
function Host() {
  const [st, setSt] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  window.__show = (k, where, extra) => flushSync(() => { setSt({ k, where, extra }); setOpen(false); });
  if (!st) return null;
  const { type, ...FIG } = st.k === "schema" ? SCHEMA : data[st.k];
  const D = C[st.k];
  const fig = <D id="fig" {...FIG} {...(st.extra || {})} />;
  if (st.where === "page") return fig;
  if (st.where === "sheet") return (
    <B.Sheet open={open} onOpenChange={setOpen}>
      <B.SheetTrigger id="trigger">Open</B.SheetTrigger>
      <B.SheetContent side="right" id="parent"><B.SheetHeader closeLabel="Close"><B.SheetTitle>Document</B.SheetTitle></B.SheetHeader><B.SheetBody>{fig}</B.SheetBody></B.SheetContent>
    </B.Sheet>
  );
  return (
    <B.Dialog open={open} onOpenChange={setOpen}>
      <B.DialogTrigger id="trigger">Open</B.DialogTrigger>
      <B.DialogContent form size="wide" id="parent"><B.SheetHeader closeLabel="Close"><B.DialogTitle>Document</B.DialogTitle></B.SheetHeader><B.SheetBody>{fig}</B.SheetBody></B.DialogContent>
    </B.Dialog>
  );
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

async function host(kind, where, { extra, theme = "dark", width = 1440 } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 900 } });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([k, w, e]) => window.__show(k, w, e), [kind, where, extra]);
  if (where !== "page") {
    await page.locator("#trigger").click();
    await page.waitForSelector("#parent[data-open]");
    await settled(page);
  }
  await page.waitForSelector("#fig[data-layout]");
  await frames(page, 4);
  return { page, errors };
}

const state = (page) => page.evaluate(() => ({
  open: Boolean(document.querySelector("#parent[data-open]")),
  tracing: Boolean(document.querySelector("#fig")?.hasAttribute("data-tracing")),
  inFigure: Boolean(document.activeElement?.closest("#fig")),
}));

/** Focuses the figure's stop and moves it with an arrow key, so the keyboard's focus traces a node. */
async function traceByKeys(page, root = "#fig") {
  await page.locator(`${root} .${P}-node[tabindex="0"]`).first().focus();
  await page.keyboard.press("ArrowRight");
  await frames(page, 2);
}

describe("Esc on a traced figure in a modal (fault 1)", () => {
  const cases = [
    ["dialog", "architecture"], ["dialog", "flowchart"], ["dialog", "dataFlow"], ["dialog", "sequence"], ["dialog", "schema"],
    ["sheet", "architecture"], ["sheet", "flowchart"], ["sheet", "dataFlow"],
  ];
  for (const [where, kind] of cases) {
    test(`${kind} in a ${where === "dialog" ? "form Dialog" : "Sheet"}: the first Esc clears the trace and the modal stays open with focus in the figure; the next closes it`, async () => {
      const { page, errors } = await host(kind, where);
      await traceByKeys(page);
      assert.deepEqual(await state(page), { open: true, tracing: true, inFigure: true }, "the keys trace a node");

      await page.keyboard.press("Escape");
      await frames(page, 2);
      await settled(page);
      assert.deepEqual(await state(page), { open: true, tracing: false, inFigure: true }, "the first Esc is the figure's: the trace clears and the modal stays");

      await page.keyboard.press("Escape");
      await page.waitForSelector("#parent", { state: "detached" });
      assert.equal(await page.evaluate(() => document.activeElement?.id), "trigger", "the second Esc closes the modal and focus returns to its trigger");
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("on the page the first Esc still clears the trace, and nothing else hears it there either", async () => {
    const { page, errors } = await host("architecture", "page");
    await page.evaluate(() => { window.__heard = 0; document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.__heard += 1; }); });
    await traceByKeys(page);
    await page.keyboard.press("Escape");
    await frames(page, 2);
    assert.deepEqual(await state(page), { open: false, tracing: false, inFigure: true });
    assert.equal(await page.evaluate(() => window.__heard), 0, "a consumed Esc goes no further");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.__heard), 1, "an Esc with nothing traced travels as it always has");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("in the viewer, opened from a form Dialog, Esc closes the viewer even with a trace up (Esc always closes), and the Dialog stays", async () => {
    const { page, errors } = await host("architecture", "dialog");
    await page.locator(`#fig .${P}-expand`).click();
    await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
    await settled(page);
    await traceByKeys(page, `dialog.${P}-viewer`);
    assert.equal(await page.evaluate((P) => document.querySelector(`dialog.${P}-viewer .${P}`).hasAttribute("data-tracing"), P), true, "the keys trace in the viewer");
    await page.keyboard.press("Escape");
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.equal((await state(page)).open, true, "the Dialog stays open");
    assert.equal(await page.evaluate((P) => document.activeElement?.matches(`#fig .${P}-expand`), P), true, "focus is back on Expand");
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("a drawn sequence's accessible words (fault 2)", () => {
  /** Each message's words as the accessibility tree has them (Playwright's aria snapshot), in order. */
  const messages = async (page) => (await page.locator("#fig").ariaSnapshot())
    .split("\n").map((l) => l.trim()).filter((l) => /^- listitem: \d/.test(l)).map((l) => l.replace(/^- listitem: /, ""));

  test("drawn, on the page and in a form Dialog, each message reads as it does stacked: its number, a space, its words, then its sender, its receiver and its kind", async () => {
    const stacked = await host("sequence", "page", { extra: { style: { width: 480 } } });
    assert.equal(await stacked.page.evaluate(() => document.querySelector("#fig").dataset.layout), "stacked");
    const want = await messages(stacked.page);
    assert.ok(want.length > 3, "the stacked figure reads its messages");
    assert.match(want[0], /^1 \S.* to .* · /, "stacked, the number is apart and the route is read");
    await stacked.page.close();

    for (const where of ["page", "dialog"]) {
      const { page, errors } = await host("sequence", where);
      assert.equal(await page.evaluate(() => document.querySelector("#fig").dataset.layout), "drawn", `drawn ${where === "page" ? "on the page" : "in the Dialog"}`);
      assert.deepEqual(await messages(page), want, `drawn ${where === "page" ? "on the page" : "in the Dialog"}, the words are the stacked figure's`);
      assert.deepEqual(errors, []);
      await page.close();
    }
  });

  for (const theme of ["dark", "light"]) for (const width of [1104, 480]) {
    test(`the unseen words draw nothing: ${theme}, ${width === 1104 ? "drawn" : "stacked"}, the figure is the same pixels without them`, async () => {
      const { page } = await host("sequence", "page", { theme, extra: { style: { width } } });
      assert.equal(await page.evaluate(() => document.querySelector("#fig").dataset.layout), width === 1104 ? "drawn" : "stacked");
      const withWords = await page.locator("#fig").screenshot();
      await page.addStyleTag({ content: `.${P}-spoken { display: none !important; }` });
      await frames(page, 2);
      assert.ok(withWords.equals(await page.locator("#fig").screenshot()), "identical");
      await page.close();
    });
  }
});
