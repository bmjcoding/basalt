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
        const res = await fetch(new URL(url, sheet.href ?? location.href));
        // A face that is not there (a 404's page) is not embedded: the file names the face instead.
        if (!res.ok) return null;
        const blob = await res.blob();
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

/** A rule drawn by a ::before or ::after (a lane's rule, a band's, a frame's else rule): its box from its own computed place, as a line or a rect. */
function pseudoOf(el: Element, origin: DOMRect, out: string[]) {
  // The structural rules only: a linked card's arrow (its name's ::after) is not drawn in a file (1.7, the decider's text edit).
  if (!/-(lane|band|felse)(\s|$)/.test(` ${el.getAttribute("class") ?? ""}`)) return;
  for (const which of ["::before", "::after"] as const) {
    const cs = getComputedStyle(el, which);
    if (!cs.content || cs.content === "none" || cs.content === "normal" || cs.display === "none") continue;
    if (cs.position !== "absolute") continue;
    const host = el.getBoundingClientRect(), hs = getComputedStyle(el);
    const x = host.left + (Number.parseFloat(hs.borderLeftWidth) || 0) + (Number.parseFloat(cs.left) || 0) - origin.left;
    const y = host.top + (Number.parseFloat(hs.borderTopWidth) || 0) + (Number.parseFloat(cs.top) || 0) - origin.top;
    const w = Number.parseFloat(cs.width) || 0, h = Number.parseFloat(cs.height) || 0;
    const bt = Number.parseFloat(cs.borderTopWidth) || 0;
    // A dashed rule is drawn as its mask draws it: on and off at the rule's own height times its dash.
    const dashed = cs.maskImage && cs.maskImage !== "none" ? ` stroke-dasharray="${Number.parseFloat(cs.maskSize) / 2 || 4} ${Number.parseFloat(cs.maskSize) / 2 || 4}"` : "";
    if (visible(cs.backgroundColor) && w && h) out.push(`<line x1="${r2(x)}" y1="${r2(y + h / 2)}" x2="${r2(x + w)}" y2="${r2(y + h / 2)}" stroke="${cs.backgroundColor}" stroke-width="${r2(h)}"${dashed}/>`);
    else if (bt && visible(cs.borderTopColor)) out.push(`<line x1="${r2(x)}" y1="${r2(y + bt / 2)}" x2="${r2(x + w + (Number.parseFloat(cs.borderLeftWidth) || 0) + (Number.parseFloat(cs.borderRightWidth) || 0))}" y2="${r2(y + bt / 2)}" stroke="${cs.borderTopColor}" stroke-width="${bt}"${cs.borderTopStyle === "dashed" ? ' stroke-dasharray="4 4"' : ""}/>`);
  }
}

