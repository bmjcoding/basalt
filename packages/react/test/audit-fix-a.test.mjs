// The first fix batch from the components audit (A2-01, -02, -07, -08, -09, -12, -13): each finding is a documented behaviour that
// the code did not keep, and each has a test that fails on the code before the fix. The repros are the audit's, ported.
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToString } = require("react-dom/server");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["light", "dark"];
const frames = (page, count = 2) => page.evaluate((n) => new Promise((resolve) => { const step = (left) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve()); step(n); }), count);

for (const theme of THEMES) {
  describe(`A2-01 and A2-02: TimeChart (${theme})`, () => {
    test("an equivalent data render during a glide does not freeze the marks between the old and new values", async () => {
      const { page } = await fixturePage(browser, `const root=createRoot(document.getElementById('root'));window.chart=(values)=>flushSync(()=>root.render(<B.TimeChart title="Reading" kind="line" days={['2026-11-01','2026-11-02']} series={[{id:'a',name:'A',values}]} summary="Reading" format={String} fromZero/>));window.chart([10,20]);`, { theme, clock: true });
      const { page: fresh } = await fixturePage(browser, `createRoot(document.getElementById('root')).render(<B.TimeChart title="Reading" kind="line" days={['2026-11-01','2026-11-02']} series={[{id:'a',name:'A',values:[20,10]}]} summary="Reading" format={String} fromZero/>);`, { theme, clock: true });
      try {
        await page.clock.runFor(32);
        await page.evaluate(() => window.chart([20, 10]));
        await page.clock.runFor(48);
        const during = await page.locator(".basalt-chart-series path").getAttribute("d");
        // The parent rebuilds its arrays mid-glide: the same numbers, new objects.
        await page.evaluate(() => window.chart([20, 10]));
        await page.clock.runFor(1000);
        const after = await page.locator(".basalt-chart-series path").getAttribute("d");
        await fresh.clock.runFor(32);
        const target = await fresh.locator(".basalt-chart-series path").getAttribute("d");
        assert.notEqual(during, target, "the glide was under way when the equivalent render came");
        assert.equal(after, target, JSON.stringify({ during, after, target }));
      } finally { await page.close(); await fresh.close(); }
    });

    test("a negative value is a bar, drawn down from the zero baseline", async () => {
      const { page } = await fixturePage(browser, `createRoot(document.getElementById('root')).render(<B.TimeChart title="Temperature" kind="bar" days={['2026-11-01','2026-11-02','2026-11-03']} series={[{id:'a',name:'Temperature',values:[-5,5,0]}]} summary="Minus five to five" format={String}/>);`, { theme });
      try {
        await page.locator(".basalt-chart-svg").waitFor();
        const data = await page.evaluate(() => {
          const read = (el) => ({ y: +el.getAttribute("y"), h: +el.getAttribute("height") });
          return { bars: [...document.querySelectorAll(".basalt-chart-svg .basalt-chart-bar")].map(read), baseline: +document.querySelector(".basalt-chart-baseline").getAttribute("y1") };
        });
        assert.equal(data.bars.length, 2, "−5 and 5 are bars; 0 is a real zero and draws none");
        const [down, up] = data.bars;
        // The baseline is crisp (on the half pixel); a bar starts on the whole pixel beside it.
        assert.ok(Math.abs(down.y - (data.baseline + 0.5)) <= 1, `the negative bar hangs from the baseline ${JSON.stringify(data)}`);
        assert.ok(Math.abs(up.y + up.h - (data.baseline + 0.5)) <= 1, `the positive bar stands on the baseline ${JSON.stringify(data)}`);
        assert.ok(down.h > 0 && Math.abs(down.h - up.h) <= 2, `equal and opposite values are equal bars ${JSON.stringify(data)}`);
      } finally { await page.close(); }
    });
  });

  describe(`A2-07: a toast raised in a blurred window (${theme})`, () => {
    test("starts paused: the line and the clock hold until the window is active again", async () => {
      const { page } = await fixturePage(browser, `function Demo(){const api=B.useToast();React.useEffect(()=>{window.api=api},[api]);return null;} createRoot(document.getElementById('root')).render(<B.ToastProvider><Demo/></B.ToastProvider>);`, { theme, clock: true });
      try {
        await page.evaluate(() => { window.dispatchEvent(new Event("blur")); window.api.show({ title: "Saved", home: "page", timeout: 1000 }); });
        await page.clock.runFor(32);
        const away = await page.evaluate(() => ({ attribute: document.querySelector(".basalt-toast-viewport")?.hasAttribute("data-away"), line: getComputedStyle(document.querySelector(".basalt-toast-drain")).animationPlayState }));
        assert.equal(away.attribute, true);
        assert.equal(away.line, "paused");
        await page.clock.runFor(3000);
        assert.equal(await page.locator(".basalt-toast:not([data-ending-style])").count(), 1, "it is still there after its time, because nobody was looking");
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await page.clock.runFor(100);
        await page.clock.runFor(1500);
        assert.equal(await page.locator(".basalt-toast:not([data-ending-style])").count(), 0, "and it goes once the window is active and its time has run");
      } finally { await page.close(); }
    });
  });

  describe(`A2-09: FramedArt (${theme})`, () => {
    test("a decode that finishes after the source changed does not overwrite the newer image's failure", async () => {
      const { page } = await fixturePage(browser, `window.decodes=[];HTMLImageElement.prototype.decode=function(){return new Promise(resolve=>window.decodes.push(resolve));};const root=createRoot(document.getElementById('root'));window.art=(src)=>flushSync(()=>root.render(<B.FramedArt src={src} alt="A picture" loading="eager"/>));window.art('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"></svg>');`, { theme });
      try {
        await page.waitForFunction(() => window.decodes.length === 1);
        await page.evaluate(() => window.art("data:image/png;base64,broken"));
        await page.waitForFunction(() => document.querySelector(".basalt-framed-frame").dataset.phase === "failed");
        await page.evaluate(() => window.decodes[0]());
        await frames(page);
        const data = await page.evaluate(() => ({ phase: document.querySelector(".basalt-framed-frame").dataset.phase, fallback: !!document.querySelector(".basalt-framed-alt") }));
        assert.deepEqual(data, { phase: "failed", fallback: true });
      } finally { await page.close(); }
    });
  });

  describe(`A2-12: Sparkline (${theme})`, () => {
    test("a paused sparkline holds still when its samples change, and resuming glides on from there", async () => {
      const { page } = await fixturePage(browser, `const root=createRoot(document.getElementById('root'));window.spark=(data,paused=false)=>flushSync(()=>root.render(<B.Sparkline label="Usage" data={data} paused={paused}/>));window.spark([10,20]);`, { theme, clock: true });
      try {
        const points = () => page.locator("polyline").getAttribute("points");
        await page.clock.runFor(32);
        const before = await points();
        await page.evaluate(() => window.spark([20, 10], true));
        await page.clock.runFor(500);
        assert.equal(await points(), before, "paused: the same peak, new samples, the same line");
        assert.equal(await page.locator(".basalt-ticker-text").textContent(), "20", "and the headline keeps the value the held line ends on");
        await page.evaluate(() => window.spark([20, 10], false));
        await page.clock.runFor(60);
        const gliding = await points();
        assert.notEqual(gliding, before, "resumed: it moves");
        await page.clock.runFor(1000);
        assert.equal(await points(), "0.00,2.00 100.00,18.00", "and settles on the new samples");
        // The same data in a fresh array changes nothing and restarts nothing.
        await page.evaluate(() => window.spark([20, 10], false));
        await page.clock.runFor(500);
        assert.equal(await points(), "0.00,2.00 100.00,18.00");
      } finally { await page.close(); }
    });
  });

  describe(`A2-12: Sparkline under reduced motion (${theme})`, () => {
    test("everything snaps, the headline included: it follows the data, not a held value", async () => {
      const { page } = await fixturePage(browser, `const root=createRoot(document.getElementById('root'));window.spark=(data,paused=false)=>flushSync(()=>root.render(<B.Sparkline label="Usage" data={data} paused={paused}/>));window.spark([10,20]);`, { theme, clock: true, reducedMotion: "reduce" });
      try {
        await page.clock.runFor(32);
        await page.evaluate(() => window.spark([20, 10], true));
        await page.clock.runFor(100);
        assert.equal(await page.locator("polyline").getAttribute("points"), "0.00,2.00 100.00,18.00");
        assert.equal(await page.locator(".basalt-ticker-text").textContent(), "10");
      } finally { await page.close(); }
    });
  });

  describe(`A2-13: a filtered popup (${theme})`, () => {
    test("filtering leaves no stale glide plate holding the popup's scroll area open", async () => {
      const { page } = await fixturePage(browser, `createRoot(document.getElementById('root')).render(<B.Combobox aria-label="Pick" options={[{value:'first',label:'First'},...Array.from({length:15},(_,i)=>({value:'x'+i,label:'Option '+i}))]}/>);`, { theme });
      try {
        await page.getByRole("button", { name: "Show options" }).click();
        await settle(page);
        await page.getByRole("option").last().hover();
        await frames(page);
        await page.getByRole("combobox").fill("First");
        await page.waitForFunction(() => document.querySelectorAll("[role=option]").length === 1);
        await frames(page);
        await settle(page);
        const data = await page.locator(".basalt-combobox-popup").evaluate((el) => ({ scrollHeight: el.scrollHeight, rowHeight: el.querySelector("[role=option]").getBoundingClientRect().height }));
        assert.ok(data.scrollHeight <= data.rowHeight + 8, JSON.stringify(data));
      } finally { await page.close(); }
    });
  });
}

