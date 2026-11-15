// A2-11 / A5-05: the shadcn aliases follow a nested theme. A var() is substituted where it is declared, so an alias declared only on
// :root keeps the root's colours inside a dark subtree of a light page. They are declared again on every theme selector.
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, test } from "node:test";

import { chromium } from "playwright";

const dist = (file) => fs.readFileSync(new URL(`../dist/${file}`, import.meta.url), "utf8");
const sheet = dist("css/tokens.css") + dist("css/shadcn.css");

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

/** `alias` (a shadcn name) and `basalt` (the token it maps to), painted as a background inside `inner`, on a page of `outer`. */
async function paint(outer, inner, alias, basalt) {
  const page = await browser.newPage();
  try {
    await page.setContent(`<html ${outer}><style>${sheet}</style><body><div ${inner}><i id="a" style="display:block;background:var(--${alias})"></i><i id="b" style="display:block;background:var(--basalt-${basalt})"></i></div></body></html>`);
    return await page.evaluate(() => ({ alias: getComputedStyle(document.querySelector("#a")).backgroundColor, basalt: getComputedStyle(document.querySelector("#b")).backgroundColor }));
  } finally { await page.close(); }
}

const PAIRS = [["background", "surface-page"], ["foreground", "text-primary"], ["card", "surface-raised"], ["muted-foreground", "text-secondary"], ["border", "border-hairline"], ["ring", "border-focus"]];

test("inside a nested theme, every alias resolves to that theme's token, by attribute and by class", async () => {
  for (const [outer, inner] of [['data-theme="light"', 'data-theme="dark"'], ['data-theme="dark"', 'data-theme="light"'], ['data-theme="light"', 'class="dark"'], ['class="dark"', 'class="light"']]) {
    for (const [alias, basalt] of PAIRS) {
      const { alias: got, basalt: want } = await paint(outer, inner, alias, basalt);
      assert.equal(got, want, `--${alias} inside ${inner} on ${outer}`);
    }
  }
});

test("at the root the aliases still resolve to the root's theme, and the declarations are the same", async () => {
  for (const theme of ["light", "dark"]) for (const [alias, basalt] of PAIRS) {
    const { alias: got, basalt: want } = await paint(`data-theme="${theme}"`, "", alias, basalt);
    assert.equal(got, want, `--${alias} at the ${theme} root`);
  }
  const css = dist("css/shadcn.css");
  const block = /\{([^}]*)\}/.exec(css)[1];
  assert.match(css, /^:root, \[data-theme="light"\], \[data-theme="dark"\], \.light, \.dark \{$/m);
  assert.match(block, /--background: var\(--basalt-surface-page\);/);
  assert.match(block, /--radius: var\(--basalt-radius-md\);/);
  assert.equal(css.match(/\{/g).length, 1, "one rule; no alias is added or moved");
});
