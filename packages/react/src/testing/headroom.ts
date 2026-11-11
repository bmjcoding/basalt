// The headroom check (decision 104): a test helper for a product's own browser tests, and Basalt's. It renders the page's stage at each
// width, in each theme, at 1x and 2x, with the bar's ink hidden, reads every device pixel of the stage's headroom and of each
// `data-quiet` zone, and fails if any pixel crosses `art-quiet-limit` (lighter than it in dark, darker than it in light).
//
// This is development tooling. It is not exported from the package's root and nothing in the components imports it, so an app's bundle
// never contains it: an app imports it from `@srasyndicate/basalt/testing`, in a test. Nothing samples at run time: a cross-origin image
// can't be read from a page, and it would cost every visit. The pixels come from a screenshot, decoded in the page on a canvas, so no
// image library is needed and the page's own browser resolves every colour (including `oklab()` and `oklch()`, which a hand-written
// parser threw on during a theme change).
//
// The types below are structural, so Playwright's `Browser` and `Page` fit without this package naming Playwright.

export type HeadroomTheme = "dark" | "light";

/** The part of a Playwright `Page` the check uses. */
export interface HeadroomPage {
  evaluate(pageFunction: (argument: any) => unknown, argument?: unknown): Promise<any>;
  screenshot(options: { clip: { x: number; y: number; width: number; height: number }; fullPage: boolean; scale: "device"; type: "png"; animations: "disabled" }): Promise<Uint8Array>;
  waitForTimeout?(milliseconds: number): Promise<void>;
}

/** The part of a Playwright `Browser` the check uses. */
export interface HeadroomBrowser {
  newContext(options: { viewport: { width: number; height: number }; deviceScaleFactor: number; colorScheme: HeadroomTheme; reducedMotion: "reduce" }): Promise<{ newPage(): Promise<HeadroomPage>; close(): Promise<void> }>;
}

export interface HeadroomRun {
  theme: HeadroomTheme;
  /** The viewport width in CSS pixels. */
  width: number;
  /** The device scale factor: 1 or 2. */
  scale: number;
}

export interface HeadroomOptions {
  /**
   * Open the product's page in `page`, already sized and in `run.theme`'s colour scheme, and resolve when the stage has rendered. Wait
   * for the art to load (an `<img>`'s `decode()`, or your own readiness signal): the check reads what is painted.
   */
  load: (page: HeadroomPage, run: HeadroomRun) => Promise<void>;
  /** Default `["dark", "light"]`. */
  themes?: HeadroomTheme[];
  /** The widths the art composes for. Default `[390, 1440]`; add the product's own art breakpoints. */
  widths?: number[];
  /** Default `[1, 2]`. A star that is antialiased at 1x can land whole at 2x. */
  scales?: number[];
  /** The viewport height. Default 900. */
  height?: number;
  /** The stage's selector. Default `.basalt-stage`. */
  stage?: string;
  /** Extra selectors to hide while reading (a cookie banner, a chat widget). The site header and the stage's content are always hidden. */
  hide?: string[];
  /** Sets the page's theme after it loads. Default: `data-theme` on the root. A product that themes with a class passes its own. */
  setTheme?: (page: HeadroomPage, theme: HeadroomTheme) => Promise<void>;
  /** Overrides the limit with any CSS colour (`oklab()` and `oklch()` included). Default: the page's own `art-quiet-limit`. */
  limit?: string;
}

export interface HeadroomPixel {
  /** Device pixels from the zone's top-left corner. */
  x: number;
  y: number;
  /** `#rrggbb`. */
  color: string;
}

export interface HeadroomFailure extends HeadroomRun {
  /** `headroom`, or the zone's `data-quiet` value (else `quiet #n`). */
  zone: string;
  /** The zone's size in device pixels, and how many of its pixels cross the limit. */
  pixels: number;
  crossing: number;
  /** The pixel furthest past the limit. */
  worst: HeadroomPixel;
  /** The limit, as `#rrggbb`. */
  limit: string;
}

export interface HeadroomResult {
  ok: boolean;
  /** Runs made: themes × widths × scales. */
  runs: number;
  /** Device pixels read. */
  checked: number;
  failures: HeadroomFailure[];
}

interface ZoneReading {
  zone: string;
  pixels: number;
  crossing: number;
  worst: HeadroomPixel;
  limit: string;
}

const HIDE_ALWAYS = [".basalt-site-header", ".basalt-stage-content"];

/**
 * Reads one page, as it is now: the headroom and each `data-quiet` zone of its stage, in the theme it is in. `checkHeadroom` calls this
 * for each run; call it directly to check a page you have already set up. Resolves the zones that were read, failing or not.
 */