describe("A2-08: CodeBlock with a prompt, preloaded on the server, cold on the client", () => {
  for (const prompt of ["$", undefined]) {
    test(`hydrates without a recoverable error${prompt ? " (prompted)" : " (plain)"}`, async () => {
      const B = await import(pathToFileURL(path.join(pkg, "dist/index.js")));
      await B.preloadCodeLanguages(["ts"]);
      const props = { code: "const n: number = 42;\nlet m = n;", language: "ts", copyable: false, ...(prompt ? { prompt } : {}) };
      const html = renderToString(React.createElement(B.CodeBlock, props));
      assert.match(html, /<span style="color:/, "the server sent highlighted markup");
      const page = await browser.newPage();
      try {
        await page.setContent(`<div id="root">${html}</div>`);
        await page.evaluate(() => { window.original = document.querySelector("code"); window.recovered = []; });
        const built = await esbuild.build({
          stdin: { contents: `import * as React from 'react'; import {hydrateRoot} from 'react-dom/client'; import {CodeBlock} from './dist/index.js'; function App(){React.useEffect(()=>{window.hydrated=true},[]);return <CodeBlock {...${JSON.stringify(props)}}/>;} hydrateRoot(document.getElementById('root'), <App/>, {onRecoverableError:e=>window.recovered.push(e.message)});`, resolveDir: pkg, loader: "tsx" },
          bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"development"' },
        });
        await page.addScriptTag({ content: built.outputFiles[0].text });
        await page.waitForFunction(() => window.hydrated === true);
        const data = await page.evaluate(() => ({ sameNode: window.original === document.querySelector("code"), recovered: window.recovered }));
        assert.deepEqual(data, { sameNode: true, recovered: [] });
        // And once its grammar loads on the client, the block is coloured and its text is still the code.
        await page.waitForFunction(() => document.querySelectorAll("code span[style*='color']").length > 0);
        assert.equal(await page.evaluate(() => document.querySelector("code").textContent.replace(/[$\s]/g, "")), props.code.replace(/\s/g, ""));
      } finally { await page.close(); }
    });
  }
});