/** An SVG of the figure as it is drawn: every painted part with its computed paint, sized and placed, and no motion's mask left on it. */
function svgOf(el: SVGSVGElement, origin: DOMRect, out: string[]) {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  if (el.getAttribute("class")?.endsWith("-motion-defs")) return;
  const clone = el.cloneNode(true) as SVGSVGElement;
  const src = [el, ...Array.from(el.querySelectorAll("*"))];
  const dst = [clone, ...Array.from(clone.querySelectorAll("*"))];
  // A viewBox drawn at another size (the flowchart's diamond): its strokes keep their width.
  const vb = el.viewBox?.baseVal;
  const stretched = Boolean(vb && vb.width && (Math.abs(vb.width - r.width) > 0.5 || Math.abs(vb.height - r.height) > 0.5));
  src.forEach((s, k) => {
    const cs = getComputedStyle(s);
    const d = dst[k] as Element;
    for (const p of ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity"]) d.setAttribute(p, cs.getPropertyValue(p));
    d.removeAttribute("class");
    // An entrance's reveal is its own mask: a file is at rest, every line whole.
    if (/-reveal-/.test(d.getAttribute("mask") ?? "")) d.removeAttribute("mask");
    if (stretched && k > 0) d.setAttribute("vector-effect", "non-scaling-stroke");
    if (cs.display === "none") d.setAttribute("display", "none");
  });
  clone.setAttribute("x", String(r2(r.left - origin.left)));
  clone.setAttribute("y", String(r2(r.top - origin.top)));
  clone.setAttribute("width", String(r2(r.width)));
  clone.setAttribute("height", String(r2(r.height)));
  clone.removeAttribute("style");
  out.push(clone.outerHTML);
}

/**
 * Every box with a fill or an edge as a rect, the drawing's SVG as it is, the rules drawn by pseudo-elements, and the marks as images. The drawing's
 * lines go first, under its cards and plates, as the page paints them (the ink is behind the nodes).
 */
function boxesOf(root: Element, origin: DOMRect, out: string[]) {
  const all = [root, ...Array.from(root.querySelectorAll("*"))];
  const inks = all.filter((el): el is SVGSVGElement => el instanceof SVGSVGElement && el.closest("svg") === el && Boolean(el.closest("[class$='-ink']")));
  for (const svg of inks) svgOf(svg, origin, out);
  for (const el of all) {
    if (el instanceof SVGElement) {
      if (el.tagName.toLowerCase() !== "svg" || el.closest("svg") !== el || inks.includes(el as SVGSVGElement)) continue;
      svgOf(el as SVGSVGElement, origin, out);
      continue;
    }
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x = r2(r.left - origin.left), y = r2(r.top - origin.top), w = r2(r.width), h = r2(r.height);
    const radius = Number.parseFloat(cs.borderTopLeftRadius) || 0;
    const fill = visible(cs.backgroundColor) ? cs.backgroundColor : "none";
    const sidesW = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map((v) => Number.parseFloat(v) || 0);
    const uniform = sidesW.every((v) => v === sidesW[0]);
    // An edge on some sides only (the key's divider) is drawn as those lines, not a box.
    if (!uniform) {
      const [t, r, b, l] = sidesW;
      const edge = (on: number, color: string, x1: number, y1: number, x2: number, y2: number) => { if (on && visible(color)) out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${on}"/>`); };
      edge(t!, cs.borderTopColor, x, y + t! / 2, x + w, y + t! / 2);
      edge(b!, cs.borderBottomColor, x, y + h - b! / 2, x + w, y + h - b! / 2);
      edge(l!, cs.borderLeftColor, x + l! / 2, y, x + l! / 2, y + h);
      edge(r!, cs.borderRightColor, x + w - r! / 2, y, x + w - r! / 2, y + h);
    }
    const bw = uniform ? sidesW[0]! : 0;
    // A panel's rim is the sides' colour with its top lit (Neon's P8 of the code review): the box in the sides' colour, then the top edge in its own.
    const sideColor = cs.borderLeftColor;
    const stroke = bw && cs.borderTopStyle !== "none" && visible(sideColor) ? sideColor : "none";
    if (fill !== "none" || stroke !== "none") {
      const dash = cs.borderTopStyle === "dashed" ? ` stroke-dasharray="4 2"` : "";
      out.push(`<rect x="${x + bw / 2}" y="${y + bw / 2}" width="${Math.max(0, w - bw)}" height="${Math.max(0, h - bw)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${bw || 0}"${dash}/>`);
      if (stroke !== "none" && !dash && cs.borderTopColor !== sideColor && visible(cs.borderTopColor)) out.push(`<line x1="${r2(x + radius)}" y1="${r2(y + bw / 2)}" x2="${r2(x + w - radius)}" y2="${r2(y + bw / 2)}" stroke="${cs.borderTopColor}" stroke-width="${bw}"/>`);
    }
    pseudoOf(el, origin, out);
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

async function svgText(fig: HTMLElement, options: DiagramExportOptions, embed: boolean, who: string): Promise<{ svg: string; w: number; h: number }> {
  const theme = options.theme ?? "page";
  const had = fig.getAttribute("data-theme");
  // A file is at rest: no trace, no pending or running entrance, no mover, no quiet run (Neon's B5 of the code review). The figure is shown so for the read
  // and put back at once, before anything waits.
  const states = ["data-lit", "data-dim", "data-near", "data-ahead", "data-arrival", "data-arrival-out"];
  const marked = Array.from(fig.querySelectorAll(states.map((a) => `[${a}]`).join(", ")));
  const marks = marked.map((el) => [el, states.map((a) => el.getAttribute(a))] as const);
  marked.forEach((el) => { for (const a of states) el.removeAttribute(a); });
  const hidden = Array.from(fig.querySelectorAll<HTMLElement>("[class*='-flow'], [class*='-bead'], [class*='-packet']"));
  hidden.forEach((el) => { el.dataset.exportHidden = el.style.display; el.style.display = "none"; });
  const entrance = fig.getAttribute("data-entrance");
  if (entrance && entrance !== "done") fig.setAttribute("data-entrance", "done");
  // An entrance's or a run's colour animations are read at their end, and put back where they were.
  const anims = fig.getAnimations({ subtree: true }).map((a) => ({ a, at: a.currentTime, running: a.playState === "running" }));
  for (const { a } of anims) { const end = a.effect?.getComputedTiming().endTime; a.pause(); if (typeof end === "number" && Number.isFinite(end)) a.currentTime = end; }
  // The viewer's figure (the skill's 9.11): its head and key, which the stage hides, are in the file, and it is read at 100% whatever the zoom.
  const viewer = fig.getAttribute("data-viewer");
  if (viewer !== null) fig.removeAttribute("data-viewer");
  const scaled: Array<[HTMLElement, string]> = [];
  for (let el = fig.parentElement; el; el = el.parentElement) {
    const t = getComputedStyle(el).transform;
    const m = /^matrix\(([^,]+),[^,]+,[^,]+,([^,]+),/.exec(t);
    if (m && (Math.abs(Number(m[1]) - 1) > 1e-6 || Math.abs(Number(m[2]) - 1) > 1e-6)) { scaled.push([el, el.style.transform]); el.style.transform = "none"; }
  }
  // The viewer's drawing with its list open (the foot decision, 2.2): its sizer is hidden, so it is shown for the read and hidden again before anything
  // waits, with no paint between.
  const sizer = fig.closest<HTMLElement>(".basalt-diagram-sizer, .diagram-sizer");
  const unhid = sizer?.hidden ? sizer : null;
  if (unhid) unhid.hidden = false;
  if (theme !== "page") fig.setAttribute("data-theme", theme);
  fig.classList.add("basalt-exporting");
  let read: { body: string[]; w: number; h: number; ground: string };
  try {
    void fig.offsetWidth;
    const pad = Number.parseFloat(getComputedStyle(fig).getPropertyValue("--basalt-space-4")) || 16;
    const parts = partsOf(fig);
    // A figure with no box (it or a parent is display: none, an app's closed tab) cannot be measured: no file, never a broken one.
    if (!fig.getClientRects().length || !parts.length) throw new Error(`Basalt ${who}: the figure is not displayed (it or a parent is display: none), so it cannot be measured and no file is made`);
    const rects = parts.map((p) => p.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left)), top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right)), bottom = Math.max(...rects.map((r) => r.bottom));
    const origin = new DOMRect(left - pad, top - pad, 0, 0);
    const w = Math.ceil(right - left + 2 * pad), h = Math.ceil(bottom - top + 2 * pad);
    const ground = getComputedStyle(fig).getPropertyValue("--basalt-surface-page").trim() || getComputedStyle(document.body).backgroundColor;
    const body: string[] = [];
    for (const p of parts) boxesOf(p, origin, body);
    for (const p of parts) textOf(p, origin, body);
    read = { body, w, h, ground };
  } finally {
    fig.classList.remove("basalt-exporting");
    if (unhid) unhid.hidden = true;
    if (theme !== "page") { if (had === null) fig.removeAttribute("data-theme"); else fig.setAttribute("data-theme", had); }
    for (const [el, t] of scaled) el.style.transform = t;
    if (viewer !== null) fig.setAttribute("data-viewer", viewer);
    for (const { a, at, running } of anims) { a.currentTime = at; if (running) a.play(); }
    if (entrance && entrance !== "done") fig.setAttribute("data-entrance", entrance);
    hidden.forEach((el) => { el.style.display = el.dataset.exportHidden ?? ""; delete el.dataset.exportHidden; });
    for (const [el, values] of marks) states.forEach((a, k) => { const v = values[k]; if (v !== null && v !== undefined) el.setAttribute(a, v); });
  }
  const { body, w, h, ground } = read;
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
}

declare const process: { env: { NODE_ENV?: string } };

/** The figure as an SVG file: native SVG, its words as text, the faces embedded by default. A figure that is not displayed rejects, and no file is made. */
export async function diagramToSvg(figure: HTMLElement, options: DiagramExportOptions = {}): Promise<Blob> {
  const { svg } = await svgText(figure, options, (options.fonts ?? "embed") === "embed", "diagramToSvg");
  return new Blob([svg], { type: "image/svg+xml" });
}

/**
 * The SVG as something a canvas draws. First `createImageBitmap` from the SVG as a Blob, which needs no URL and so no `img-src`, where the browser decodes
 * SVG that way; then an image from a `blob:` URL, then from a `data:` URL. Under a content policy that allows neither in `img-src` there is no way left,
 * and the error says so: never a broken or empty file.
 */
async function drawable(svg: string): Promise<{ source: CanvasImageSource; done: () => void }> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, done: () => bitmap.close() };
    } catch { /* this browser decodes no SVG Blob: an image next */ }
  }
  const urls: Array<() => string> = [() => URL.createObjectURL(blob), () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`];
  for (const make of urls) {
    const url = make();
    const done = () => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); };
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
      return { source: img, done };
    } catch { done(); }
  }
  throw new Error("Basalt diagramToPng: the PNG could not be drawn. A canvas draws the figure's SVG through an image, and this page refused it both as a blob: URL and as a data: URL: a content policy allows them with `img-src 'self' blob:` (or `data:`). diagramToSvg needs neither");
}

/**
 * The figure as a PNG file, at `scale` (2 by default), always drawn with the faces embedded.
 *
 * A canvas draws SVG only through an image: under a `Content-Security-Policy`, `img-src` must allow `blob:` or `data:` (where the browser decodes an SVG
 * Blob with `createImageBitmap`, neither is needed). Where the page allows neither, the promise rejects with an error that says so, and no file is made.
 * A figure that is not displayed rejects too, and no file is made.
 */
export async function diagramToPng(figure: HTMLElement, options: DiagramExportOptions = {}): Promise<Blob> {
  const { svg, w, h } = await svgText(figure, options, true, "diagramToPng");
  const scale = options.scale ?? 2;
  const { source, done } = await drawable(svg);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(source, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Basalt diagramToPng: the PNG could not be made"))), "image/png"));
  } finally {
    done();
  }
}
