// Browser tests on the demo page (.demo, built by build.mjs), in both themes:
// - axe-core finds no WCAG 2.2 A/AA violations, at rest and with the menu and dialog open
// - keyboard behaviour: menus, dialogs, tabs and the segmented control work without a mouse,
//   Esc closes overlays, and focus returns where it came from
// - focus is visible: a 2px outline in the focus token
// - no horizontal page scroll at phone width

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const demo = path.join(here, "..", ".demo");
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
let server;
let base;
let browser;

before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(demo, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
    if (!file.startsWith(demo) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(theme, query = "", viewport = { width: 1000, height: 1200 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?theme=${theme}${query}`);
  await page.getByRole("heading", { name: "Basalt components" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}

async function axe(page) {
  await page.addScriptTag({ content: axeSource });
  // Excluded: Base UI's focus guards (Floating UI's pattern). They are empty, aria-hidden spans
  // that take Tab only to forward focus at once to the right control, so neither a screen reader
  // nor a keyboard user ever rests on one. axe flags them as aria-hidden-focus in some Chromium
  // builds and not others; the popover test proves the behaviour instead: Tab never lands on one.
  const result = await page.evaluate(() =>
    window.axe.run(
      { exclude: [["[data-base-ui-focus-guard]"]] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
    ),
  );
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`);
}

for (const theme of ["light", "dark"]) {
  describe(theme, () => {
    test("no WCAG 2.2 AA violations at rest, and no console errors", async () => {
      const { page, errors } = await open(theme);
      assert.deepEqual(await axe(page), []);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("menu: opens from the keyboard, arrows move, Esc closes and returns focus", async () => {
      const { page } = await open(theme);
      const trigger = page.getByRole("button", { name: "Actions", exact: true });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const menu = page.getByRole("menu");
      await menu.waitFor();
      assert.deepEqual(await axe(page), [], "violations with the menu open");
      await page.keyboard.press("ArrowDown");
      const highlighted = await page.evaluate(() => document.activeElement?.textContent);
      assert.ok(highlighted && /New sandbox|Duplicate/.test(highlighted), `focus moved into the menu (${highlighted})`);
      await page.keyboard.press("Escape");
      await menu.waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Actions");
      await page.close();
    });

    test("dialog: named, traps focus, Esc closes and returns focus", async () => {
      const { page } = await open(theme);
      const trigger = page.getByRole("button", { name: "Delete sandbox" });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Delete blacksand-api?" });
      await dialog.waitFor();
      // a destructive confirmation opens with focus on the safe choice
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Cancel");
      assert.deepEqual(await axe(page), [], "violations with the dialog open");
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        // Base UI's focus guards return focus to the dialog on the next frame; read it after that
        const inside = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(!!document.activeElement?.closest('[role="dialog"]'))))));
        assert.ok(inside, `Tab ${i + 1} left the dialog`);
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Delete sandbox");
      await page.close();
    });

    test("tabs: arrow keys move between tabs and switch the panel", async () => {
      const { page } = await open(theme);
      await page.getByRole("tab", { name: "Overview" }).focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      const runs = page.getByRole("tab", { name: "Runs" });
      assert.equal(await runs.getAttribute("aria-selected"), "true");
      await page.getByText("142 runs this week.").waitFor();
      await page.close();
    });

    test("segmented control: always exactly one segment selected", async () => {
      const { page } = await open(theme);
      const seg = (name) => page.getByRole("button", { name, exact: true });
      await seg("24h").click(); // already selected: must stay selected
      assert.equal(await seg("24h").getAttribute("aria-pressed"), "true");
      await seg("7d").click();
      assert.equal(await seg("7d").getAttribute("aria-pressed"), "true");
      assert.equal(await seg("24h").getAttribute("aria-pressed"), "false");
      await page.close();
    });

    test("focus is visible: a 2px outline in the focus colour", async () => {
      const { page } = await open(theme);
      await page.keyboard.press("Tab"); // the first button, Deploy
      const ring = await page.evaluate(() => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        const probe = document.createElement("i");
        probe.style.color = "var(--basalt-border-focus)";
        document.body.append(probe);
        const focus = getComputedStyle(probe).color;
        probe.remove();
        return { text: el.textContent, width: s.outlineWidth, style: s.outlineStyle, color: s.outlineColor, focus };
      });
      assert.equal(ring.text, "Deploy");
      assert.equal(ring.width, "2px");
      assert.equal(ring.style, "solid");
      assert.equal(ring.color, ring.focus);
      await page.close();
    });

    test("a selected table row has a cue besides colour (WCAG 1.4.11)", async () => {
      const { page } = await open(theme);
      const row = page.locator('tr[aria-selected="true"]');
      assert.equal(await row.count(), 1);
      const shadow = await row.locator("td").first().evaluate((td) => getComputedStyle(td).boxShadow);
      assert.match(shadow, /\b2px 0px 0px 0px inset/, `selected row's leading bar is missing (${shadow})`);
      await page.close();
    });

    test("checkbox, switch and radio work from the keyboard and are named by their labels", async () => {
      const { page } = await open(theme);
      const dns = page.getByRole("checkbox", { name: "Allow outbound DNS" });
      await dns.focus();
      await page.keyboard.press("Space");
      assert.equal(await dns.getAttribute("aria-checked"), "true");
      const verbose = page.getByRole("switch", { name: "Verbose logs" });
      await verbose.focus();
      await page.keyboard.press("Space");
      assert.equal(await verbose.getAttribute("aria-checked"), "true");
      await page.getByRole("radio", { name: "Kubernetes (k3s)" }).focus();
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.getByRole("radio", { name: "Virtual machine" }).getAttribute("aria-checked"), "true");
      await page.close();
    });

    test("select: labelled by its field, opens from the keyboard, picks with Enter, skips disabled", async () => {
      const { page } = await open(theme);
      const trigger = page.getByRole("combobox", { name: "Region" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const list = page.getByRole("listbox");
      await list.waitFor();
      assert.deepEqual(await axe(page), [], "violations with the select open");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await list.waitFor({ state: "hidden" });
      assert.match(await trigger.textContent(), /San Francisco/);
      assert.equal(await page.getByRole("option", { name: /Tokyo/, includeHidden: true }).count() <= 1, true);
      await page.close();
    });

    test("toast: announced, dismissable, and accessible", async () => {
      const { page } = await open(theme);
      await page.getByRole("button", { name: "Show toast" }).click();
      const title = page.getByText("Sandbox deleted");
      await title.waitFor();
      assert.ok(await page.locator('[aria-live]').count() > 0, "no live region for toasts");
      assert.deepEqual(await axe(page), [], "violations with a toast shown");
      // Base UI keeps Close out of the accessibility tree until the stack expands on hover or
      // focus, which is how anyone reaches it
      await page.locator(".basalt-toast").hover();
      await page.getByRole("button", { name: "Dismiss" }).click();
      await title.waitFor({ state: "hidden" });
      await page.close();
    });

    test("useToast is stable: a toast shown from an effect shows once", async () => {
      const { page, errors } = await open(theme, "&open=toast");
      await page.getByText("Shown on load").waitFor();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText("Shown on load").count(), 1);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("command menu: filters by label and keyword, Enter runs, Esc closes", async () => {
      const { page } = await open(theme);
      const openMenu = async () => {
        await page.getByRole("button", { name: /Commands/ }).click();
        await page.getByRole("dialog", { name: "Command menu" }).waitFor();
      };
      await openMenu();
      assert.deepEqual(await axe(page), [], "violations with the command menu open");
      await page.keyboard.type("remove");
      await page.keyboard.press("Enter");
      await page.getByRole("dialog", { name: "Command menu" }).waitFor({ state: "hidden" });
      assert.equal(await page.getByTestId("ran").textContent(), "Delete sandbox");
      await openMenu();
      await page.keyboard.type("zzz");
      await page.getByText("No commands match.").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "Command menu" }).waitFor({ state: "hidden" });
      await page.close();
    });

    test("popover: opens from the keyboard, named, Esc returns focus", async () => {
      const { page } = await open(theme);
      const trigger = page.getByRole("button", { name: "Route details" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const pop = page.getByRole("dialog", { name: "anthropic" });
      await pop.waitFor();
      assert.deepEqual(await axe(page), [], "violations with the popover open");
      await page.keyboard.press("Escape");
      await pop.waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Route details");
      // focus guards forward focus: Tabbing through and out of the popover never rests on one
      await page.keyboard.press("Enter");
      await pop.waitFor();
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("Tab");
        const on = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(document.activeElement?.hasAttribute("data-base-ui-focus-guard"))))));
        assert.equal(on, false, `Tab ${i + 1} rested on a focus guard`);
      }
      await page.close();
    });

    test("textarea, progress and spinner are named; callouts announce only when live", async () => {
      const { page } = await open(theme);
      assert.equal(await page.getByRole("textbox", { name: "Task" }).count(), 1);
      const bar = page.getByRole("progressbar", { name: "Building image" });
      assert.equal(await bar.getAttribute("aria-valuenow"), "42");
      assert.equal(await page.getByRole("progressbar", { name: "Waiting for a node" }).count(), 1);
      assert.equal(await page.getByRole("status", { name: "Starting sandbox" }).count(), 1);
      // a callout present on load is not a live region (it would be read out on every load)
      assert.equal(await page.locator(".basalt-callout[role]").count(), 0);
      await page.close();
    });

    test("code block: keyboard-scrollable, copies, and says so", async () => {
      const { page } = await open(theme);
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      assert.equal(await page.locator(".basalt-code-pre").getAttribute("tabindex"), "0");
      await page.getByRole("button", { name: "Copy code" }).click();
      await page.getByRole("button", { name: "Copied" }).waitFor();
      assert.match(await page.evaluate(() => navigator.clipboard.readText()), /blacksand k8s run/);
      assert.equal(await page.locator(".basalt-code [role=status]").textContent(), "Copied");
      await page.close();
    });

    test("accordion: Enter toggles a section and its state is announced", async () => {
      const { page } = await open(theme);
      const keys = page.getByRole("button", { name: "Keys" });
      assert.equal(await keys.getAttribute("aria-expanded"), "false");
      await keys.focus();
      await page.keyboard.press("Enter");
      assert.equal(await keys.getAttribute("aria-expanded"), "true");
      await page.getByText("Keys stay outside the sandbox").waitFor();
      await page.close();
    });

    test("no horizontal page scroll at phone width", async () => {
      const { page } = await open(theme, "", { width: 390, height: 844 });
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(width <= 390, `page is ${width}px wide at a 390px viewport`);
      await page.close();
    });
  });
}
