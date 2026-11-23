// What is done to an owner's file, and nothing else (DECISIONS 292, 2.3): what does not draw is stripped (the XML declaration, comments,
// metadata, title, desc and editor attributes), the view box is set to the artwork's own bounds, and, where the manifest says so, a one-colour
// mark's one fill is swapped for white or black. No path, proportion, opacity or other colour is changed, and no number in a path is rounded.
// Shared by fit.mjs (which works the bounds out once) and generate.mjs (which writes the modules from the recorded bounds).

/** The file with what does not draw taken out. Its drawing is untouched. */
export function strip(svg) {
  let out = svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .replace(/<title[\s\S]*?<\/title>/g, "")
    .replace(/<desc[\s\S]*?<\/desc>/g, "");
  // An id nothing refers to is an editor's (Illustrator's layer names, Sketch's paths); one a clip path or a gradient is found by stays.
  const used = new Set([...out.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]));
  out = out.replace(/\sid="([^"]*)"/g, (all, id) => (used.has(id) ? all : ""));
  // The root's editor attributes: its version, its place, xml:space and Illustrator's enable-background; xlink's namespace where nothing uses it.
  out = out.replace(/<svg\b[^>]*>/, (tag) => {
    let t = tag.replace(/\s(version|x|y|xml:space)="[^"]*"/g, "").replace(/\sstyle="enable-background:[^"]*"/g, "");
    if (!/xlink:/.test(out.replace(tag, ""))) t = t.replace(/\sxmlns:xlink="[^"]*"/, "");
    return t.replace(/\s+>$/, ">");
  });
  // White space between tags draws nothing.
  return out.replace(/>\s+</g, "><").trim();
}

/** The root's view box set to `box` (x, y, width, height), and its width and height to the box's, so its intrinsic size is the artwork's. */
export function fit(svg, box) {
  const [x, y, w, h] = box;
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    const t = tag.replace(/\s(viewBox|width|height)="[^"]*"/g, "");
    return t.replace(/^<svg/, `<svg width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`);
  });
}

/** The one swap of 2.2: every use of the mark's one fill (in an attribute or a style rule, any case) as `to`. */
export function swap(svg, from, to) {
  const hex = from.replace(/^#/, "");
  return svg.replace(new RegExp(`#${hex}\\b`, "gi"), to);
}

/** The drawing as a data URI for a CSS `url("…")`: quotes as single quotes, and the characters a URL cannot carry escaped. */
export function dataUri(svg) {
  return `data:image/svg+xml,${svg.replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/\s+/g, " ")}`;
}
