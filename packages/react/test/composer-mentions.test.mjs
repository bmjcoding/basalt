// The composer, the mention and the mention picker, and the public plate (cimip-gaps-2, batch B3: decided and built by Opus on the no-council path,
// DECISIONS 226 and 265; the code review is Astra's and the pixels the lead's). A message field with no visible label, Send last in the row under it,
// a status line that keeps its height, Enter or Mod+Enter that press Send (so the button's own wait guards a key and a press alike), and a field
// that grows to its cap and then scrolls. A mention is the trigger and the name at 500 in primary ink, and one that calls on the reader sits on the
// plate. The picker is a popup of Combobox's rows with focus left in the field (`aria-activedescendant`), in groups, with two-line rows. The plate
// (--basalt-plate, tokens plate-0 to plate-3) paints exactly what the private recipe painted. Driven in Chromium against the built package with the
// real stylesheet. Synthetic names only, from two unlike domains (a support inbox and a build pipeline).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The page's own fill and ink, as an app's body has them, so axe reads the parts on the page they are drawn on.
const PAGE = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; document.body.style.fontFamily = "var(--basalt-font-family-sans)";\n`;
const open = async (body, { theme = "dark", width = 1024, height = 800, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, PAGE + body, { theme, viewport: { width, height }, ...options });
  page.errors = errors;
  return page;
};
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run(document, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000, polling: "raf" }).catch(async (error) => {
  const seen = await page.evaluate(() => ({ value: document.querySelector("textarea")?.value, caret: document.querySelector("textarea")?.selectionStart, list: Boolean(document.querySelector('[role="listbox"]')), focused: document.activeElement?.tagName })).catch(() => null);
  throw new Error(`${error.message}; the page: ${JSON.stringify(seen)}`);
});

// ---- The plate ----

const PLATES = `
createRoot(document.getElementById("root")).render(<>
  <i id="p0" style={{ background: "var(--basalt-plate)" }}>page</i>
  <div data-level="1"><i id="p1" style={{ background: "var(--basalt-plate)" }}>1</i>
    <div data-level="2"><i id="p2" style={{ background: "var(--basalt-plate)" }}>2</i>
      <div data-level="3"><i id="p3" style={{ background: "var(--basalt-plate)" }}>3</i></div></div></div>
  <div data-theme="light" id="nested-light"><i id="nl" style={{ background: "var(--basalt-plate)" }}>light in dark</i></div>
  <div data-theme="dark" id="nested-dark"><i id="nd" style={{ background: "var(--basalt-plate)" }}>dark in light</i></div>
</>);`;

describe("the public plate", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: --basalt-plate is the old recipe's pixel on the page and at levels 1 to 3, one opaque colour, and a nested theme root gets its own theme's`, async () => {
      const page = await open(PLATES, { theme });
      const got = await page.evaluate((dark) => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const px = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#f0f"; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].join(","); };
        // The recipe the stylesheet held privately before the plate was public (--_plate-solid), evaluated on a probe at the same place.
        const recipe = (el, light, darkMix) => {
          const probe = document.createElement("i");
          probe.style.background = dark ? darkMix : light;
          el.parentElement.append(probe);
          const value = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return px(value);
        };
        const mix = (top, pct, under) => `color-mix(in srgb, var(--basalt-${top}) ${pct}%, var(--basalt-${under}))`;
        const at = (id) => document.getElementById(id);
        const plate = (id) => px(getComputedStyle(at(id)).backgroundColor);
        const rows = [
          ["p0", mix("neutral-0", 7, "surface-page"), mix("neutral-100", 9, "surface-1")],
          ["p1", mix("neutral-0", 7, "surface-1"), mix("neutral-100", 9, "surface-2")],
          ["p2", mix("neutral-0", 7, "surface-2"), mix("neutral-100", 9, "surface-3")],
          ["p3", mix("neutral-0", 7, "surface-3"), mix("neutral-100", 9, "surface-3")],
        ];
        return {
          rows: rows.map(([id, light, darkMix]) => ({ id, plate: plate(id), recipe: recipe(at(id), light, darkMix), raw: getComputedStyle(at(id)).backgroundColor })),
          nestedLight: plate("nl"),
          nestedDark: plate("nd"),
        };
      }, theme === "dark");
      for (const row of got.rows) {
        assert.equal(row.plate, row.recipe, `${theme}: ${row.id} paints ${row.plate}, the recipe ${row.recipe}`);
        assert.ok(!/\/|rgba/.test(row.raw), `${theme}: ${row.id} is opaque (${row.raw})`);
      }
      // A nested theme root starts at its own theme's page plate.
      const near = (got, want, what) => got.split(",").slice(0, 3).forEach((c, i) => assert.ok(Math.abs(Number(c) - want[i]) <= 1, `${what}: ${got}`));
      near(got.nestedLight, [232, 232, 232], "a light root inside the page has light's page plate, about #e8e8e8");
      near(got.nestedDark, [32, 32, 32], "a dark root inside the page has dark's page plate, about #202020");
      assert.deepEqual(page.errors, []);
      await page.close();
    });
  }
});

// ---- The mention ----

