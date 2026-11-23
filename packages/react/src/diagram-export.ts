// A diagram to a file (DECISIONS 306, 1.7): `@srasyndicate/basalt/diagram-export`, a module of its own that an app loads on demand and wires to its own
// button. Never imported by the index or by a figure. The file holds the title and source, the drawing as it is laid out now (drawn or stacked) and the
// key, on surface-page with space-4 round it, at rest: every line whole, no mover, no trace. Native SVG only, never foreignObject: boxes are rects, lines
// and marks are the drawing's own SVG and images, and words are SVG text set from the live figure's measured line boxes. Nothing here runs at load.
// The implementation hasn't been reviewed.

/** The theme of the file: the page's (the default), or light or dark. */
export interface DiagramExportOptions {
  theme?: "page" | "light" | "dark";
  /** SVG only: "embed" (the default) writes the faces into the file, so it measures the same anywhere; "name" writes the font stack, for design tools. */
  fonts?: "embed" | "name";
  /** PNG only: device pixels per CSS pixel (default 2). */
  scale?: number;
}

const NS = "http://www.w3.org/2000/svg";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const visible = (c: string) => Boolean(c) && c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The parts of a figure a file holds: its head, its drawing and its key (no control, hint or list). */
function partsOf(fig: HTMLElement): HTMLElement[] {
  const pick = (cls: string) => fig.querySelector<HTMLElement>(`:scope > [class$="-${cls}"], :scope > [class*="-${cls} "]`);
  return ["head", "drawing", "key"].map(pick).filter((el): el is HTMLElement => Boolean(el && el.getClientRects().length));
}

/** A face's file as a data URI, from the page's own @font-face rules; null where it cannot be read. */
async function faceData(family: string): Promise<string | null> {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      if (rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim() !== family) continue;
      const url = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
      if (!url) continue;
      if (url.startsWith("data:")) return url;
      try {
        const blob = await (await fetch(new URL(url, sheet.href ?? location.href))).blob();
        return await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob); });
      } catch { return null; }
    }
  }
  return null;
}

/** Text as SVG text, one element per word, each at its own measured box, so the file is the figure's words where the figure set them. */
function textOf(root: Element, origin: DOMRect, out: string[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent?.trim()) continue;
    if (el.closest("[aria-hidden='true'] .basalt-visually-hidden, .basalt-visually-hidden, .visually-hidden, [class$='-ruler'], [hidden]")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const text = node.textContent;
    const range = document.createRange();
    for (const m of text.matchAll(/\S+/g)) {
      range.setStart(node, m.index!);
      range.setEnd(node, m.index! + m[0].length);
      const r = range.getBoundingClientRect();
      if (!r.width) continue;
      const size = Number.parseFloat(cs.fontSize);
      // The baseline: the line box's top plus the face's ascent, about four fifths of the size for Geist and Geist Mono.
      const y = r.top - origin.top + (r.height - size) / 2 + size * 0.8;
      out.push(`<text x="${r2(r.left - origin.left)}" y="${r2(y)}" font-family="${esc(cs.fontFamily)}" font-size="${size}" font-weight="${cs.fontWeight}" fill="${cs.color}"${cs.textDecorationLine.includes("underline") ? ' text-decoration="underline"' : ""}>${esc(m[0])}</text>`);
    }
  }
}

/** Every box with a fill or an edge as a rect, the drawing's SVG as it is, and the marks as images. */
function boxesOf(root: Element, origin: DOMRect, out: string[]) {
  const all = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of all) {
    if (el instanceof SVGElement) {
      if (el.tagName.toLowerCase() !== "svg" || el.closest("svg") !== el) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const clone = el.cloneNode(true) as SVGSVGElement;
      // Every painted part takes its computed paint, so the file needs no stylesheet.
      const src = [el, ...Array.from(el.querySelectorAll("*"))];
      const dst = [clone, ...Array.from(clone.querySelectorAll("*"))];
      src.forEach((s, k) => {
        const cs = getComputedStyle(s);
        const d = dst[k] as Element;
        for (const p of ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity"]) d.setAttribute(p, cs.getPropertyValue(p));
        d.removeAttribute("class");
        if (cs.display === "none") d.setAttribute("display", "none");
      });
      clone.setAttribute("x", String(r2(r.left - origin.left)));
      clone.setAttribute("y", String(r2(r.top - origin.top)));
      clone.removeAttribute("style");
      out.push(clone.outerHTML);
      continue;
    }
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x = r2(r.left - origin.left), y = r2(r.top - origin.top), w = r2(r.width), h = r2(r.height);
    const radius = Number.parseFloat(cs.borderTopLeftRadius) || 0;
    const fill = visible(cs.backgroundColor) ? cs.backgroundColor : "none";
    const bw = Number.parseFloat(cs.borderTopWidth) || 0;
    const stroke = bw && cs.borderTopStyle !== "none" && visible(cs.borderTopColor) ? cs.borderTopColor : "none";
    if (fill !== "none" || stroke !== "none") {
      const dash = cs.borderTopStyle === "dashed" ? ` stroke-dasharray="4 2"` : "";
      out.push(`<rect x="${x + bw / 2}" y="${y + bw / 2}" width="${Math.max(0, w - bw)}" height="${Math.max(0, h - bw)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${bw || 0}"${dash}/>`);
    }
    // A mark is its owner's file in the export theme's form.
    const image = /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage)?.[1];
    if (image && /-mark$/.test(String(el.getAttribute("class")))) out.push(`<image href="${esc(image)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`);
  }
}

