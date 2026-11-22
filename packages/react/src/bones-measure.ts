// How a drawn shape becomes bones (skeleton-shape, DECISIONS 247, 248, 249b and 258). One walk over the drawing after layout: what is known keeps
// its ink, unknown text lines become bars, unknown controls and marks become boxes. Measured from the drawing, never hand-sized. Plain DOM code,
// called only in the browser, after layout; nothing here runs at import.
//
// What becomes a bone:
//   - a line of unknown text: one rounded bar per line, as long as the words on it, 0.75 of the text's size, centred on the line;
//   - an unknown control with a fill or a border: one bone in its own box and radius (one with neither, a ghost button or a tab: its words);
//   - an unknown mark (an avatar, a status dot) or picture: one bone in its own box and radius. An icon of 24px or less is hidden, its seat kept.
// What stays as drawn: structure (a panel's fill and rim, a divider, a field's frame, a table's header band), and everything known.

/** One bone, in the region's own coordinates. */
export interface Bone {
  x: number;
  y: number;
  w: number;
  h: number;
  r: string;
}

interface Measured extends Bone {
  /** What it stands for: covered by something else on the page (a sticky strip, a panel over the stream), it is not drawn. */
  source?: Element | undefined;
  /** A line of words: its element's own overflow cuts it too (a cell cut by its ellipsis), where a box is cut only by what holds it. */
  text?: boolean;
}

const CONTROL = 'button, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"]:not(input), select, .basalt-badge, [data-bone="box"]';
const MEDIA = "img, svg, video, canvas, picture";
const FIELD = "input, textarea";
// Attributes that differ between two drawings for reasons other than the data: React's ids and what refers to them, layout measured in effects.
// Words for assistive technology only (a label, a title) aren't seen, and a shape is hidden from it: they don't decide what is drawn.
const IGNORED = /^(id|for|style|tabindex|inert|title|aria-(label|labelledby|describedby|controls|owns|activedescendant)|data-bone.*|data-boned.*)$/;
const MARKS = ["data-bone-keep", "data-bone-ink", "data-boned", "data-boned-mark"];

/** A colour that paints: not transparent, and more than 4% opaque. */
function paints(color: string): boolean {
  if (!color || color === "transparent") return false;
  const alpha = /rgba?\([^)]*,\s*([\d.]+)\)$/.exec(color) ?? /\/\s*([\d.]+%?)\)$/.exec(color);
  if (!alpha?.[1]) return true;
  const value = alpha[1];
  return (value.endsWith("%") ? Number.parseFloat(value) / 100 : Number.parseFloat(value)) > 0.04;
}

const meaningful = (node: Node): boolean => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && (node as Text).data.trim() !== "");