const MENTIONS = `
createRoot(document.getElementById("root")).render(<div style={{ width: 360, padding: 16 }}>
  <p id="support" style={{ margin: 0 }}>Thanks <B.Mention id="m-ana">Ana Ruiz</B.Mention>, the refund for order 4471 went out.</p>
  <B.Card id="card"><p id="build" style={{ margin: 0 }}>The nightly build failed on arm64; <B.Mention id="m-you" you>Lee Park</B.Mention>, can you look at the linker step that ran out of memory?</p></B.Card>
  <p style={{ margin: 0 }}>Routed to <B.Mention id="m-hash" trigger="#">billing</B.Mention>.</p>
</div>);`;

describe("Mention", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: the trigger and the name at 500 in primary ink, no colour of its own; you sits on its level's plate, wrapping with its text, keeping the space before it whole`, async () => {
      const page = await open(MENTIONS, { theme });
      const got = await page.evaluate(() => {
        const s = (id) => getComputedStyle(document.getElementById(id));
        const probe = document.createElement("i"); probe.style.color = "var(--basalt-text-primary)"; document.body.append(probe);
        const primary = getComputedStyle(probe).color; probe.remove();
        const plateProbe = document.createElement("i"); plateProbe.style.background = "var(--basalt-plate)"; document.getElementById("card").append(plateProbe);
        const cardPlate = getComputedStyle(plateProbe).backgroundColor; plateProbe.remove();
        const you = document.getElementById("m-you");
        return {
          text: document.getElementById("m-ana").textContent, hash: document.getElementById("m-hash").textContent,
          weight: s("m-ana").fontWeight, color: s("m-ana").color, primary, bg: s("m-ana").backgroundColor,
          youBg: s("m-you").backgroundColor, cardPlate, youRadius: s("m-you").borderTopLeftRadius, youLines: you.getClientRects().length,
          youMargin: s("m-you").marginInlineStart, youPad: s("m-you").paddingInlineStart, decoration: s("m-you").boxDecorationBreak || s("m-you").webkitBoxDecorationBreak,
        };
      });
      assert.equal(got.text, "@Ana Ruiz");
      assert.equal(got.hash, "#billing");
      assert.equal(got.weight, "500");
      assert.equal(got.color, got.primary);
      assert.equal(got.bg, "rgba(0, 0, 0, 0)", "a mention has no fill of its own");
      assert.equal(got.youBg, got.cardPlate, "you sits on the plate of the card's level");
      assert.equal(got.youRadius, "4px");
      assert.equal(got.youPad, "2px");
      assert.equal(got.youMargin, "0px", "the padding is its own: the space before it stays a whole space");
      assert.equal(got.decoration, "clone", "the plate is drawn on every line it wraps to");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("forced colours: you is Mark with MarkText; a plain mention keeps its weight", async () => {
    const page = await open(MENTIONS, { theme: "dark", forcedColors: "active" });
    const got = await page.evaluate(() => {
      const probe = document.createElement("i"); probe.style.background = "Mark"; probe.style.color = "MarkText"; document.body.append(probe);
      const mark = [getComputedStyle(probe).backgroundColor, getComputedStyle(probe).color]; probe.remove();
      const you = getComputedStyle(document.getElementById("m-you"));
      return { mark, you: [you.backgroundColor, you.color], weight: getComputedStyle(document.getElementById("m-ana")).fontWeight };
    });
    assert.deepEqual(got.you, got.mark);
    assert.equal(got.weight, "500");
    await page.close();
  });
});

// ---- The composer ----