/** The figure's title and summary, for the SVG's own title and desc. */
const titleOf = (fig: HTMLElement) => fig.querySelector("[class$='-title']")?.textContent?.trim() ?? "";
const summaryOf = (fig: HTMLElement) => fig.querySelector("figcaption")?.textContent?.trim() ?? "";
/** The file's name: the title's slug. */
export const exportName = (fig: HTMLElement, ext: string) => `${(titleOf(fig).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "diagram")}.${ext}`;

async function svgText(fig: HTMLElement, options: DiagramExportOptions, embed: boolean): Promise<{ svg: string; w: number; h: number }> {
  const theme = options.theme ?? "page";
  const had = fig.getAttribute("data-theme");
  // A file is at rest: no trace, no pending entrance, no mover. The figure is shown so for the read and put back after.
  const traced = Array.from(fig.querySelectorAll("[data-lit], [data-dim], [data-near]"));
  const marks = traced.map((el) => [el, el.getAttribute("data-lit"), el.getAttribute("data-dim"), el.getAttribute("data-near")] as const);
  traced.forEach((el) => { el.removeAttribute("data-lit"); el.removeAttribute("data-dim"); el.removeAttribute("data-near"); });
  const hidden = Array.from(fig.querySelectorAll<HTMLElement>("[class*='-flow'], [class*='-bead'], [class*='-packet']"));
  hidden.forEach((el) => { el.dataset.exportHidden = el.style.display; el.style.display = "none"; });
  const entrance = fig.getAttribute("data-entrance");
  if (entrance && entrance !== "done") fig.setAttribute("data-entrance", "done");
  if (theme !== "page") fig.setAttribute("data-theme", theme);
  const transitions = fig.style.getPropertyValue("--basalt-export");
  fig.classList.add("basalt-exporting");
  try {
    void fig.offsetWidth;
    const pad = Number.parseFloat(getComputedStyle(fig).getPropertyValue("--basalt-space-4")) || 16;
    const parts = partsOf(fig);
    const rects = parts.map((p) => p.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom));
    const origin = new DOMRect(left - pad, top - pad, 0, 0);
    const w = Math.ceil(right - left + 2 * pad), h = Math.ceil(bottom - top + 2 * pad);
    const ground = getComputedStyle(fig).getPropertyValue("--basalt-surface-page").trim() || getComputedStyle(document.body).backgroundColor;
    const body: string[] = [];
    for (const p of parts) boxesOf(p, origin, body);
    for (const p of parts) textOf(p, origin, body);
    let style = "";
    if (embed) {
      const faces: string[] = [];
      for (const family of ["Geist", "Geist Mono"]) {
        const data = await faceData(family);
        if (data) faces.push(`@font-face{font-family:"${family}";src:url(${data});font-weight:100 900}`);
        else if (process.env.NODE_ENV !== "production") console.warn(`Basalt diagramToSvg: the face "${family}" could not be read, so the file names it`);
      }
      if (faces.length) style = `<style>${faces.join("")}</style>`;
    }
    const svg = `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(titleOf(fig))}</title><desc>${esc(summaryOf(fig))}</desc>${style}<rect width="${w}" height="${h}" fill="${ground}"/>${body.join("")}</svg>`;
    return { svg, w, h };
  } finally {
    fig.classList.remove("basalt-exporting");
    if (transitions) fig.style.setProperty("--basalt-export", transitions);
    if (theme !== "page") { if (had === null) fig.removeAttribute("data-theme"); else fig.setAttribute("data-theme", had); }
    if (entrance && entrance !== "done") fig.setAttribute("data-entrance", entrance);
    hidden.forEach((el) => { el.style.display = el.dataset.exportHidden ?? ""; delete el.dataset.exportHidden; });
    for (const [el, lit, dim, near] of marks) { if (lit !== null) el.setAttribute("data-lit", lit); if (dim !== null) el.setAttribute("data-dim", dim); if (near !== null) el.setAttribute("data-near", near); }
  }
}

declare const process: { env: { NODE_ENV?: string } };

/** The figure as an SVG file: native SVG, its words as text, the faces embedded by default. */
export async function diagramToSvg(figure: HTMLElement, options: DiagramExportOptions = {}): Promise<Blob> {
  const { svg } = await svgText(figure, options, (options.fonts ?? "embed") === "embed");
  return new Blob([svg], { type: "image/svg+xml" });
}

/** The figure as a PNG file, at `scale` (2 by default), always drawn with the faces embedded. */
export async function diagramToPng(figure: HTMLElement, options: DiagramExportOptions = {}): Promise<Blob> {
  const { svg, w, h } = await svgText(figure, options, true);
  const scale = options.scale ?? 2;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("the PNG could not be made"))), "image/png"));
}