export async function measureHeadroom(page: HeadroomPage, theme: HeadroomTheme, options: Pick<HeadroomOptions, "stage" | "hide" | "limit"> = {}): Promise<ZoneReading[]> {
  const stage = options.stage ?? ".basalt-stage";
  const hide = [...HIDE_ALWAYS, ...(options.hide ?? [])].join(", ");
  // Ink hidden and motion stopped, then the zones' boxes in document pixels.
  const zones = (await page.evaluate(async (input: { stage: string; hide: string }) => {
    const style = document.createElement("style");
    style.setAttribute("data-basalt-headroom-check", "");
    style.textContent = `*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; } ${input.hide} { visibility: hidden !important; }`;
    document.head.append(style);
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const root = document.querySelector(input.stage);
    if (!root) throw new Error(`headroom check: no element matches ${input.stage}`);
    const marker = root.querySelector("[data-basalt-headroom]");
    if (!marker) throw new Error("headroom check: the stage has no headroom marker; render it with Stage");
    const boxes = [{ zone: "headroom", element: marker }, ...[...root.querySelectorAll("[data-quiet]")].map((element, index) => ({ zone: element.getAttribute("data-quiet") || `quiet #${index + 1}`, element }))];
    return boxes.map(({ zone, element }) => {
      const rect = element.getBoundingClientRect();
      // Inward to whole CSS pixels, so a fractional edge never reads a pixel the zone doesn't cover.
      const left = Math.ceil(rect.left + window.scrollX), top = Math.ceil(rect.top + window.scrollY);
      return { zone, x: left, y: top, width: Math.floor(rect.right + window.scrollX) - left, height: Math.floor(rect.bottom + window.scrollY) - top };
    });
  }, { stage, hide })) as Array<{ zone: string; x: number; y: number; width: number; height: number }>;

  const readings: ZoneReading[] = [];
  for (const box of zones) {
    if (box.width <= 0 || box.height <= 0) throw new Error(`headroom check: the ${box.zone} zone is empty (${box.width}×${box.height})`);
    const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height }, fullPage: true, scale: "device", type: "png", animations: "disabled" });
    let binary = "";
    for (let index = 0; index < png.length; index += 0x8000) binary += String.fromCharCode(...png.subarray(index, index + 0x8000));
    // Decoded and compared in the page: its canvas resolves any CSS colour, and no pixel array crosses back.
    const reading = (await page.evaluate(async (input: { png: string; theme: string; stage: string; limit: string | null; zone: string }) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("headroom check: no 2d canvas");
      // The page's own browser resolves the colour, whatever its form (hex, rgb(), oklab(), oklch(), a keyword). A canvas keeps its
      // previous fill when it can't parse a string, so the colour is read over two different starting fills: if they disagree, it isn't one.
      const read = (css: string, start: string) => {
        canvas.width = 1; canvas.height = 1;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = start;
        context.fillStyle = css;
        context.fillRect(0, 0, 1, 1);
        const data = context.getImageData(0, 0, 1, 1).data;
        return [data[0]!, data[1]!, data[2]!, data[3]!] as const;
      };
      const toRgb = (css: string) => {
        const a = read(css, "#000000"), b = read(css, "#ffffff");
        if (a.some((value, index) => value !== b[index]) || a[3] !== 255) throw new Error(`headroom check: can't resolve the colour ${css}`);
        return [a[0], a[1], a[2]] as const;
      };
      const element = document.querySelector(input.stage)!;
      const css = input.limit ?? getComputedStyle(element).getPropertyValue("--basalt-art-quiet-limit").trim();
      if (!css) throw new Error("headroom check: the page has no --basalt-art-quiet-limit; load Basalt's styles");
      const limit = toRgb(css);
      const bytes = Uint8Array.from(atob(input.png), (character) => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      context.drawImage(bitmap, 0, 0);
      const image = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      // WCAG relative luminance of an sRGB colour.
      const channel = (value: number) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const luminance = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      const edge = luminance(limit[0], limit[1], limit[2]);
      const dark = input.theme === "dark";
      const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      let crossing = 0, worstDistance = 0;
      let worst = { x: 0, y: 0, color: hex(limit[0], limit[1], limit[2]) };
      for (let offset = 0; offset < image.length; offset += 4) {
        const l = luminance(image[offset]!, image[offset + 1]!, image[offset + 2]!);
        const past = dark ? l - edge : edge - l;
        if (past > 0) {
          crossing += 1;
          if (past > worstDistance) { worstDistance = past; const index = offset / 4; worst = { x: index % bitmap.width, y: Math.floor(index / bitmap.width), color: hex(image[offset]!, image[offset + 1]!, image[offset + 2]!) }; }
        }
      }
      return { zone: input.zone, pixels: bitmap.width * bitmap.height, crossing, worst, limit: hex(limit[0], limit[1], limit[2]) };
    }, { png: btoa(binary), theme, stage, limit: options.limit ?? null, zone: box.zone })) as ZoneReading;
    readings.push(reading);
  }
  return readings;
}

/**
 * Renders the product's page at each width, in each theme, at each scale, and reads the stage's headroom and `data-quiet` zones. A run
 * whose pixels cross the limit is a failure with its worst pixel. Pass the result to an assertion:
 *
 * ```js
 * const result = await checkHeadroom(browser, { load: async (page) => { await page.goto(url); await page.evaluate(() => document.fonts.ready); } });
 * assert.ok(result.ok, JSON.stringify(result.failures, null, 2));
 * ```
 */
export async function checkHeadroom(browser: HeadroomBrowser, options: HeadroomOptions): Promise<HeadroomResult> {
  const themes = options.themes ?? ["dark", "light"];
  const widths = options.widths ?? [390, 1440];
  const scales = options.scales ?? [1, 2];
  const result: HeadroomResult = { ok: true, runs: 0, checked: 0, failures: [] };
  for (const theme of themes) for (const width of widths) for (const scale of scales) {
    const context = await browser.newContext({ viewport: { width, height: options.height ?? 900 }, deviceScaleFactor: scale, colorScheme: theme, reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      const run = { theme, width, scale };
      await options.load(page, run);
      if (options.setTheme) await options.setTheme(page, theme);
      else await page.evaluate((name) => { document.documentElement.dataset.theme = name as string; }, theme);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const reading of await measureHeadroom(page, theme, options)) {
        result.checked += reading.pixels;
        if (reading.crossing > 0) result.failures.push({ ...run, ...reading });
      }
      result.runs += 1;
    } finally {
      await context.close();
    }
  }
  result.ok = result.failures.length === 0;
  return result;
}