function rectOf(node: Node): DOMRect {
  if (node.nodeType !== Node.TEXT_NODE) return (node as Element).getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

/**
 * Compare the drawing with its twin: every node that comes out the same in both, in its words and its place (and, for an element, its own
 * attributes and all it holds), is known. A word whose place depends on something unknown above it (a known heading under a summary of unknown
 * length) is not: shown, it would move when the summary arrived.
 */
function compare(a: Node, b: Node | undefined, same: Set<Node>, origin: { a: DOMRect; b: DOMRect }): boolean {
  if (!b || a.nodeType !== b.nodeType) return false;
  const samePlace = (): boolean => {
    const ra = rectOf(a);
    const rb = rectOf(b);
    return Math.abs(Math.round(ra.left - origin.a.left) - Math.round(rb.left - origin.b.left)) <= 1 && Math.abs(Math.round(ra.top - origin.a.top) - Math.round(rb.top - origin.b.top)) <= 1;
  };
  if (a.nodeType === Node.TEXT_NODE) {
    if ((a as Text).data !== (b as Text).data || !samePlace()) return false;
    same.add(a);
    return true;
  }
  if (a.nodeType !== Node.ELEMENT_NODE) return true;
  const ea = a as Element;
  const eb = b as Element;
  if (ea.tagName !== eb.tagName) return false;
  // An element whose own attributes differ is unknown with all it holds: what it holds may be drawn from them (a status dot's colour comes from
  // its badge's status).
  for (const name of new Set([...ea.getAttributeNames(), ...eb.getAttributeNames()])) {
    if (IGNORED.test(name)) continue;
    if (ea.getAttribute(name) !== eb.getAttribute(name)) return false;
  }
  const ka = [...ea.childNodes].filter(meaningful);
  const kb = [...eb.childNodes].filter(meaningful);
  let all = ka.length === kb.length;
  ka.forEach((kid, index) => {
    if (!compare(kid, kb[index], same, origin)) all = false;
  });
  if (all && ka.length === 0 && !samePlace()) all = false;
  if (all) same.add(ea);
  return all;
}

/**
 * Walk the drawing in `root` (a `.basalt-bones`): mark what is known (`data-bone-keep` for a whole part, `data-bone-ink` for an element's own
 * words), hide what a bone stands for (`data-boned`, `data-boned-mark`), and return the bones. `keep` is a selector of words drawn as they are.
 */
export function measureBones(root: HTMLElement, keep: string): Bone[] {
  for (const element of root.querySelectorAll(MARKS.map((name) => `[${name}]`).join(", "))) for (const name of MARKS) element.removeAttribute(name);
  if (keep) for (const element of root.querySelectorAll(keep)) if (!element.closest(".basalt-bones-twin")) element.setAttribute("data-bone-keep", "");
  // A prefill: compare its drawing with the twin, child by child.
  const same = new Set<Node>();
  const twin = root.querySelector<HTMLElement>(":scope > .basalt-bones-twin");
  const drawn = [...root.childNodes].filter((node) => meaningful(node) && !(node as Element).classList?.contains("basalt-bones-twin") && !(node as Element).classList?.contains("basalt-bones-layer"));
  if (twin) {
    const other = [...twin.childNodes].filter(meaningful);
    // Places are compared from each drawing's first part, not from its box: the twin is a formatting context of its own, so a first child's top margin
    // stays inside it where on the page it collapses through the shape, and every word would be a few pixels lower in the twin.
    const first = drawn[0];
    const twinFirst = other[0];
    const origin = first && twinFirst ? { a: rectOf(first), b: rectOf(twinFirst) } : { a: root.getBoundingClientRect(), b: twin.getBoundingClientRect() };
    drawn.forEach((node, index) => compare(node, other[index], same, origin));
  }
  // In forced colours the unknown drawing is hidden (stand-in words would come back in CanvasText); it is shown for the measure, in this task, so it never paints.
  root.setAttribute("data-bone-measuring", "");
  const origin = root.getBoundingClientRect();
  const bones: Measured[] = [];
  const lines: (Measured & { size: number })[] = [];
  const hide = (element: Element): void => element.setAttribute("data-boned", "");
  // What is known is marked once the walk is done: marked during it, the forced-colours rules would hide what is under it from the walk.
  const marks: [Element, string][] = [];
  const box = (element: Element, radius?: string): void => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    bones.push({ x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height, r: radius ?? getComputedStyle(element).borderRadius, source: element });
    hide(element);
  };
  const text = (node: Text, size: number): void => {
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width < 1) continue;
      const h = Math.round(size * 0.75);
      lines.push({ x: rect.left - origin.left, y: Math.round(rect.top + rect.height / 2 - h / 2 - origin.top), w: rect.width, h, r: "", size, source: node.parentElement ?? undefined, text: true });
    }
  };
  const small = (element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2 && rect.width <= 48 && rect.height <= 48;
  };
  const walk = (element: Element): void => {
    if (element.classList.contains("basalt-bones-layer") || element.classList.contains("basalt-bones-twin") || element.hasAttribute("data-bone-keep")) return;
    // Known (both drawings agree on it and on all it holds): drawn as it is.
    if (element !== root && same.has(element)) return void marks.push([element, "data-bone-keep"]);
    const style = getComputedStyle(element);
    if (style.display === "none" || element.getAttribute("data-bone") === "none") return;
    // A copy kept only for its width (a reserved label, the widest value) is not seen, and is not a bone.
    if (style.visibility === "hidden" || style.opacity === "0") return;
    // Words for a screen reader only (visually hidden: clipped to nothing) are not seen either.
    if ((style.clip !== "auto" && style.clip !== "") || (style.clipPath !== "none" && style.overflow === "hidden")) return;
    if (element.matches(FIELD)) return; // A field keeps its frame and holds nothing.
    if (element.matches(MEDIA)) {
      // An icon in an unknown part is not a bone: its control's words or box say it. It is hidden, and its seat is kept.
      const rect = element.getBoundingClientRect();
      if (element.matches("svg") && rect.width <= 24 && rect.height <= 24) return hide(element);
      return box(element);
    }
    const framed = paints(style.backgroundColor) || (Number.parseFloat(style.borderTopWidth) > 0 && paints(style.borderTopColor));
    // A control with a box is one bone; a control that holds a field (a combobox around its text area) is the field's frame.
    if (element !== root && framed && element.matches(CONTROL) && !element.querySelector(FIELD)) return box(element);
    // A small painted box with something in it (an avatar's disc and its initials, a filled chip) is one bone too.
    if (element !== root && framed && !element.querySelector(FIELD) && small(element)) return box(element);
    // A mark drawn as ::before or ::after (a badge's dot, an unread dot) is hidden; a pseudo-element that draws a line is structure.
    for (const which of ["::before", "::after"] as const) {
      const pseudo = getComputedStyle(element, which);
      if (pseudo.content === "none" || pseudo.content === "normal") continue;
      const w = Number.parseFloat(pseudo.width);
      const h = Number.parseFloat(pseudo.height);
      if (w > 2 && h > 2 && w <= 16 && h <= 16) element.setAttribute("data-boned-mark", which === "::before" ? "before" : "after");
    }
    // Its own words: all known, they keep their ink; any unknown, they are bones together (a line can't be part ink, part bone).
    const own = [...element.childNodes].filter((kid): kid is Text => kid.nodeType === Node.TEXT_NODE && (kid as Text).data.trim() !== "");
    if (own.length > 0 && own.every((kid) => same.has(kid))) marks.push([element, "data-bone-ink"]);
    else for (const kid of own) text(kid, Number.parseFloat(style.fontSize));
    let hasContent = own.length > 0;
    for (const kid of element.children) {
      hasContent = true;
      walk(kid);
    }
    // A mark: an empty element painted with a colour, by its fill or its border (a status dot, an avatar's disc). A hairline is structure.
    if (!hasContent && framed && small(element)) box(element);
  };
  walk(root);
  for (const [element, name] of marks) element.setAttribute(name, "");
  // One bar per line: runs on the same line with less than half a letter's width between them are one line of words.
  lines.sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: (Measured & { size: number })[] = [];
  for (const line of lines) {
    const last = merged.at(-1);
    if (last && Math.abs(last.y - line.y) <= 2 && line.x - (last.x + last.w) <= line.size * 0.5 && line.x >= last.x) {
      last.w = Math.max(last.w, line.x + line.w - last.x);
      continue;
    }
    merged.push({ ...line, r: "var(--basalt-radius-sm)" });
  }
  // What a clipping box hides is not drawn: a bone is cut to every box between it and the region that clips (a table that scrolls sideways, a panel
  // that hides its overflow), and goes where nothing of it is left. The bones' layer is over the whole region, so nothing else would cut it.
  const clips = new Map<Element, DOMRect | null>();
  const clipOf = (element: Element): DOMRect | null => {
    if (clips.has(element)) return clips.get(element)!;
    const style = getComputedStyle(element);
    let rect: DOMRect | null = null;
    if (style.overflowX !== "visible" || style.overflowY !== "visible") {
      const box = element.getBoundingClientRect();
      const el = element as HTMLElement;
      rect = new DOMRect(box.left + el.clientLeft, box.top + el.clientTop, el.clientWidth || box.width, el.clientHeight || box.height);
    }
    clips.set(element, rect);
    return rect;
  };
  const clipped = (bone: Measured): Measured | null => {
    let left = origin.left + bone.x;
    let top = origin.top + bone.y;
    let right = left + bone.w;
    let bottom = top + bone.h;
    for (let at = (bone.text ? bone.source : bone.source?.parentElement) ?? null; at && at !== root && root.contains(at); at = at.parentElement) {
      const clip = clipOf(at);
      if (!clip) continue;
      left = Math.max(left, clip.left);
      top = Math.max(top, clip.top);
      right = Math.min(right, clip.right);
      bottom = Math.min(bottom, clip.bottom);
    }
    if (right - left < 1 || bottom - top < 1) return null;
    return { ...bone, x: left - origin.left, y: top - origin.top, w: right - left, h: bottom - top };
  };
  const all: Measured[] = [...bones, ...merged.map(({ x, y, w, h, r, source }) => ({ x: Math.round(x), y, w: Math.round(w), h, r, source, text: true }))]
    .map(clipped)
    .filter((bone): bone is Measured => bone !== null);
  // What is covered is not drawn: hit-test each bone's middle with the shape briefly hit-testable (in this task, so it never paints).
  const wasInert = root.inert;
  root.inert = false;
  const layer = root.querySelector<HTMLElement>(":scope > .basalt-bones-layer");
  const seen = all.filter((bone) => {
    if (!bone.source) return true;
    const cx = origin.left + bone.x + bone.w / 2;
    const cy = origin.top + bone.y + bone.h / 2;
    if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return true;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || hit === layer || layer?.contains(hit)) return true;
    return bone.source.contains(hit) || hit.contains(bone.source);
  });
  root.inert = wasInert;
  root.removeAttribute("data-bone-measuring");
  return seen.map(({ x, y, w, h, r }) => ({ x, y, w, h, r }));
}
