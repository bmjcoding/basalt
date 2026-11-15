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

import { freezeAnimations } from "./support.mjs";

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

async function open(theme, query = "", viewport = { width: 1000, height: 1200 }, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${base}?theme=${theme}${query}`);
  await page.getByRole("heading", { name: "Basalt components" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}

async function settle(page) {
  // Audit the settled state, not an overlay halfway through its entrance fade. Loading
  // animations repeat forever and are deliberately excluded from this wait, not the audit.
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  });
}

async function axe(page, include) {
  await settle(page);
  await page.addScriptTag({ content: axeSource });
  // Excluded: Base UI's focus guards (Floating UI's pattern). They are empty, aria-hidden spans
  // that take Tab only to forward focus at once to the right control, so neither a screen reader
  // nor a keyboard user ever rests on one. axe flags them as aria-hidden-focus in some Chromium
  // builds and not others; the popover test proves the behaviour instead: Tab never lands on one.
  const result = await page.evaluate((include) =>
    window.axe.run(
      { ...(include ? { include } : {}), exclude: [["[data-base-ui-focus-guard]"]] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
    ), include,
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
      // Base UI moves focus after mounting; visibility can resolve before that frame.
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Cancel");
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

    test("a selected table row is the selected wash as a band, with no bar", async () => {
      // The state is carried by a checked box and a count in words (docs/foundations.md, Selected rows), not by a mark on the row.
      const { page } = await open(theme);
      const row = page.locator('tr[aria-selected="true"]');
      assert.equal(await row.count(), 1);
      const probe = await page.evaluate(() => { const el = document.createElement("div"); el.style.background = "var(--basalt-state-selected)"; document.body.append(el); const c = getComputedStyle(el).backgroundColor; el.remove(); return c; });
      assert.equal(await row.evaluate((tr) => getComputedStyle(tr).backgroundColor), probe, "the row is the selected wash");
      const cell = row.locator("td").first();
      assert.doesNotMatch(await cell.evaluate((td) => getComputedStyle(td).boxShadow), /\b2px 0px 0px 0px inset/, "a leading bar came back");
      assert.equal(await cell.evaluate((td) => getComputedStyle(td).borderInlineStartWidth), "0px");
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
      const title = page.locator(".basalt-toast-title", { hasText: "Sandbox deleted" });
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
      const shown = page.locator(".basalt-toast-title", { hasText: "Shown on load" });
      await shown.waitFor();
      await page.waitForTimeout(300);
      assert.equal(await shown.count(), 1);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("command menu: filters by label and keyword, Enter runs, Esc closes", async () => {
      const { page } = await open(theme);
      const openMenu = async () => {
        await page.getByRole("button", { name: /Commands/ }).click();
        await page.getByRole("dialog", { name: "Command menu" }).waitFor();
        await page.waitForFunction(() => document.activeElement?.matches(".basalt-command-input"));
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

    test("textarea: controlled values, field identity, validation and disabled state stay wired", async () => {
      const { page, errors } = await open(theme, "&fixture=textarea");
      const task = page.getByRole("textbox", { name: "Controlled task", exact: true });
      assert.equal(await task.inputValue(), "Original task");
      assert.equal(await task.getAttribute("id"), "controlled-task");
      assert.equal(await task.getAttribute("name"), "task");
      await page.getByText("Controlled task", { exact: true }).click();
      assert.equal(await task.evaluate((el) => document.activeElement === el), true);
      await task.fill("Updated task");
      assert.equal(await page.getByRole("status", { name: "Task value" }).textContent(), "Updated task");
      await page.getByRole("button", { name: "Clear task" }).click();
      assert.equal(await task.inputValue(), "");
      assert.equal(await task.getAttribute("aria-invalid"), "true");
      await page.getByText("Use at least 3 characters.", { exact: true }).waitFor();
      const described = await task.evaluate((el) => (el.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent).join(" "));
      assert.match(described, /Describe the task/);
      assert.match(described, /Use at least 3 characters/);
      assert.equal(await page.getByRole("textbox", { name: "Disabled task" }).isDisabled(), true);
      assert.equal(await page.getByRole("textbox", { name: "Read only task" }).getAttribute("readonly"), "");
      assert.deepEqual(await axe(page), []);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("code syntax follows the theme, updates with its source and copies the exact text", async () => {
      const { page, errors } = await open(theme, "&fixture=code");
      const block = page.getByRole("region", { name: "Code fixtures" }).locator(".basalt-code");
      const source = page.getByRole("textbox", { name: "Code source" });
      const code = block.locator("code");
      const original = await source.inputValue();
      assert.equal(await code.textContent(), original);
      const keyword = code.locator('span[style*="syntax-keyword"]').first();
      const before = await keyword.evaluate((el) => getComputedStyle(el).color);
      await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme === "light" ? "dark" : "light");
      const after = await keyword.evaluate((el) => getComputedStyle(el).color);
      assert.notEqual(before, after, "syntax colours did not follow the theme");
      assert.match(await code.evaluate((el) => getComputedStyle(el).fontFamily), /Geist Mono/);
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await block.getByRole("button", { name: "Copy code" }).click();
      await block.getByRole("button", { name: "Copied" }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), original);
      const updated = '<script>window.__codeExecuted = true</script>\n';
      await page.getByRole("textbox", { name: "Code language" }).fill("html");
      await source.fill(updated);
      assert.equal(await code.textContent(), updated);
      assert.equal(await code.locator("script").count(), 0);
      assert.equal(await page.evaluate(() => window.__codeExecuted), undefined);
      await page.getByRole("textbox", { name: "Code language" }).fill("unsupported");
      assert.equal(await code.locator("span").count(), 0);
      assert.equal(await code.textContent(), updated);
      assert.deepEqual(await axe(page), []);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("completion: new components have no accessibility or console errors", async () => {
      const { page, errors } = await open(theme, "&fixture=complete");
      assert.deepEqual(await axe(page), []);
      assert.deepEqual(errors, []);
      assert.equal(await page.getByRole("textbox", { name: "Disabled number" }).isDisabled(), true);
      assert.equal(await page.getByRole("combobox", { name: "Disabled search" }).isDisabled(), true);
      await page.close();
    });

    test("completion: Form validates required controls and submits the selected values", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const form = page.getByRole("form", { name: "Create sandbox" });
      await form.getByRole("button", { name: "Create sandbox", exact: true }).click();
      await form.getByText("Enter a sandbox name.", { exact: true }).waitFor();
      assert.equal(await form.getByRole("textbox", { name: "Sandbox name" }).getAttribute("aria-invalid"), "true");
      await form.getByRole("textbox", { name: "Sandbox name" }).fill("nightly-run");
      const substrate = form.getByRole("combobox", { name: "Substrate" });
      await substrate.fill("virtual");
      await page.getByRole("option", { name: "Virtual machine", exact: true }).click();
      await form.getByRole("button", { name: "Create sandbox", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Saved form values"]')?.textContent?.includes("nightly-run"));
      const values = JSON.parse(await page.getByRole("status", { name: "Saved form values" }).textContent());
      assert.equal(values.sandbox, "nightly-run");
      assert.equal(values.substrate, "vm");
      assert.equal(Number(values.concurrency), 2);
      await page.close();
    });

    test("completion: Combobox filters, skips disabled choices and reports an empty search", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const input = page.getByRole("form", { name: "Create sandbox" }).getByRole("combobox", { name: "Substrate" });
      await input.fill("hosted");
      const disabled = page.getByRole("option", { name: "Hosted sandbox" });
      assert.equal(await disabled.getAttribute("aria-disabled"), "true");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      assert.notEqual(await input.inputValue(), "Hosted sandbox");
      await input.fill("zzz-no-match");
      await page.getByText("No options match.", { exact: true }).waitFor();
      // Base UI deliberately hides outside fields from AT while an editable list is open.
      // Audit the active widget, then prove Tab closes it before resting on an outside field;
      // the full-page audit below confirms all outside controls are exposed again.
      assert.deepEqual(await axe(page, [[".basalt-combobox"], [".basalt-combobox-popup"]]), []);
      for (let i = 0; i < 3 && await page.locator(".basalt-combobox-popup").isVisible(); i++) {
        await page.keyboard.press("Tab");
        await settle(page);
        assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[aria-hidden="true"], [inert]')), false);
      }
      await page.locator(".basalt-combobox-popup").waitFor({ state: "hidden" });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });

    test("completion: numeric input steps, clamps and disables buttons at its bounds", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const region = page.getByRole("region", { name: "Number entry" });
      const input = region.getByRole("textbox", { name: "Concurrent runs" });
      await region.getByRole("button", { name: "Increase value" }).click();
      await region.getByRole("button", { name: "Increase value" }).click();
      assert.equal(await input.inputValue(), "4");
      assert.equal(await region.getByRole("button", { name: "Increase value" }).isDisabled(), true);
      await input.focus();
      await page.keyboard.press("ArrowDown");
      assert.equal(await input.inputValue(), "3");
      await input.fill("99");
      await page.keyboard.press("Tab");
      assert.equal(await input.inputValue(), "4");
      await page.close();
    });

    test("completion: slider and range thumbs are named and work from the keyboard", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const limit = page.getByRole("slider", { name: "Request limit", exact: true });
      await limit.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await limit.inputValue(), "45");
      assert.equal(await limit.getAttribute("aria-valuetext"), "45 requests per minute");
      await page.keyboard.press("Home");
      assert.equal(await limit.inputValue(), "0");
      await page.keyboard.press("End");
      assert.equal(await limit.inputValue(), "100");
      const lower = page.getByRole("slider", { name: "Minimum duration" });
      await lower.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await lower.inputValue(), "11");
      assert.equal(await page.getByRole("slider", { name: "Maximum duration" }).inputValue(), "30");
      await page.close();
    });

    test("completion: AlertDialog focuses Cancel even when it is second and ignores outside clicks", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const trigger = page.getByRole("region", { name: "Confirmations" }).getByRole("button", { name: "Remove sandbox", exact: true });
      await trigger.click();
      const alert = page.getByRole("alertdialog", { name: "Remove blacksand-api?" });
      await alert.waitFor();
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Keep sandbox");
      assert.deepEqual(await axe(page), []);
      await page.mouse.click(5, 5);
      assert.equal(await alert.isVisible(), true);
      await page.keyboard.press("Escape");
      await alert.waitFor({ state: "hidden" });
      assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
      await page.close();
    });

    test("completion: Sheet supports nested popups and confirmations, then saves and returns focus", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const trigger = page.getByRole("region", { name: "Sheet", exact: true }).getByRole("button", { name: "Sandbox settings" });
      await trigger.click();
      const sheet = page.getByRole("dialog", { name: "Sandbox settings", exact: true });
      await sheet.waitFor();
      const input = sheet.getByRole("combobox", { name: "Agent" });
      await input.fill("Codex");
      const option = page.getByRole("option", { name: "Codex", exact: true });
      await option.waitFor();
      const popupLayer = await option.evaluate((el) => Number(getComputedStyle(el.closest(".basalt-positioner")).zIndex));
      const sheetLayer = await sheet.evaluate((el) => Number(getComputedStyle(el).zIndex));
      assert.ok(popupLayer > sheetLayer, "the portalled list is behind the sheet");
      await option.click();
      await sheet.getByRole("button", { name: "Remove sandbox", exact: true }).click();
      const alert = page.getByRole("alertdialog", { name: "Remove blacksand-api?" });
      await alert.waitFor();
      assert.ok(await alert.evaluate((el) => Number(getComputedStyle(el).zIndex)) > popupLayer);
      await page.keyboard.press("Escape");
      await alert.waitFor({ state: "hidden" });
      assert.equal(await sheet.isVisible(), true);
      assert.deepEqual(await axe(page), []);
      await sheet.getByRole("button", { name: "Save settings" }).click();
      await sheet.waitFor({ state: "hidden" });
      assert.match(await page.getByRole("status", { name: "Saved settings" }).textContent(), /codex/);
      assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
      await page.close();
    });

    test("completion: Select, Menu, Popover and Tooltip remain above their parent dialog", async () => {
      const { page, errors } = await open(theme, "&fixture=complete");
      await page.getByRole("button", { name: "Route settings", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Route settings", exact: true });
      const parentLayer = await dialog.evaluate((el) => Number(getComputedStyle(el).zIndex));
      const layerOf = (locator) => locator.evaluate((el) => Number(getComputedStyle(el.closest(".basalt-positioner")).zIndex));
      await dialog.getByRole("combobox", { name: "Transport" }).click();
      const http = page.getByRole("option", { name: "HTTP", exact: true });
      assert.ok(await layerOf(http) > parentLayer);
      await http.click();
      await dialog.getByRole("button", { name: "Route actions" }).click();
      const duplicate = page.getByRole("menuitem", { name: "Duplicate route" });
      assert.ok(await layerOf(duplicate) > parentLayer);
      await duplicate.click();
      await dialog.getByText("Route duplicated in this example.", { exact: true }).waitFor();
      await dialog.getByRole("button", { name: "Inspect policy" }).click();
      const policy = page.getByRole("dialog", { name: "Route policy", exact: true });
      await policy.waitFor();
      assert.ok(await layerOf(policy) > parentLayer);
      assert.deepEqual(await axe(page), []);
      await page.keyboard.press("Escape");
      await policy.waitFor({ state: "hidden" });
      const check = dialog.getByRole("button", { name: "Check route", exact: true });
      await dialog.getByRole("button", { name: "Done" }).focus();
      await page.keyboard.press("Shift+Tab");
      assert.equal(await check.evaluate((el) => document.activeElement === el), true);
      const tip = page.getByRole("tooltip").filter({ hasText: "Validate the host against the route allowlist" });
      await tip.waitFor();
      assert.equal(await check.getAttribute("aria-describedby"), await tip.getAttribute("id"));
      assert.ok(await layerOf(tip) > parentLayer);
      await check.click();
      await dialog.getByText("Route checked in this example.", { exact: true }).waitFor();
      await dialog.getByRole("button", { name: "Done" }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("completion: menu checkbox, radio and submenu report their state and run an action", async () => {
      const { page } = await open(theme, "&fixture=complete");
      await page.getByRole("button", { name: "View options", exact: true }).click();
      const checkbox = page.getByRole("menuitemcheckbox", { name: "Show archived" });
      await checkbox.click();
      assert.equal(await checkbox.getAttribute("aria-checked"), "true");
      const compact = page.getByRole("menuitemradio", { name: "Compact rows" });
      await compact.click();
      assert.equal(await compact.getAttribute("aria-checked"), "true");
      await page.getByRole("menuitem", { name: "Export", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await page.getByRole("menuitem", { name: "Export JSON" }).waitFor();
      // The open submenu deliberately covers background page targets. Audit the active
      // menus, then the full page after dismissal, rather than treating covered buttons as
      // partially usable targets of this interaction.
      assert.deepEqual(await axe(page, [[".basalt-menu"]]), []);
      await page.getByRole("menuitem", { name: "Export JSON" }).click();
      assert.equal(await page.getByRole("status", { name: "Export result" }).textContent(), "JSON export selected");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });

    test("completion: navigation, empty state and typography expose their semantics", async () => {
      const { page } = await open(theme, "&fixture=complete");
      const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
      assert.equal(await crumbs.locator('[aria-current="page"]').textContent(), "Runs");
      const pagination = page.getByRole("navigation", { name: "Pagination" });
      assert.equal(await pagination.getByRole("button", { name: "Previous page" }).isDisabled(), true);
      await pagination.getByRole("button", { name: "Next page" }).click();
      await pagination.getByRole("button", { name: "Page 3", exact: true }).click();
      assert.equal(await pagination.locator('[aria-current="page"]').textContent(), "3");
      await page.getByText("Showing page 3 of 20.", { exact: true }).waitFor();
      await page.getByRole("img", { name: "Bailey Jones" }).getByText("BJ").waitFor();
      assert.equal(await page.getByRole("heading", { name: "Run agents on ground you trust" }).evaluate((el) => el.tagName), "H3");
      assert.match(await page.locator(".basalt-inline-code").evaluate((el) => getComputedStyle(el).fontFamily), /Geist Mono/);
      await page.getByRole("button", { name: "Create your first sandbox" }).click();
      await page.getByText("Sandbox created in this example.", { exact: true }).waitFor();
      await page.close();
    });

    test("completion: boundaries and selection remain structural in forced colours", async () => {
      const { page } = await open(theme, "&fixture=complete");
      await page.emulateMedia({ forcedColors: "active" });
      const input = page.getByRole("form", { name: "Create sandbox" }).getByRole("textbox", { name: "Sandbox name" });
      assert.equal(await input.evaluate((el) => getComputedStyle(el).borderStyle), "solid");
      assert.equal(await input.evaluate((el) => getComputedStyle(el).borderWidth), "1px");
      const selected = page.getByRole("navigation", { name: "Pagination" }).locator('[aria-current="page"]');
      assert.equal(await selected.evaluate((el) => getComputedStyle(el).outlineStyle), "solid");
      assert.equal(await selected.evaluate((el) => getComputedStyle(el).outlineWidth), "2px");
      await page.close();
    });

    test("completion: components fit a phone viewport", async () => {
      const { page, errors } = await open(theme, "&fixture=complete", { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
      await page.evaluate(() => document.documentElement.dataset.density = "compact");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
      const targets = await page.locator(".basalt-combobox-trigger, .basalt-number-group .basalt-button, .basalt-pagination .basalt-button, .basalt-slider-control").evaluateAll((elements) => elements.map((el) => {
        const { width, height } = el.getBoundingClientRect();
        return { label: el.getAttribute("aria-label") ?? el.textContent, width, height };
      }));
      assert.deepEqual(targets.filter((target) => target.width < 44 || target.height < 44), [], "completion touch target below 44px");
      await page.getByRole("button", { name: "Sandbox settings", exact: true }).click();
      const sheet = page.getByRole("dialog", { name: "Sandbox settings" });
      await settle(page);
      const bounds = await sheet.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 390 && bounds.height <= 844, "sheet leaves phone viewport");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("completion: a reduced-motion sheet fades without translation", async () => {
      const { page } = await open(theme, "&fixture=complete");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("button", { name: "Sandbox settings", exact: true }).click();
      const sheet = page.getByRole("dialog", { name: "Sandbox settings" });
      await sheet.waitFor();
      const moving = await sheet.evaluate((el) => el.getAnimations().flatMap((animation) => animation.effect.getKeyframes()).filter((frame) => frame.transform && frame.transform !== "none"));
      assert.deepEqual(moving, [], "sheet translated despite the reduced-motion preference");
      await settle(page);
      assert.equal(await sheet.evaluate((el) => getComputedStyle(el).transform), "none");
      await page.close();
    });

    test("compact density moves every control down a step, including portals, and can be reset", async () => {
      const { page } = await open(theme, "&fixture=density");
      const heights = () => page.getByRole("region", { name: "Density fixtures" }).locator(".basalt-button, .basalt-input, .basalt-select-trigger").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      const normal = [24, 28, 32, 36, 40].flatMap((n) => [n, n, n]);
      assert.deepEqual(await heights(), normal);
      await page.evaluate(() => document.documentElement.dataset.density = "compact");
      assert.deepEqual(await heights(), [24, 24, 28, 32, 36].flatMap((n) => [n, n, n]));
      await page.getByRole("button", { name: "Actions", exact: true }).click();
      const menu = page.getByRole("menu");
      await menu.waitFor();
      await settle(page);
      // the plate is 32 in compact and the row carries 2px above and below it
      assert.equal(await menu.getByRole("menuitem").first().evaluate((el) => el.getBoundingClientRect().height), 36);
      await page.keyboard.press("Escape");
      await page.getByRole("region", { name: "Density fixtures" }).evaluate((el) => el.dataset.density = "default");
      assert.deepEqual(await heights(), normal, "nested default scope did not restore the scale");
      await page.close();
    });

    test("touch keeps 44px targets in compact mode and text inputs avoid focus zoom", async () => {
      const { page } = await open(theme, "&fixture=density", { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
      await page.evaluate(() => document.documentElement.dataset.density = "compact");
      assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
      const controls = await page.locator(".basalt-button, .basalt-input, .basalt-select-trigger, .basalt-tab, .basalt-segment, .basalt-choice, .basalt-accordion-trigger").evaluateAll((els) => els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { text: el.getAttribute("aria-label") ?? el.textContent, width: rect.width, height: rect.height };
      }));
      assert.deepEqual(controls.filter((c) => c.width < 44 || c.height < 44), [], "small touch target");
      assert.equal(await page.getByRole("textbox", { name: "Input xs" }).evaluate((el) => getComputedStyle(el).fontSize), "16px");
      await page.getByRole("button", { name: "Actions", exact: true }).click();
      await page.getByRole("menu").waitFor();
      await settle(page);
      assert.equal(await page.getByRole("menuitem").first().evaluate((el) => el.getBoundingClientRect().height), 44);
      await page.close();
    });

    test("motion primitives keep their names, width and reduced-motion fallback", async () => {
      const { page } = await open(theme);
      assert.equal(await page.getByRole("status", { name: "Loading runs" }).count(), 1);
      assert.equal(await page.getByRole("status", { name: "Loading marks" }).count(), 1);
      assert.match(await page.locator(".basalt-spinner[data-variant=braille] [data-dot='1']").evaluate((el) => getComputedStyle(el).animationTimingFunction), /step/);
      const ticker = page.getByRole("region", { name: "Motion" }).locator(".basalt-ticker .basalt-visually-hidden");
      assert.equal(await ticker.textContent(), "1,284");
      await page.getByRole("button", { name: "Add a run" }).click();
      await page.waitForFunction(() => document.querySelector(".basalt-ticker .basalt-visually-hidden")?.textContent === "1,285");
      const saving = page.getByRole("button", { name: "Saving" });
      assert.equal(await saving.getAttribute("aria-busy"), "true");
      const width = await saving.evaluate((el) => {
        const button = el.getBoundingClientRect().width;
        const label = el.querySelector(".basalt-button-label").getBoundingClientRect().width;
        return { button, label };
      });
      assert.ok(width.button + 1 >= width.label, "loading button is narrower than its label");
      await saving.focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.getByTestId("saving-clicks").textContent(), "0");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await page.locator(".basalt-spinner[data-variant=ring] svg").first().evaluate((el) => getComputedStyle(el).animationName), "basalt-pulse");
      assert.equal(await page.locator(".basalt-spinner[data-variant=braille] [data-dot='1']").evaluate((el) => getComputedStyle(el).animationName), "none", "braille holds under reduced motion");
      const add = page.getByRole("button", { name: "Add a run" });
      const box = await add.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      assert.equal(await add.evaluate((el) => getComputedStyle(el).transform), "none", "reduced motion drops the press scale");
      await page.mouse.up();
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(await saving.evaluate((el) => getComputedStyle(el).borderStyle), "solid");
      await page.close();
    });

    test("loading and expansion honour reduced motion", async () => {
      const { page } = await open(theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await page.getByRole("status", { name: "Starting sandbox" }).locator("svg").evaluate((el) => getComputedStyle(el).animationName), "basalt-pulse");
      assert.equal(await page.locator(".basalt-skeleton").first().evaluate((el) => getComputedStyle(el).animationName), "none");
      assert.equal(await page.locator(".basalt-progress-indicator[data-indeterminate]").evaluate((el) => getComputedStyle(el).animationName), "basalt-pulse");
      assert.equal(await page.locator(".basalt-accordion-caret").first().evaluate((el) => getComputedStyle(el).transitionDuration), "0s");
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

    test("benji primitives keep names, keyboard, chart, toast drain and reduced motion", async () => {
      const { page } = await open(theme);
      const benji = page.getByRole("region", { name: "Benji" });
      await benji.getByRole("button", { name: "Menu icon" }).click();
      assert.equal(await benji.locator(".basalt-morph").first().getAttribute("data-icon"), "close");
      const action = benji.getByRole("button", { name: "Continue" });
      await action.locator(".basalt-text-morph[data-font='ready']").waitFor();
      assert.equal(await action.locator("[aria-live=polite]").textContent(), "Continue");
      const readGlyphs = () => benji.locator(".basalt-text-morph").first().locator(".basalt-text-morph-glyph").evaluateAll((els) => {
        const root = els[0]?.parentElement?.parentElement?.getBoundingClientRect();
        return els.map((el) => {
          const box = el.getBoundingClientRect();
          return { t: el.textContent ?? "", x: box.x - (root?.x ?? 0), right: box.right - (root?.x ?? 0), kind: el.getAttribute("data-kind"), pos: getComputedStyle(el).position };
        });
      });
      const before = await readGlyphs();
      const prefix = ["C", "o", "n"].map((letter) => before.find((glyph) => glyph.t === letter && glyph.kind === "stay"));
      assert.ok(prefix.every(Boolean), "shared prefix is missing before the morph");
      // The morph is read 40ms in, on a clock the test holds: its exit timer (duration + 40ms) cannot have run on a slow machine.
      const clock = await freezeAnimations(page);
      await action.click();
      await clock.advance(40);
      const mid = await readGlyphs();
      for (const letter of prefix) {
        const again = mid.find((glyph) => glyph.t === letter.t && glyph.kind === "stay");
        assert.ok(again && Math.abs(again.x - letter.x) < 1, `${letter.t} moved from ${letter.x} to ${again?.x}`);
      }
      assert.ok(mid.some((glyph) => glyph.kind === "exit" && glyph.pos === "absolute"), "leaving letters still take layout");
      assert.ok(mid.every((glyph) => glyph.pos === "absolute"));
      await clock.thaw(); // the rest runs on its own: waitForFunction polls on requestAnimationFrame
      await page.waitForFunction(() => {
        const root = document.querySelector("[aria-label='Benji'] .basalt-text-morph");
        const glyphs = [...(root?.querySelectorAll(".basalt-text-morph-glyph") ?? [])];
        const text = glyphs.slice().sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x).map((glyph) => glyph.textContent).join("");
        return text === "Confirm" && glyphs.every((glyph) => glyph.getAttribute("data-kind") !== "exit");
      });
      const settled = (await readGlyphs()).sort((a, b) => a.x - b.x);
      for (let index = 1; index < settled.length; index += 1) {
        assert.ok(settled[index].x >= settled[index - 1].right - 0.5, "settled glyphs overlap");
      }
      assert.equal(await benji.locator("[aria-live=polite]", { hasText: "Confirm" }).textContent(), "Confirm");
      const next = benji.getByRole("button", { name: "Next" });
      await next.focus();
      await page.keyboard.press("Enter");
      // The Stepper's polite live region says where the user is as well as the step's name (audit-fix-c4, A3-13).
      assert.equal(await benji.locator("[aria-live=polite]", { hasText: "Choose a route" }).textContent(), "Step 2 of 3: Choose a route");
      await benji.getByRole("button", { name: "Week" }).click();
      assert.equal(await benji.locator(".basalt-segmented").getAttribute("data-direction"), "forward");
      await page.getByRole("tab", { name: "Runs" }).click();
      assert.equal(await page.locator(".basalt-tabs-root").getAttribute("data-direction"), "forward");
      assert.equal(await benji.getByText("No runs yet").count(), 1);
      await benji.getByRole("button", { name: "Show runs" }).click();
      await benji.getByRole("img", { name: /Run volume/ }).waitFor();
      await benji.getByRole("button", { name: "Show timed toast" }).click();
      const drain = page.locator(".basalt-toast-drain");
      await drain.waitFor();
      assert.equal(await drain.evaluate((el) => getComputedStyle(el).animationName), "basalt-drain");
      await page.locator(".basalt-toast").hover();
      assert.equal(await drain.evaluate((el) => getComputedStyle(el).animationPlayState), "paused");
      const preview = benji.getByRole("textbox", { name: "Display name" });
      await preview.fill("n1");
      assert.equal(await benji.locator(".basalt-preview [aria-live=polite]").textContent(), "n1");
      assert.equal(await page.getByLabel("Saved name").textContent(), "blacksand");
      await benji.getByRole("button", { name: "Save" }).click();
      assert.equal(await page.getByLabel("Saved name").textContent(), "n1");
      await benji.getByRole("button", { name: "Send run" }).click();
      await page.getByRole("status", { name: "Run pending" }).waitFor();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => document.querySelector(".basalt-morph")?.hasAttribute("data-reduced"));
      assert.equal(await page.locator(".basalt-tabs-root[data-direction] .basalt-tabs-panel").evaluate((el) => getComputedStyle(el).animationName), "basalt-fade-in");
      await page.close();
    });

    // The package's tests ran axe at 1000px only, which is how a table that scrolls sideways with no keyboard stop (A3-01) went
    // unseen: at phone width the demo's table overflows its box and axe reports scrollable-region-focusable.
    test("no WCAG 2.2 AA violations at phone width (390px), at rest", async () => {
      const { page, errors } = await open(theme, "", { width: 390, height: 844 });
      assert.deepEqual(await axe(page), []);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("no WCAG 2.2 AA violations at phone width on a touch device, and the table scrolls from the keyboard", async () => {
      const { page } = await open(theme, "&fixture=complete", { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
      assert.deepEqual(await axe(page), []);
      const frame = page.getByRole("region", { name: "Recent runs table" });
      assert.equal(await frame.count(), 1, "the overflowing table is a named region");
      await frame.focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => document.querySelector(".basalt-table-container").scrollLeft > 0);
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