// window.sends records each send; window.answer(n) settles the nth pending send (true: it was sent; false: it was refused).
const COMPOSER = (props = "", extra = "") => `
window.sends = []; window.pending = [];
window.answer = (i, ok = true) => { const p = window.pending[i]; ok ? p.resolve() : p.reject(new Error("refused")); };
window.addEventListener("unhandledrejection", (e) => { e.preventDefault(); window.rejected = String(e.reason); });
function App() {
  const [typing, setTyping] = React.useState([]);
  window.setTyping = setTyping;
  return (
    <div style={{ width: 560, padding: 16 }}>
      <B.Composer id="c" label="Reply to the customer" placeholder="Reply to the customer" status={B.typingStatus(typing)}
        actions={<B.Button variant="ghost" size="sm" id="attach">Attach</B.Button>}
        onSend={(text) => { window.sends.push(text); ${extra} }} ${props} />
      <p id="after">Below the composer</p>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const WAITS = `return new Promise((resolve, reject) => window.pending.push({ resolve, reject }));`;
const field = "#c textarea";
const box = (page, selector) => page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });

describe("Composer", () => {
  test("no visible label, the name is the label; Send is primary and last; the status line is one text-xs line tall empty or not, so nothing moves", async () => {
    const page = await open(COMPOSER());
    const got = await page.evaluate(() => {
      const ta = document.querySelector("#c textarea");
      const buttons = [...document.querySelectorAll("#c .basalt-composer-actions button")].map((b) => b.textContent);
      const send = document.querySelector("#c .basalt-composer-send");
      return { name: ta.getAttribute("aria-label"), labels: ta.labels?.length ?? 0, label: document.querySelector("#c label"), buttons, variant: send.dataset.variant, keys: send.getAttribute("aria-keyshortcuts"), hint: ta.enterKeyHint, live: document.querySelector("#c .basalt-composer-status").getAttribute("aria-live") };
    });
    assert.equal(got.name, "Reply to the customer");
    assert.equal(got.labels, 0);
    assert.equal(got.label, null, "no visible label");
    assert.deepEqual(got.buttons, ["Attach", "Send"], "the app's action first, Send last");
    assert.equal(got.variant, "primary");
    assert.equal(got.keys, "Enter");
    assert.equal(got.hint, "send");
    assert.equal(got.live, "polite");
    const empty = await box(page, "#c .basalt-composer-status");
    const below = await box(page, "#after");
    assert.equal(empty.h, 16, "one text-xs line, reserved while empty");
    await page.evaluate(() => window.setTyping(["Ana Ruiz", "Ben Okafor"]));
    await until(page, () => document.querySelector("#c .basalt-composer-status").textContent === "Ana Ruiz and Ben Okafor are typing");
    assert.equal((await box(page, "#c .basalt-composer-status")).h, 16);
    assert.equal((await box(page, "#after")).y, below.y, "nothing under it moved when someone started typing");
    // Send's end edge is the row's end.
    const row = await box(page, "#c .basalt-composer-actions");
    const send = await box(page, "#c .basalt-composer-send");
    assert.ok(Math.abs(send.x + send.w - (row.x + row.w)) < 0.5);
    assert.deepEqual(await axe(page), []);
    await page.close();
  });

  test("typingStatus says who, in US English, and counts past three", async () => {
    const page = await open(`createRoot(document.getElementById("root")).render(<p id="t">{[[], ["Ana"], ["Ana", "Ben"], ["Ana", "Ben", "Cy"], ["Ana", "Ben", "Cy", "Dee"]].map((n) => B.typingStatus(n)).join("|")}</p>);`);
    assert.equal(await page.locator("#t").textContent(), "|Ana is typing|Ana and Ben are typing|Ana, Ben, and Cy are typing|4 people are typing");
    await page.close();
  });

  test("Enter sends the trimmed text and clears the field, Shift+Enter is a new line, an empty field sends nothing, and focus stays in the field", async () => {
    const page = await open(COMPOSER());
    await page.locator(field).click();
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => window.sends), [], "nothing to send");
    await page.keyboard.type("  The refund went out today.");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("It takes three to five days.  ");
    assert.equal(await page.locator(field).inputValue(), "  The refund went out today.\nIt takes three to five days.  ");
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => window.sends), ["The refund went out today.\nIt takes three to five days."]);
    assert.equal(await page.locator(field).inputValue(), "");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("#c textarea")), true);
    // A press on Send with the pointer keeps focus in the field.
    await page.keyboard.type("Second reply");
    await page.locator("#c .basalt-composer-send").click();
    assert.deepEqual(await page.evaluate(() => window.sends.length), 2);
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("#c textarea")), true);
    await page.close();
  });

  test("sendKey Mod+Enter: Enter is a new line and the platform's modifier with Enter sends; the chips stand beside Send", async () => {
    const page = await open(COMPOSER(`sendKey="Mod+Enter"`));
    const apple = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform));
    await page.locator(field).click();
    await page.keyboard.type("Rerun the arm64 job");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(field).inputValue(), "Rerun the arm64 job\n");
    await page.keyboard.press(apple ? "Control+Enter" : "Meta+Enter");
    assert.deepEqual(await page.evaluate(() => window.sends), [], "the other modifier does not send");
    await page.keyboard.press(apple ? "Meta+Enter" : "Control+Enter");
    assert.deepEqual(await page.evaluate(() => window.sends), ["Rerun the arm64 job"]);
    const got = await page.evaluate(() => ({ keys: document.querySelector("#c .basalt-composer-send").getAttribute("aria-keyshortcuts"), chips: document.querySelector("#c .basalt-action-shortcut [data-kbd-hint]")?.textContent, hint: document.querySelector("#c textarea").enterKeyHint }));
    assert.equal(got.keys, apple ? "Meta+Enter" : "Control+Enter");
    assert.ok(got.chips, "the shortcut's chips are drawn beside Send");
    assert.equal(got.hint, "", "Enter is a new line, so the soft keyboard's key says so");
    await page.close();
  });

  test("a send that waits: a second Enter and a press send nothing until it settles; success clears, a refusal keeps the words, and words typed meanwhile stay", async () => {
    const page = await open(COMPOSER("", WAITS));
    await page.locator(field).click();
    await page.keyboard.type("Ship the fix to staging");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    // A press while it is out (the button is aria-disabled then, so the press is a script's).
    await page.locator("#c .basalt-composer-send").evaluate((el) => el.click());
    assert.equal(await page.evaluate(() => window.sends.length), 1, "one send while it is out");
    assert.equal(await page.locator("#c .basalt-composer-send").getAttribute("aria-busy"), "true");
    assert.equal(await page.locator(field).inputValue(), "Ship the fix to staging", "the words stay until the answer");
    await page.evaluate(() => window.answer(0));
    await until(page, () => document.querySelector("#c textarea").value === "");
    // Refused: the words stay, and the rejection is passed on as a button's is.
    await page.keyboard.type("Ship it to production");
    await page.keyboard.press("Enter");
    await page.evaluate(() => window.answer(1, false));
    await until(page, () => window.rejected);
    assert.equal(await page.locator(field).inputValue(), "Ship it to production");
    await until(page, () => document.querySelector("#c .basalt-composer-send").getAttribute("aria-busy") !== "true");
    // Words typed while a send is out are the person's: they stay when it lands.
    await page.keyboard.press("Enter");
    await page.keyboard.type(" now");
    await page.evaluate(() => window.answer(2));
    await page.waitForTimeout(50);
    assert.equal(await page.locator(field).inputValue(), "Ship it to production now");
    await page.close();
  });

  test("the field grows a line at a time from rows to maxRows, then scrolls; it has no resize handle", async () => {
    const page = await open(COMPOSER(`rows={2} maxRows={4}`));
    const h = () => page.locator(field).evaluate((el) => ({ h: el.getBoundingClientRect().height, scroll: el.scrollHeight > el.clientHeight + 1, resize: getComputedStyle(el).resize }));
    const two = await h();
    assert.equal(two.h, 56, "two 20px lines and 16 of padding");
    assert.equal(two.resize, "none");
    await page.locator(field).click();
    await page.keyboard.type("one");
    for (const line of ["two", "three"]) { await page.keyboard.press("Shift+Enter"); await page.keyboard.type(line); }
    assert.equal((await h()).h, 76, "three lines");
    for (const line of ["four", "five", "six"]) { await page.keyboard.press("Shift+Enter"); await page.keyboard.type(line); }
    const capped = await h();
    assert.equal(capped.h, 96, "four lines, the cap");
    assert.equal(capped.scroll, true, "past the cap it scrolls");
    await page.close();
  });

  test("disabled: the field and Send are disabled", async () => {
    const page = await open(COMPOSER(`disabled defaultValue="A draft"`));
    assert.equal(await page.locator(field).isDisabled(), true);
    assert.equal(await page.locator("#c .basalt-composer-send").getAttribute("data-disabled"), "");
    await page.close();
  });
});

// ---- The mention picker ----

const PEOPLE = `[
  { label: "Ana Ruiz", value: "u1", description: "Support lead · Online", group: "People" },
  { label: "Anders Holm", value: "u2", description: "Billing", group: "People" },
  { label: "Ben Okafor", value: "u3", description: "Away until Monday", group: "People" },
  { label: "android-release", value: "t1", description: "6 people", group: "Teams" },
  { label: "analytics", value: "t2", description: "Reaches nobody yet", group: "Teams", disabled: true },
  { label: "on-call", value: "r1", description: "Whoever is on call this week", group: "Roles" },
]`;
const PICKER = ({ top = 40, wrap = (c) => c, props = "" } = {}) => `
window.picks = [];
const OPTIONS = ${PEOPLE};
function App() {
  const [text, setText] = React.useState("");
  const [query, setQuery] = React.useState(null);
  window.query = query;
  return ${wrap(`<div style={{ position: "absolute", top: ${top}, left: 24, width: 520 }}>
      <B.Composer id="c" label="Message the team" value={text} onValueChange={setText} onSend={(t) => { window.sends = [...(window.sends ?? []), t]; }}
        mentions={(field) => <B.MentionPicker field={field} options={OPTIONS} onQueryChange={setQuery} onPick={(o, d) => window.picks.push([o.value, d.start, d.end, d.text])} label="Mention someone" ${props} />} />
    </div>`)};
}
createRoot(document.getElementById("root")).render(<App />);`;
const listbox = '[role="listbox"]';
const state = (page) => page.evaluate(() => {
  const ta = document.querySelector("#c textarea");
  const list = document.querySelector('[role="listbox"]');
  const active = ta.getAttribute("aria-activedescendant");
  return {
    open: Boolean(list) && !list.closest("[data-ending-style]"),
    value: ta.value, caret: ta.selectionStart, focused: document.activeElement === ta,
    controls: ta.getAttribute("aria-controls"), listId: list?.id ?? null, active, activeText: active ? document.getElementById(active)?.querySelector(".basalt-menu-item-label")?.textContent : null,
    autocomplete: ta.getAttribute("aria-autocomplete"), popup: ta.getAttribute("aria-haspopup"),
    rows: list ? [...list.querySelectorAll('[role="option"]')].map((o) => o.querySelector(".basalt-menu-item-label").textContent) : [],
    groups: list ? [...list.querySelectorAll('[role="group"]')].map((g) => document.getElementById(g.getAttribute("aria-labelledby")).textContent) : [],
  };
});

describe("MentionPicker", () => {
  test("@ opens the matching names in groups, focus stays in the field, and the field points at the active row; the rows are Combobox's two-line rows", async () => {
    const page = await open(PICKER());
    await page.locator(field).click();
    let s = await state(page);
    assert.equal(s.autocomplete, "list");
    assert.equal(s.popup, "listbox");
    assert.equal(s.open, false);
    await page.keyboard.type("Thanks @an");
    await until(page, () => document.querySelector('[role="listbox"]'));
    s = await state(page);
    assert.equal(s.focused, true);
    assert.deepEqual(s.rows, ["Ana Ruiz", "Anders Holm", "android-release", "analytics"]);
    assert.deepEqual(s.groups, ["People", "Teams"]);
    assert.equal(s.controls, s.listId);
    assert.equal(s.activeText, "Ana Ruiz");
    assert.equal(await page.evaluate(() => window.query), "an");
    const row = await page.evaluate(() => {
      const option = document.querySelector('[role="option"]');
      // Its layout height: the popup may still be easing in from .98.
      return { h: option.offsetHeight, selected: option.getAttribute("aria-selected"), cls: option.className, level: document.querySelector(".basalt-mention-picker").dataset.level };
    });
    assert.equal(row.h, 58, "a two-line popup row: 58, its plate 54");
    assert.equal(row.selected, "true");
    assert.match(row.cls, /basalt-menu-item/);
    assert.equal(row.level, "1", "a popup opened from the page is level 1");
    for (const theme of ["dark", "light"]) {
      await page.evaluate(async (t) => {
        document.documentElement.dataset.theme = t;
        // The rows' ink eases to the new theme: read it once it has.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})));
      }, theme);
      assert.deepEqual(await axe(page), [], `${theme}: axe with the picker open`);
    }
    await page.close();
  });

  test("↓ and ↑ move the plate and pass over a disabled row; Enter writes the name and a space and does not send; the app hears the pick", async () => {
    const page = await open(PICKER());
    await page.locator(field).click();
    await page.keyboard.type("Ask @an");
    await until(page, () => document.querySelector('[role="listbox"]'));
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    assert.equal((await state(page)).activeText, "android-release");
    await page.keyboard.press("ArrowDown");
    assert.equal((await state(page)).activeText, "Ana Ruiz", "analytics is passed over, and the list wraps");
    await page.keyboard.press("ArrowUp");
    assert.equal((await state(page)).activeText, "android-release");
    await page.keyboard.press("Enter");
    const s = await state(page);
    assert.equal(s.value, "Ask @android-release ");
    assert.equal(s.caret, s.value.length);
    assert.equal(s.open, false);
    assert.equal(s.controls, null);
    assert.equal(s.active, null);
    assert.equal(await page.evaluate(() => window.sends), undefined, "the Enter was the picker's");
    assert.deepEqual(await page.evaluate(() => window.picks), [["t1", 4, 20, "Ask @android-release "]]);
    // Undo takes the pick back, as the browser's own edit.
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
    assert.equal((await state(page)).value, "Ask @an");
    await page.close();
  });

  test("Tab picks too; a press on a row picks it and keeps focus in the field; a name before a space keeps that space", async () => {
    const page = await open(PICKER());
    await page.locator(field).click();
    await page.keyboard.type("@be");
    await until(page, () => document.querySelector('[role="listbox"]'));
    await page.keyboard.press("Tab");
    assert.equal((await state(page)).value, "@Ben Okafor ");
    await page.keyboard.type("and @");
    await until(page, () => document.querySelector('[role="listbox"]'));
    assert.deepEqual((await state(page)).groups, ["People", "Teams", "Roles"], "a bare trigger offers every group");
    await page.locator('[role="option"]', { hasText: "on-call" }).click();
    let s = await state(page);
    assert.equal(s.value, "@Ben Okafor and @on-call ");
    assert.equal(s.focused, true);
    // A name typed in front of words already there keeps their space.
    await page.evaluate(() => { const ta = document.querySelector("#c textarea"); ta.setSelectionRange(0, 0); });
    await page.keyboard.type("@an ");
    await page.keyboard.press("ArrowLeft");
    await until(page, () => document.querySelector('[role="listbox"]') && !document.querySelector("[data-ending-style]"));
    await page.keyboard.press("Enter");
    s = await state(page);
    assert.equal(s.value, "@Ana Ruiz @Ben Okafor and @on-call ");
    assert.equal(s.caret, "@Ana Ruiz ".length);
    await page.close();
  });

  test("a name can hold a space while something matches, and a sentence closes it; a trigger inside a word opens nothing; nothing matching opens nothing", async () => {
    const page = await open(PICKER());
    await page.locator(field).click();
    await page.keyboard.type("@ana r");
    await until(page, () => document.querySelector('[role="listbox"]'));
    // "r" starts Ruiz, and "Reaches" in analytics' description.
    assert.deepEqual((await state(page)).rows, ["Ana Ruiz", "analytics"]);
    await page.keyboard.type("eplied");
    await until(page, () => !document.querySelector('[role="listbox"]'));
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => window.sends), ["@ana replied"], "closed, Enter sends");
    await page.keyboard.type("mail ops@an");
    await page.waitForTimeout(100);
    assert.equal((await state(page)).open, false, "an @ inside a word (an address) is not a mention");
    await page.keyboard.type(" @zz");
    await page.waitForTimeout(100);
    assert.equal((await state(page)).open, false);
    assert.equal(await page.evaluate(() => window.query), "zz", "the app still hears the query, to look it up");
    await page.close();
  });

  test("Esc closes it until another trigger is typed, and a dialog round the field stays open", async () => {
    const page = await open(PICKER({ wrap: (c) => `<B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Reply</B.DialogTitle>${c}</B.DialogContent></B.Dialog>` }));
    await page.locator(field).click();
    await page.keyboard.type("@an");
    await until(page, () => document.querySelector('[role="listbox"]'));
    assert.equal(await page.locator(".basalt-mention-picker").getAttribute("data-level"), "2", "a popup from a dialog is level 2");
    await page.keyboard.press("Escape");
    await until(page, () => !document.querySelector('[role="listbox"]'));
    assert.equal(await page.locator(".basalt-dialog").count(), 1, "the dialog is still open");
    await page.keyboard.type("d");
    await page.waitForTimeout(100);
    assert.equal((await state(page)).open, false, "the same mention stays closed");
    await page.keyboard.type(" @ok");
    await until(page, () => document.querySelector('[role="listbox"]'));
    assert.deepEqual((await state(page)).rows, ["Ben Okafor"]);
    await page.close();
  });

  test("it sits under the trigger's line when there is room, above it near the window's foot, and inside the window at 390", async () => {
    for (const [top, width, want] of [[40, 1024, "bottom"], [700, 1024, "top"], [40, 390, "bottom"]]) {
      const page = await open(PICKER({ top }), { width, height: 800 });
      await page.locator(field).click();
      await page.keyboard.type("Thanks for the report, @");
      await until(page, () => document.querySelector('[role="listbox"]') && document.querySelector(".basalt-mention-positioner")?.dataset.side);
      const got = await page.evaluate(() => {
        const pop = document.querySelector(".basalt-mention-picker").getBoundingClientRect();
        const ta = document.querySelector("#c textarea").getBoundingClientRect();
        return { side: document.querySelector(".basalt-mention-positioner").dataset.side, top: pop.top, bottom: pop.bottom, left: pop.left, right: pop.right, taTop: ta.top, taBottom: ta.bottom, vw: innerWidth, vh: innerHeight };
      });
      assert.equal(got.side, want, `top ${top} at ${width}`);
      assert.ok(got.left >= 8 && got.right <= got.vw - 8 + 0.5, `inside the window: ${got.left} to ${got.right} of ${got.vw}`);
      assert.ok(got.top >= 8 - 0.5 && got.bottom <= got.vh - 8 + 0.5, `inside the window: ${got.top} to ${got.bottom}`);
      if (want === "bottom") assert.ok(got.top > got.taTop + 20, "under the trigger's line");
      else assert.ok(got.bottom <= got.taTop + 16 + 0.5, "above the trigger's line");
      await page.close();
    }
  });
});

// ---- Fix pass 1 (Astra's review): a stale query, an input method's Enter, a field that cannot be written, the phone's keyboard, the typing
// line's one line, the caller's ARIA, and the picker loaded only when asked for ----

// A plain controlled textarea with the picker, so an Enter sends nothing and the field's value is the test's to read. window.setDraft sets the
// value as an app would (React state, no input event); window.flags sets readOnly and disabled.
const OWN_FIELD = (pre = "") => `
${pre}
window.picks = [];
const OPTIONS = ${PEOPLE};
function App() {
  const [text, setText] = React.useState("");
  const [flags, setFlags] = React.useState({ readOnly: false, disabled: false });
  const [picker, setPicker] = React.useState(true);
  window.setDraft = setText; window.flags = setFlags; window.setPicker = setPicker;
  const ref = React.useRef(null);
  return (
    <div style={{ position: "absolute", top: 200, left: 24, width: 520 }}>
      <textarea id="own" ref={ref} rows={2} aria-label="Notes" aria-controls="help-1" aria-describedby="help-1" value={text} readOnly={flags.readOnly} disabled={flags.disabled} onChange={(e) => setText(e.target.value)} style={{ width: 480, font: "16px/24px sans-serif" }} />
      <p id="help-1">Type @ to name someone.</p>
      {picker ? <B.MentionPicker field={ref} options={OPTIONS} onPick={(o) => window.picks.push(o.value)} /> : null}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const own = "#own";
const opened = (page) => until(page, () => document.querySelector('[role="listbox"]') && !document.querySelector(".basalt-mention-picker[data-ending-style]"));

describe("fix pass 1", () => {
  test("a value the app sets while the picker is open closes it: Enter and a press on an old row write nothing, by React state or by the DOM", async () => {
    const page = await open(OWN_FIELD());
    await page.locator(own).click();
    await page.keyboard.type("@a");
    await opened(page);
    // A controlled update: React state, no input event. The picker closes as it is drawn; a press on a row of the closing popup writes nothing,
    // and the next Enter is the field's own (a new line), not a pick.
    await page.evaluate(() => window.setDraft("draft"));
    await until(page, () => document.getElementById("own").value === "draft");
    await page.locator('[role="option"]').first().dispatchEvent("click").catch(() => {});
    assert.equal(await page.locator(own).inputValue(), "draft", "the field stays the app's draft");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(own).inputValue(), "draft\n", "the Enter was the field's");
    assert.deepEqual(await page.evaluate(() => window.picks), []);
    // The DOM's value set straight, with nothing drawn and before any event says so: an Enter and a press at once. The picker still shows its
    // rows, reads the field live, and writes nothing; the Enter it was shown for is still its own, so it does not reach the field either.
    await page.evaluate(() => window.setDraft(""));
    await until(page, () => document.getElementById("own").value === "");
    await page.locator(own).click();
    await page.keyboard.type("@a");
    await opened(page);
    const consumed = await page.evaluate(() => {
      const ta = document.getElementById("own");
      ta.value = "draft";
      ta.setSelectionRange(5, 5);
      const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
      ta.dispatchEvent(enter);
      document.querySelector('[role="option"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return enter.defaultPrevented;
    });
    assert.equal(consumed, true);
    assert.equal(await page.locator(own).inputValue(), "draft");
    assert.deepEqual(await page.evaluate(() => window.picks), []);
    await until(page, () => !document.querySelector('[role="listbox"]'));
    await page.close();
  });

  test("an input method's Enter (key code 229) picks nothing, writes nothing and sends nothing", async () => {
    const page = await open(PICKER());
    await page.locator(field).click();
    await page.keyboard.type("@an");
    await opened(page);
    const before = await state(page);
    const ime = await page.evaluate(() => {
      const ta = document.querySelector("#c textarea");
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
      Object.defineProperty(event, "keyCode", { get: () => 229 });
      ta.dispatchEvent(event);
      return event.defaultPrevented;
    });
    const after = await state(page);
    assert.equal(ime, false, "the key is left to the input method");
    assert.equal(after.value, before.value);
    assert.equal(after.open, true);
    assert.deepEqual(await page.evaluate(() => [window.picks, window.sends]), [[], undefined]);
    await page.close();
  });

  test("a read-only or disabled field: the picker does not open there, and a field made read-only while it is open is not written", async () => {
    const page = await open(OWN_FIELD());
    await page.evaluate(() => window.flags({ readOnly: true, disabled: false }));
    await page.evaluate(() => { const ta = document.getElementById("own"); ta.focus(); ta.value = "@a"; ta.setSelectionRange(2, 2); ta.dispatchEvent(new Event("input", { bubbles: true })); ta.dispatchEvent(new KeyboardEvent("keyup", { key: "a" })); });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('[role="listbox"]').count(), 0, "read-only: closed");
    await page.evaluate(() => { window.flags({ readOnly: false, disabled: false }); window.setDraft(""); });
    await page.locator(own).click();
    await page.keyboard.type("@a");
    await opened(page);
    // Made read-only while open: Enter and a press write nothing.
    await page.evaluate(() => { document.getElementById("own").readOnly = true; });
    await page.keyboard.press("Enter");
    await page.locator('[role="option"]').first().dispatchEvent("click").catch(() => {});
    assert.equal(await page.locator(own).inputValue(), "@a");
    assert.deepEqual(await page.evaluate(() => window.picks), []);
    // Disabled: the same.
    await page.evaluate(() => { const ta = document.getElementById("own"); ta.readOnly = false; ta.focus(); ta.dispatchEvent(new KeyboardEvent("keyup", { key: "a" })); });
    await opened(page);
    await page.evaluate(() => { document.getElementById("own").disabled = true; });
    await page.locator('[role="option"]').first().dispatchEvent("click").catch(() => {});
    assert.equal(await page.locator(own).inputValue(), "@a");
    assert.deepEqual(await page.evaluate(() => window.picks), []);
    await page.close();
  });

  test("the phone's keyboard: with a visual viewport shorter than the window, the picker opens above the caret, inside what can be seen", async () => {
    // A stand-in for a keyboard that covers the window's lower part (WebKit keeps innerHeight whole): the visual viewport is 300 tall.
    const STUB = `{ const vv = new EventTarget(); Object.assign(vv, { offsetTop: 0, offsetLeft: 0, height: 300, width: innerWidth, scale: 1, pageTop: 0, pageLeft: 0 }); Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv }); window.vv = vv; }`;
    const page = await open(OWN_FIELD(STUB), { width: 390, height: 800 });
    await page.locator(own).click();
    await page.keyboard.type("@");
    await opened(page);
    await until(page, () => document.querySelector(".basalt-mention-positioner")?.dataset.side).catch((e) => { throw new Error(`${e.message}; errors: ${page.errors.join(" | ")}`); });
    const got = await page.evaluate(() => {
      const pop = document.querySelector(".basalt-mention-picker").getBoundingClientRect();
      const ta = document.getElementById("own").getBoundingClientRect();
      return { side: document.querySelector(".basalt-mention-positioner").dataset.side, top: pop.top, bottom: pop.bottom, taTop: ta.top };
    });
    assert.equal(got.side, "top", "the room below the visible edge is short, so it opens above");
    assert.ok(got.bottom <= got.taTop + 16, `above the caret's line: ${got.bottom} against ${got.taTop}`);
    assert.ok(got.top >= 8 - 0.5, `inside what can be seen: ${got.top}`);
    // The keyboard goes: the viewport grows back, and the picker follows it (resize), below the line again.
    await page.evaluate(() => { window.vv.height = 800; window.vv.dispatchEvent(new Event("resize")); });
    await until(page, () => document.querySelector(".basalt-mention-positioner").dataset.side === "bottom");
    // A scroll of the visual viewport (a pinch-zoomed page panned) moves it too.
    await page.evaluate(() => { window.vv.height = 200; window.vv.offsetTop = 100; window.vv.dispatchEvent(new Event("scroll")); });
    await until(page, () => document.querySelector(".basalt-mention-positioner").dataset.side === "top");
    const top = await page.evaluate(() => document.querySelector(".basalt-mention-picker").getBoundingClientRect().top);
    assert.ok(top >= 108 - 0.5, `kept under the visual viewport's top (100) and its margin: ${top}`);
    await page.close();
  });

  test("the typing line stays one line at 390 with three long names: cut with an ellipsis, the whole text in the live region", async () => {
    const page = await open(COMPOSER(), { width: 390 });
    await page.locator("#c").evaluate((el) => { el.parentElement.style.width = "358px"; el.parentElement.style.padding = "16px"; el.parentElement.style.boxSizing = "border-box"; });
    const below = await box(page, "#after");
    await page.evaluate(() => window.setTyping(["Maximiliana Okonkwo-Fairweather", "Bartholomew Alessandrini", "Genevieve Castellanos-Ruiz"]));
    await until(page, () => document.querySelector("#c .basalt-composer-status").textContent.endsWith("are typing"));
    const got = await page.locator("#c .basalt-composer-status").evaluate((el) => ({ h: el.getBoundingClientRect().height, cut: el.scrollWidth > el.clientWidth, overflow: getComputedStyle(el).textOverflow, text: el.textContent, live: el.getAttribute("aria-live") }));
    assert.equal(got.h, 16, "one line");
    assert.equal(got.cut, true, "the names are wider than the line");
    assert.equal(got.overflow, "ellipsis");
    assert.equal(got.text, "Maximiliana Okonkwo-Fairweather, Bartholomew Alessandrini, and Genevieve Castellanos-Ruiz are typing");
    assert.equal(got.live, "polite");
    assert.equal((await box(page, "#after")).y, below.y, "nothing under it moved");
    await page.close();
  });

  test("the field's own ARIA is kept: its aria-controls comes back when the picker closes and when it lets go", async () => {
    const page = await open(OWN_FIELD());
    const aria = () => page.locator(own).evaluate((el) => ({ controls: el.getAttribute("aria-controls"), active: el.getAttribute("aria-activedescendant"), described: el.getAttribute("aria-describedby") }));
    assert.equal((await aria()).controls, "help-1", "at rest, the field's own");
    await page.locator(own).click();
    await page.keyboard.type("@a");
    await opened(page);
    const during = await aria();
    assert.notEqual(during.controls, "help-1");
    assert.ok(during.active);
    await page.keyboard.press("Escape");
    await until(page, () => document.getElementById("own").getAttribute("aria-controls") === "help-1");
    assert.equal((await aria()).active, null);
    // The picker lets go (unmounted while open): the field has its own again, and none of the picker's.
    await page.keyboard.type(" @b");
    await opened(page);
    await page.evaluate(() => window.setPicker(false));
    await until(page, () => !document.getElementById("own").hasAttribute("aria-autocomplete"));
    const released = await page.locator(own).evaluate((el) => ({ controls: el.getAttribute("aria-controls"), active: el.getAttribute("aria-activedescendant"), popup: el.getAttribute("aria-haspopup"), described: el.getAttribute("aria-describedby") }));
    assert.deepEqual(released, { controls: "help-1", active: null, popup: null, described: "help-1" });
    await page.close();
  });

  test("a composer without mentions draws no picker and leaves its field alone; one with mentions draws it, attached to its field", async () => {
    const plain = await open(COMPOSER());
    assert.equal(await plain.evaluate(() => document.querySelector("#c textarea").hasAttribute("aria-autocomplete")), false, "no picker attached");
    await plain.close();
    const withPicker = await open(PICKER());
    await until(withPicker, () => document.querySelector("#c textarea").getAttribute("aria-autocomplete") === "list");
    await withPicker.close();
  });
});

// Found adopting B3 (2026-11-22): at 390 a picker with many rows opened over the app's bar and a strip stuck under it. Opening above, it now
// stops under the lowest pinned part above the caret (data-pinned-edge="top" or .basalt-sticky-bar), measured whether or not the page
// measures its pinned edges.
describe("The picker under what is pinned", () => {
  test("opening above, it never covers a pinned bar or strip", async () => {
    const page = await open(`
window.picks = [];
const OPTIONS = ${PEOPLE};
function App() {
  const ref = React.useRef(null);
  return (
    <div>
      <header data-pinned-edge="top" style={{ position: "sticky", top: 0, height: 56, background: "var(--basalt-surface-page)" }}>Synthetic bar</header>
      <div data-pinned-edge="top" style={{ position: "sticky", top: 56, height: 44, background: "var(--basalt-surface-page)" }}>Synthetic strip</div>
      <div style={{ height: 400 }} />
      <textarea id="own" ref={ref} rows={2} aria-label="Notes" style={{ width: 300, font: "16px/24px sans-serif" }} />
      <B.MentionPicker field={ref} options={OPTIONS} onPick={(o) => window.picks.push(o.value)} />
      <div style={{ height: 40 }} />
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`, { width: 390, height: 600 });
    await page.locator(own).click();
    await page.keyboard.type("@");
    await opened(page);
    const m = await page.evaluate(() => ({ list: document.querySelector('[role="listbox"]').getBoundingClientRect().top, strip: [...document.querySelectorAll('[data-pinned-edge="top"]')].at(-1).getBoundingClientRect().bottom }));
    assert.ok(m.list >= m.strip, `the list's top ${m.list} is under the strip's bottom ${m.strip}`);
    await page.close();
  });
});
