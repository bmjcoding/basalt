// Builds one standalone Basalt page from a body fragment.
//
//   node .agent/skills/basalt-html/compose.mjs <body.html> [--out <page.html>] [--no-fonts] [--lang <code>] [--all]
//   node .agent/skills/basalt-html/compose.mjs --usage [NAME ...]
//
// The body is the part of the page you write: HTML for inside <body>, which may also carry
//   <title>…</title>                          the page title (default: the first <h1>, else "Untitled page")
//   <style>…</style>                          your own CSS (moved into the head, after Basalt's)
//   <meta name="description"|property="og:…"|name="twitter:…" content>, <link rel="icon"|"apple-touch-icon" href="data:…">, <link rel="canonical" href>
//                                             the page's description, share card and icon (moved into the head, after the title; any other meta or link is refused)
//   <!-- basalt:use palette tabs -->          names of modules to add by hand (a class built only at run time)
//   <script type="application/json" data-palette>{ "groups": [...] }</script>   palette items with no code
//   <script>… Basalt.init({ palette: … }) …</script>   your own init call, for items that run code
// compose.mjs wraps it in the doctype, meta and theme bootstrap, adds Geist (inlined, unless --no-fonts), the core CSS and
// script and only the modules the body uses, the icons it names, and `Basalt.init()` unless the body already calls it.
// A comment, script, style, svg or template that is never closed is refused. A style, title, meta or link inside an svg or a template is left where it is.
// The output is the same for the same input. It reads only the files beside it (parts/ and SKILL.md) and writes only --out.
// --all adds every module and every icon (for a page that builds markup at run time, and for measuring). No dependencies.
// After the page, it prints the one-line warning of each module it added (the module's line in SKILL.md's index), to stdout; a module
// the body never uses itself, which is in only because another module's script builds it, says so instead.
// --usage core NAME ... prints each one's usage text, the usage of each module it requires (unless its script builds that module's markup
// itself: then one line says so), and for each the classes, attributes and tags that bring it in (read from the manifest, the same
// file detection reads); NAME is `core` or a module. --usage alone prints SKILL.md's index
// of modules; an unknown name prints it too and exits 1. --usage reads no body and writes no page.
//
// Source: tools/html-skill/src/compose.mjs (do not edit the copy in the skill folder).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Sets the theme before first paint: the stored choice, else the system's; and a hardware key already seen this session.
const THEME_INIT = `(function(){var t;try{t=localStorage.getItem("basalt-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);try{if(sessionStorage.getItem("basalt-keyboard")==="hardware")document.documentElement.setAttribute("data-keyboard","hardware")}catch(e){}})();`;

// A page with the loops module sets a stored hold before first paint (React's loopsBootstrap), beside the theme's line.
const LOOPS_INIT = `(function(){try{if(localStorage.getItem("basalt-loops")==="held")document.documentElement.setAttribute("data-loops","held")}catch(e){}})();`;

const read = (dir, name) => fs.readFileSync(path.join(dir, name), "utf8");
const exists = (dir, name) => fs.existsSync(path.join(dir, name));
// A script inside a page can't contain a closing tag or a comment opener.
const inlineScript = (code) => code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3c!--");
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A character the text doesn't contain, to mark a placeholder with (so a body that holds the usual one can't be misread). */
function unusedMark(text) {
  for (let c = 0xe000; c <= 0xf8ff; c++) if (!text.includes(String.fromCharCode(c))) return String.fromCharCode(c);
  throw new Error("the input holds every private-use character, so compose.mjs has none to mark its places with");
}

const isSpace = (c) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f"; // HTML's white space: not JavaScript's \s, which also takes a no-break space
const isAlpha = (c) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
// Elements whose content is text, not markup, in HTML: raw text (nothing ends it but its own end tag), and escapable raw text (character references work).
// `noscript` is raw text for a browser that runs scripts, which is the page's reader.
const RAW_TEXT = new Set(["style", "xmp", "iframe", "noembed", "noframes", "noscript"]);
const RCDATA = new Set(["title", "textarea"]);
// The HTML standard's list of HTML integration points in foreign content (13.2.6.5, "The rules for parsing tokens in foreign content"): an svg `foreignObject`, `desc`
// and `title`, and a MathML `annotation-xml` whose `encoding` is `text/html` or `application/xhtml+xml`. Their children are read as HTML. The standard's MathML text
// integration points (`mi`, `mo`, `mn`, `ms`, `mtext`) take HTML children too.
const SVG_HTML_POINTS = new Set(["foreignobject", "desc", "title"]);
const MATH_TEXT_POINTS = new Set(["mi", "mo", "mn", "ms", "mtext"]);
/**
 * The tag that starts at `i` (`<` then a letter, or `</` then a letter), read as a browser reads it: a name, then attributes whose quoted values may hold `>`.
 * Returns { name (lower case), end (after the `>`), close, selfClosing, attrs: [[name, value]], terminated }. A tag that the end of the text cuts off is not
 * terminated: the browser would take what follows it, the composer's own script included, for the rest of the tag.
 */
function readTag(s, i) {
  const n = s.length;
  const close = s[i + 1] === "/";
  let j = i + (close ? 2 : 1);
  const nameStart = j;
  while (j < n && !isSpace(s[j]) && s[j] !== "/" && s[j] !== ">") j++;
  const name = s.slice(nameStart, j).toLowerCase();
  const attrs = [];
  let selfClosing = false;
  while (j < n) {
    const c = s[j];
    if (c === ">") return { name, end: j + 1, close, selfClosing, attrs, terminated: true };
    if (c === "/") { selfClosing = s[j + 1] === ">"; j++; continue; }
    if (isSpace(c)) { j++; continue; }
    selfClosing = false;
    const attrStart = j;
    j++; // the first character of an attribute name may be anything, `=` included
    while (j < n && !isSpace(s[j]) && s[j] !== "/" && s[j] !== ">" && s[j] !== "=") j++;
    const attrName = s.slice(attrStart, j).toLowerCase();
    let m = j;
    while (m < n && isSpace(s[m])) m++;
    if (s[m] !== "=") { attrs.push([attrName, ""]); continue; }
    m++;
    while (m < n && isSpace(s[m])) m++;
    if (s[m] === '"' || s[m] === "'") {
      const e = s.indexOf(s[m], m + 1);
      attrs.push([attrName, s.slice(m + 1, e === -1 ? n : e)]);
      if (e === -1) return { name, end: n, close, selfClosing, attrs, terminated: false };
      j = e + 1;
    } else {
      const vStart = m;
      while (m < n && !isSpace(s[m]) && s[m] !== ">") m++;
      attrs.push([attrName, s.slice(vStart, m)]);
      j = m;
    }
  }
  return { name, end: n, close, selfClosing, attrs, terminated: false };
}

/** Where a `script` whose content starts at `from` ends (the index of its `</script`), by the browser's rules, which include the escaped states after `<!--`; -1 when it never does. */
function scriptEnd(s, from) {
  const re = /<!--|-->|<(\/?)script(?=[\t\n\f\r />])/gi;
  re.lastIndex = from;
  let state = "data";
  for (let m; (m = re.exec(s)); ) {
    if (m[0] === "<!--") {
      if (state === "data") { state = "escaped"; re.lastIndex = m.index + 2; } // `<!-->` ends at once: its `-->` starts two in
    } else if (m[0] === "-->") state = "data";
    else if (m[1]) { if (state === "doubleEscaped") state = "escaped"; else return m.index; }
    else if (state === "escaped") state = "doubleEscaped";
  }
  return -1;
}

/** Where the raw or escapable raw text of `name` that starts at `from` ends (the index of its end tag), or -1. */
function textEnd(s, name, from) {
  const re = new RegExp(`</${name}(?=[\\t\\n\\f\\r />])`, "gi");
  re.lastIndex = from;
  const m = re.exec(s);
  return m ? m.index : -1;
}

// The HTML standard's list of start tags that break out of foreign content (13.2.6.5, "The rules for parsing tokens in foreign content"), copied from it: one of these inside
// svg or math, outside an HTML integration point, is not part of the svg: the browser closes the svg or math and reads it as HTML. `font` does so with a color, face or size.
// compose.mjs does not follow that; it refuses the body and says what to write. An end tag `br` or `p` does the same.
const FOREIGN_BREAKOUT = new Set(["b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed", "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "menu", "meta", "nobr", "ol", "p", "pre", "ruby", "s", "small", "span", "strong", "strike", "sub", "sup", "table", "tt", "u", "ul", "var"]);
const breaksOut = (name, attrs) => FOREIGN_BREAKOUT.has(name) || (name === "font" && attrs.some((a) => a[0] === "color" || a[0] === "face" || a[0] === "size"));
// The script types a browser runs as JavaScript (HTML standard, "JavaScript MIME type"), and `module`; no type, or an empty one, is JavaScript too.
const JS_TYPE = /^(?:|module|application\/(?:x-)?(?:ecma|java)script|text\/(?:x-)?(?:ecma|java)script(?:1\.[0-5])?|text\/(?:jscript|livescript))$/;

/**
 * The body read as a browser reads it, token by token: tags with their quoted attribute values, comments, CDATA in svg and math, and the raw and escapable raw text
 * of `script`, `style`, `title`, `textarea` and the like, at every depth. Every comment, script, style, title, textarea, noscript, svg, math and template at the top of
 * the body, and each top-level `meta` and `link`, is replaced by a placeholder, so no later pass looks inside it. restore() puts them back (with `bare`, without the
 * comments, which is what detection reads); saved[i] is { kind, text, inner, attrs, comments }. `whole` says the body holds a doctype or an html, head or body tag.
 * `h1` is the text of the first top-level h1 (null when there is none or it never closes). Throws for anything that is never closed or that the end of the text cuts
 * off, since it would swallow the rest of the page, the composer's own script and closing tags included, and for what it will not model: foreign-content breakout, an
 * `annotation-xml` encoding containing an ampersand, `mglyph` and `malignmark` in a MathML text point, `plaintext`. `stats.frameVisits` counts the stack frames looked at.
 */
export function readBody(body, stats = {}) {
  const mark = unusedMark(body);
  const saved = [];
  const scripts = []; // executable HTML locations, including integration points, excluding inert templates
  const n = body.length;
  const stack = []; // open svg, math and template elements, and what is inside them: { name, kind: "template" | "foreign" | "html", ns, text }
  let templates = 0;
  stats.frameVisits = 0;
  let out = "";
  let at = 0;
  let from = 0;
  let fromName = "";
  let whole = false;
  let cursor = 0; // the end of the last token: the text after it, to the next, is text
  let h1 = null; // { text, open } for the first top-level h1
  const comments = []; // [start, end] of every comment at any depth, not yet held
  const never = (what) => new Error(`${what} is never closed: it has no end, and it would swallow the rest of the page`);
  const cutOff = (what) => new Error(`${what} is cut off by the end of the body: it has no \`>\`, and it would take the rest of the page, compose.mjs's own script included, for its text`);
  const hold = (kind, start, end, inner = null, attrs = null) => {
    const inside = comments.filter((c) => c[0] >= start && c[1] <= end);
    for (const c of inside) comments.splice(comments.indexOf(c), 1);
    out += body.slice(at, start) + `${mark}${saved.push({ kind, text: body.slice(start, end), inner, attrs, comments: inside.map((c) => [c[0] - start, c[1] - start]) }) - 1}${mark}`;
    at = end;
  };
  const foreign = () => stack.length > 0 && stack[stack.length - 1].kind === "foreign";
  /** The tag at `i`, which must end. */
  const tagAt = (i) => {
    const tag = readTag(body, i);
    if (!tag.terminated) throw cutOff(`a tag (\`${body.slice(i, i + 24).replace(/\s+/g, " ")}…\`)`);
    if (!tag.close) for (const [name, value] of tag.attrs) {
      if (/^on/.test(name) && /\bBasalt\s*\??\.\s*init\s*\(/.test(stripJsComments(value, true))) throw new Error(`\`<${tag.name}>\` calls Basalt.init() in \`${name}\`: write the init call in an inline HTML script, not an event handler`);
    }
    return tag;
  };
  let i = 0;
  while ((i = body.indexOf("<", i)) !== -1) {
    if (h1?.open && !stack.length) h1.text += body.slice(cursor, i);
    const next = body[i + 1];
    if (body.startsWith("<!--", i)) {
      // Recoverable comment errors have different token boundaries: refuse them rather than swallowing their tail.
      const ending = /--!?>/.exec(body.slice(i + 4));
      if (body[i + 4] === '>' || body.slice(i + 4, i + 6) === '->' || ending?.[0] === '--!>') throw new Error("a comment has a nonstandard ending: write <!-- text -->");
      const e = ending ? i + 4 + ending.index : -1;
      if (e === -1) throw never("a comment");
      comments.push([i, e + 3]);
      if (!stack.length) hold("comment", i, e + 3);
      i = cursor = e + 3;
    } else if (next === "!" || next === "?") {
      if (body.startsWith("<![CDATA[", i) && foreign()) {
        const e = body.indexOf("]]>", i + 9);
        if (e === -1) throw never("a CDATA section");
        i = cursor = e + 3;
      } else {
        if (!stack.length && /^<!doctype/i.test(body.slice(i, i + 9))) whole = true;
        const e = body.indexOf(">", i);
        if (e === -1) throw cutOff("a declaration (`<!` or `<?`)");
        i = cursor = e + 1; // a bogus comment
      }
    } else if (next === "/" && isAlpha(body[i + 2] ?? "")) {
      const tag = tagAt(i);
      if (foreign() && (tag.name === "br" || tag.name === "p")) throw breakout(tag.name, stack[stack.length - 1].ns);
      // The element it closes: the top frame first, and only when that is not it, down the stack.
      let hit = -1;
      for (let k = stack.length - 1; k >= 0; k--) {
        stats.frameVisits++;
        if (stack[k].name === tag.name) { hit = k; break; }
      }
      if (foreign() && (hit === -1 || stack[hit].ns === "template")) throw new Error(`\`</${tag.name}>\` inside \`<${stack[stack.length - 1].ns}>\` may leave foreign content: close the foreign elements before this HTML end tag`);
      if (hit !== -1) {
        for (let k = hit; k < stack.length; k++) if (stack[k].kind === "template") templates--;
        stack.length = hit;
        if (!stack.length) hold(fromName, from, tag.end);
      }
      if (!stack.length && tag.name === "h1" && h1?.open) h1.open = false;
      i = cursor = tag.end;
    } else if (next === "/") {
      const e = body.indexOf(">", i);
      if (e === -1) throw cutOff("a `</`");
      i = cursor = e + 1; // `</` and not a letter: a bogus comment
    } else if (isAlpha(next ?? "")) {
      const tag = tagAt(i);
      const name = tag.name;
      if (foreign()) {
        const top = stack[stack.length - 1];
        if (breaksOut(name, tag.attrs)) throw breakout(name, top.ns, top.ns === "svg" && stack.some((frame) => frame.ns === "svg" && frame.name === "text"));
        // A spelling does not switch namespaces in foreign content. The dispatcher exception is svg in MathML annotation-xml.
        const ns = top.ns === "math" && top.name === "annotation-xml" && name === "svg" ? "svg" : top.ns;
        if (name === "script" && ns === "svg") throw new Error("`<script>` inside `<svg>` is refused: write executable scripts in HTML outside the svg");
        let html = false;
        let text = false;
        if (ns === "svg") html = SVG_HTML_POINTS.has(name);
        else if (ns === "math") {
          text = MATH_TEXT_POINTS.has(name);
          if (name === "annotation-xml") {
            const encoding = tag.attrs.find((a) => a[0] === "encoding")?.[1] ?? "";
            if (encoding.includes("&")) throw new Error("`<annotation-xml>` has an `encoding` containing an ampersand: write the encoding literally (encoding=\"text/html\"), because compose.mjs does not decode references to decide what an element holds");
            html = /^(?:text\/html|application\/xhtml\+xml)$/i.test(encoding);
          }
          html = html || text;
        }
        if (!tag.selfClosing) stack.push({ name, kind: html ? "html" : "foreign", ns, text });
        i = cursor = tag.end;
        continue;
      }
      // HTML content: at the top of the body, or inside a template, or inside an integration point
      const top = stack[stack.length - 1];
      if (top?.text && (name === "mglyph" || name === "malignmark")) throw new Error(`\`<${name}>\` inside \`<${top.name}>\` stays MathML, which compose.mjs does not follow: use a complete MathML fragment without this text-point exception, or put HTML in <annotation-xml encoding="text/html">`);
      if (name === "svg" || name === "math" || name === "template") {
        if (name === "template" || !tag.selfClosing) {
          if (!stack.length) { from = i; fromName = name; }
          stack.push({ name, kind: name === "template" ? "template" : "foreign", ns: name, text: false });
          if (name === "template") templates++;
        }
        i = cursor = tag.end;
        continue;
      }
      if (name === "plaintext") throw new Error("`<plaintext>` is refused: it makes the rest of the page text, so compose.mjs's own script and closing tags would be shown as text");
      if (name === "script") {
        if (tag.attrs.find((a) => a[0] === "type")?.[1].includes("&")) throw new Error('`<script>` has an encoded type: write the type literally (type="text/javascript")');
        const e = scriptEnd(body, tag.end);
        if (e === -1) throw never("`<script>`");
        const end = tagAt(e).end;
        const inner = body.slice(tag.end, e);
        if (!templates) scripts.push({ inner, attrs: tag.attrs });
        if (!stack.length) hold("script", i, end, inner, tag.attrs);
        i = cursor = end;
      } else if (RAW_TEXT.has(name) || RCDATA.has(name)) {
        const e = textEnd(body, name, tag.end);
        if (e === -1) throw never(`\`<${name}>\``);
        const end = tagAt(e).end;
        if (!stack.length) hold(name === "style" || name === "title" ? name : "raw", i, end, body.slice(tag.end, e));
        i = cursor = end;
      } else {
        if (!stack.length) {
          if (name === "html" || name === "head" || name === "body") whole = true;
          else if (name === "meta" || name === "link") {
            const keys = new Set(tag.attrs.map(([key]) => key));
            const microdata = keys.has("itemprop") && (name === "meta"
              ? keys.has("content") && !["name", "http-equiv", "charset", "property"].some((key) => keys.has(key))
              : keys.has("href") && !keys.has("rel"));
            if (!microdata) hold("head", i, tag.end, null, tag.attrs);
          }
          else if (name === "h1" && !h1) h1 = { text: "", open: true };
        }
        i = cursor = tag.end;
      }
    } else i++;
  }
  if (stack.length) throw never(`\`<${stack[0].name}>\``);
  out += body.slice(at);
  // The placeholder, with the white space after it (restore() puts the saved text back and keeps the white space).
  const placeholder = new RegExp(`${mark}(\\d+)${mark}(\\s*)`, "g");
  const blank = (item) => { let text = item.text; for (const [a, b] of [...item.comments].reverse()) text = text.slice(0, a) + " " + text.slice(b); return text; };
  return {
    text: out, saved, scripts, placeholder, whole, h1: h1 && !h1.open ? h1.text.trim() : null,
    // The text put back; with `bare`, as detection reads it: no comment (an HTML one, or one in a nested element, or in a script).
    restore: (s, bare = false) => s.replace(placeholder, (_, k, ws) => {
      const item = saved[Number(k)];
      if (!bare) return item.text + ws;
      if (item.kind === "comment") return " " + ws;
      if (item.kind === "script" && JS_TYPE.test((item.attrs.find((a) => a[0] === "type")?.[1] ?? "").trim().toLowerCase())) return item.text.replace(item.inner, () => stripJsComments(item.inner)) + ws;
      return blank(item) + ws;
    }),
  };
}

/** The error for HTML inside svg or math. */
function breakout(name, ns, svgText = false) {
  if (svgText) return new Error(`\`<${name}>\` inside SVG \`<text>\` is HTML that a browser lifts out of the svg: use <tspan> for chart labels (dy for line breaks, baseline-shift for subscripts, font-weight for bold)`);
  return new Error(`\`<${name}>\` inside \`<${ns}>\` is HTML in foreign content, which a browser lifts out of the ${ns}, so compose.mjs cannot tell where the rest of the page is: HTML inside ${ns} must be inside ${ns === "svg" ? "foreignObject" : "an annotation-xml with encoding=\"text/html\""}`);
}

/**
 * A `meta` or `link` a body may carry into the head: ordinary named metadata, its icon and its share card. Returns the tag as written, or throws
 * for any other, because compose owns the charset, viewport and colour scheme, and a stylesheet or preload would reach for the network.
 */
export function headTag(tag, attrs = readTag(tag, 0).attrs) {
  const name = tag.match(/^<(meta|link)/i)[1].toLowerCase();
  const a = {};
  for (const [k, v] of attrs) a[k] ??= v; // the first of a repeated attribute wins, as in a browser
  const refuse = (why) => new Error(`${tag.length > 90 ? `${tag.slice(0, 87)}...` : tag}: ${why}. A body may carry <meta name="description" content>, named metas for robots, author, referrer and keywords, <meta property="og:..." content>, <meta name="twitter:..." content>, <link rel="icon" href="data:...">, <link rel="apple-touch-icon" href="data:..."> and <link rel="canonical" href>; compose.mjs writes the rest of the head`);
  const allowed = name === "meta" ? ["name", "property", "content"] : ["rel", "href", "type", "sizes", "media"];
  for (const k of Object.keys(a)) if (!allowed.includes(k)) throw refuse(`${name === "meta" ? "a meta" : "a link"} with \`${k}\` is not accepted`);
  if (name === "meta") {
    const wanted = a.name?.toLowerCase();
    const prop = a.property?.toLowerCase();
    if (!("content" in a)) throw refuse("a meta needs `content`");
    const named = ["description", "robots", "author", "referrer", "keywords"].includes(wanted) || wanted?.startsWith("twitter:");
    if (!((named && prop === undefined) || (prop?.startsWith("og:") && wanted === undefined))) throw refuse("this meta is not accepted");
  } else {
    const rel = a.rel?.toLowerCase().trim();
    if (!a.href) throw refuse("a link needs `href`");
    if (rel !== "icon" && rel !== "apple-touch-icon" && rel !== "canonical") throw refuse(`\`rel="${a.rel ?? ""}"\` is not accepted`);
    if (rel !== "canonical" && !/^data:/i.test(a.href)) throw refuse("an icon's href must be a data: URL, because a page is one file with no network");
  }
  return tag;
}

/** Every class name the text gives an element: class="a b", className = "a", classList.add("a", "b"). */
function classesIn(text) {
  const found = new Set();
  const add = (list) => list.split(/\s+/).forEach((c) => c && found.add(c));
  for (const m of text.matchAll(/\bclass(?:Name)?\s*[=:]\s*\\?(["'`])([^"'`]*?)\\?\1/g)) add(m[2]);
  for (const m of text.matchAll(/classList\s*\.\s*(?:add|remove|toggle|replace)\s*\(([^)]*)\)/g)) for (const s of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) add(s[1]);
  return found;
}

/**
 * JavaScript with its comments taken out. Strings, template literals and regular expressions are copied whole, so a `//` in a URL or a quote in a
 * regular expression is not mistaken for a comment or a string. Each comment becomes one space (or the line's end), so two words never join.
 * With maskLiterals, quoted text is replaced by a literal zero and spaces for lexical init detection. This is not a JavaScript parser (README: Known limits).
 */
export function stripJsComments(code, maskLiterals = false) {
  const literal = (text) => maskLiterals ? "0" + " ".repeat(Math.max(0, text.length - 1)) : text;
  let out = "";
  let i = 0;
  const n = code.length;
  const regexAfter = /[(,=:[!&|?{};+\-*%<>~^]$/;
  const wordAfter = /(?:^|[^\w$.])(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;
  while (i < n) {
    const c = code[i];
    const d = code[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && code[i] !== "\n") i++;
    } else if (c === "/" && d === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      out += " ";
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && code[j] !== c && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      out += literal(code.slice(i, j + 1));
      i = j + 1;
    } else if (c === "`") {
      // A template literal, with `${ }` nested: copied whole, comments inside an expression included.
      let j = i + 1;
      let depth = 0;
      while (j < n && !(code[j] === "`" && depth === 0)) {
        if (code[j] === "\\") j += 2;
        else if (code[j] === "$" && code[j + 1] === "{") { depth++; j += 2; } else if (code[j] === "}" && depth > 0) { depth--; j++; } else if (code[j] === "`" && depth > 0) { const end = code.indexOf("`", j + 1); j = end === -1 ? n : end + 1; } else j++;
      }
      out += literal(code.slice(i, j + 1));
      i = j + 1;
    } else if (c === "/") {
      const before = out.trimEnd();
      if (before === "" || regexAfter.test(before) || wordAfter.test(before)) {
        let j = i + 1;
        let inClass = false;
        while (j < n && code[j] !== "\n" && (inClass || code[j] !== "/")) {
          if (code[j] === "\\") j++;
          else if (code[j] === "[") inClass = true;
          else if (code[j] === "]") inClass = false;
          j++;
        }
        out += literal(code.slice(i, j + 1));
        i = j + 1;
      } else { out += c; i++; }
    } else { out += c; i++; }
  }
  return out;
}

export const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, " ");

/**
 * Which modules and icons a body needs. `manifest` is parts/manifest.json, `icons` the names parts/icons.json has.
 * Returns { modules: [names, in the manifest's order], icons: [names, in icons.json's order], glyphs: [core glyph names, in glyphs.json's order] }.
 */
export function detect(text, manifest, iconNames, { all = false, use = [], glyphNames = [] } = {}) {
  const classes = classesIn(text);
  const tags = new Set([...text.matchAll(/<([a-zA-Z][\w-]*)[\s/>]/g)].map((m) => m[1].toLowerCase()));
  const wanted = new Set(use);
  for (const [name, m] of Object.entries(manifest.modules)) {
    if (all) wanted.add(name);
    else if (
      (m.classes ?? []).some((c) => classes.has(c)) ||
      (m.tags ?? []).some((t) => tags.has(t)) ||
      (m.attrs ?? []).some((a) => new RegExp(`(?<![\\w-])${escapeRegExp(a)}(?![\\w-])`).test(text)) ||
      (m.text ?? []).some((re) => new RegExp(re).test(text))
    ) wanted.add(name);
  }
  // A module's requirements come with it, to a fixed point.
  for (let grew = true; grew;) {
    grew = false;
    for (const name of [...wanted]) for (const need of manifest.modules[name].requires ?? []) if (!wanted.has(need)) { wanted.add(need); grew = true; }
  }
  const modules = Object.keys(manifest.modules).filter((n) => wanted.has(n));
  // An icon is in when its name sits in quotes in the body (data-icon="Copy", icon: 'Trash') or a module in use draws it.
  const named = new Set();
  for (const name of iconNames) if (all || new RegExp(`["'\`]${name}["'\`]`).test(text)) named.add(name);
  for (const m of modules) for (const name of manifest.modules[m].icons ?? []) named.add(name);
  // A core glyph is in when the body draws it (data-glyph="home") or a module in use draws it itself.
  const drawn = new Set();
  for (const m of text.matchAll(/\bdata-glyph\s*=\s*\\?["']?([\w-]+)/g)) drawn.add(m[1]);
  for (const m of modules) for (const name of manifest.modules[m].glyphs ?? []) drawn.add(name);
  return { modules, icons: iconNames.filter((n) => named.has(n)), glyphs: glyphNames.filter((n) => all || drawn.has(n)) };
}

/**
 * The page for a body fragment. Options: fonts (default true), lang ("en"), all (every module), parts (the folder of parts).
 * Returns { html, modules, icons, glyphs, built, bytes } (built: { module: the module whose script builds it } for a module the body never triggers). Throws an Error with a plain message for input it can't use.
 */
export function compose(body, { fonts = true, lang = "en", all = false, parts = path.join(here, "parts") } = {}) {
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang)) throw new Error(`"${lang}" is not a language code`);
  const manifest = JSON.parse(read(parts, "manifest.json"));
  const iconFile = JSON.parse(read(parts, "icons.json"));
  const glyphFile = JSON.parse(read(parts, "glyphs.json"));

  // Comments, scripts, styles, svgs and templates are looked at for what they are, never for markup inside them.
  const held = readBody(body);
  let markup = held.text;
  if (held.whole) throw new Error("the input is a whole page; give compose.mjs the body fragment only (the HTML that goes inside <body>)");
  const use = [];
  const styles = [];
  const headTags = [];
  let title = null;
  markup = markup.replace(held.placeholder, (all$, i, ws) => {
    const { kind, text, inner } = held.saved[Number(i)];
    if (kind === "style") { styles.push(inner.trim()); return ""; }
    if (kind === "title" && title === null) { title = inner.trim(); return ""; }
    if (kind === "head") { headTags.push(headTag(text.trim(), held.saved[Number(i)].attrs)); return ""; }
    const directive = kind === "comment" && text.match(/^<!--\s*basalt:use\s+([\s\S]*?)-->$/);
    if (!directive) return all$;
    use.push(...directive[1].split(/[\s,]+/).filter(Boolean));
    return ws;
  });
  for (const name of use) if (!(name in manifest.modules)) throw new Error(`basalt:use names "${name}", which is not a module (modules: ${Object.keys(manifest.modules).join(", ")})`);

  const content = held.restore(markup).replace(/^\s+/, "");
  title ??= held.h1 || "Untitled page";

  // Detection reads markup and code, never comments: a word written about in a comment (an HTML one, or one inside a script or a style) brings nothing in.
  const code = `${held.restore(markup, true)}\n${styles.map(stripCssComments).join("\n")}`;
  const chosen = detect(code, manifest, Object.keys(iconFile.icons), { all, use, glyphNames: Object.keys(glyphFile) });
  // A module the body never triggers, which is in only because another module's script builds its markup (the palette's rows and key chips).
  const bare = { ...manifest, modules: Object.fromEntries(Object.entries(manifest.modules).map(([n, m]) => [n, { ...m, requires: [] }])) };
  const direct = detect(code, bare, [], { all, use }).modules;
  const built = Object.fromEntries(chosen.modules.filter((n) => !direct.includes(n)).flatMap((n) => chosen.modules.filter((m) => (manifest.modules[m].builds ?? []).includes(n)).slice(0, 1).map((m) => [n, m])));

  const css = [read(parts, "core.css"), ...chosen.modules.filter((n) => exists(parts, `${n}.css`)).map((n) => read(parts, `${n}.css`))].join("");
  const icons = Object.fromEntries(chosen.icons.map((n) => [n, iconFile.icons[n]]));
  const script = [
    read(parts, "core.js"),
    chosen.icons.length ? `${iconFile.notice}\nBasalt._.addIcons(${JSON.stringify(icons)});\n` : "",
    ...chosen.modules.filter((n) => exists(parts, `${n}.js`)).map((n) => read(parts, `${n}.js`)),
    // The glyph module defines addGlyphs, so the drawings come after the modules' scripts.
    chosen.glyphs.length ? `Basalt._.addGlyphs(${JSON.stringify(Object.fromEntries(chosen.glyphs.map((n) => [n, glyphFile[n]])))});\n` : "",
  ].join("");
  // The body may make the init call itself (to pass palette items that run code); otherwise it is made at the end.
  // Only the page's own executable scripts (the tokenizer says which they are) can call it: text, an attribute or a script of another type that mentions the call does not.
  const callsInit = held.scripts.some((item) => JS_TYPE.test((item.attrs.find((a) => a[0] === "type")?.[1] ?? "").trim().toLowerCase()) && !item.attrs.some((a) => a[0] === "src") && /\bBasalt\s*\??\.\s*init\s*\(/.test(stripJsComments(item.inner, true)));

  const html = [
    "<!doctype html>",
    `<html lang="${lang}">`,
    "<head>",
    '<meta charset="utf-8">',
    // A page with a phone tab bar or an app shell reads the safe-area insets, which a phone gives only to a page that covers its whole screen.
    `<meta name="viewport" content="width=device-width, initial-scale=1${chosen.modules.some((n) => manifest.modules[n].viewportFit) ? ", viewport-fit=cover" : ""}">`,
    '<meta name="color-scheme" content="dark light">',
    `<title>${title}</title>`,
    ...headTags,
    `<script>${THEME_INIT}</script>`,
    ...(chosen.modules.includes("loops") ? [`<script>${LOOPS_INIT}</script>`] : []),
    ...(fonts ? ["<style data-basalt-fonts>", read(parts, "geist.css").trim(), "</style>"] : []),
    `<style>${css}</style>`,
    ...styles.map((s) => `<style>${s}</style>`),
    `<script>${inlineScript(script)}</script>`,
    "</head>",
    "<body>",
    content.trimEnd(),
    ...(callsInit ? [] : ["<script>Basalt.init();</script>"]),
    "</body>",
    "</html>",
    "",
  ].join("\n");
  return { html, modules: chosen.modules, icons: chosen.icons, glyphs: chosen.glyphs, built, bytes: Buffer.byteLength(html) };
}

/** The module lines of SKILL.md's "## Modules" index: [{ name, trigger, warning }]. A line is `- **name** \`trigger\`: warning`. */
export function indexLines(skillText) {
  const section = skillText.match(/^## Modules\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";
  const lines = [];
  for (const line of section.split("\n")) {
    const m = line.match(/^- \*\*([\w-]+)\*\* (.*)$/);
    if (!m) continue;
    const at = m[2].indexOf("`: ");
    lines.push({ name: m[1], trigger: at === -1 ? "" : m[2].slice(0, at + 1), warning: at === -1 ? m[2] : m[2].slice(at + 3), line: line.slice(2) });
  }
  return lines;
}

/** What brings a module in, read from the manifest: its classes, attributes, tags and the script calls detection looks for. */
function triggers(manifest, name) {
  const m = name === "core" ? manifest.core : manifest.modules[name];
  const parts = [];
  if (m.classes?.length) parts.push(`classes ${m.classes.map((c) => `.${c}`).join(" ")}`);
  if (m.attrs?.length) parts.push(`attributes ${m.attrs.join(" ")}`);
  if (m.tags?.length) parts.push(`tags ${m.tags.map((t) => `<${t}>`).join(" ")}`);
  if (m.text?.length) parts.push(`the body has ${(m.textWords ?? m.text.map((t) => `a match for /${t}/`)).join("; or ")}`);
  return parts.join("; ");
}

/**
 * The usage text for `names` (`core` or modules): each one's usage file, then the usage of each module it requires (to a fixed point,
 * in the manifest's order), and under each the classes, attributes and tags that bring it in. Throws for a name that is not one.
 */
export function usageText(names, { parts = path.join(here, "parts") } = {}) {
  const manifest = JSON.parse(read(parts, "manifest.json"));
  const known = ["core", ...Object.keys(manifest.modules)];
  for (const name of names) if (!known.includes(name)) throw Object.assign(new Error(`"${name}" is not a module (core or: ${known.slice(1).join(", ")})`), { unknownName: name });
  const out = [];
  const done = new Set();
  const section = (name, by) => {
    if (done.has(name)) return;
    done.add(name);
    const brings = triggers(manifest, name);
    const lead = name === "core" ? "Always in." : by ? `Required by ${by}.` : "";
    out.push(`${read(parts, path.join("usage", `${name}.md`)).trim()}\n\n${[lead, brings ? (name === "core" ? `Core ${brings}.` : `Brought in by: ${brings}.`) : ""].filter(Boolean).join(" ")}\n`);
    const builds = manifest.modules[name]?.builds ?? [];
    if (builds.length) out.push(`Its script builds the markup of ${builds.length > 2 ? `${builds.slice(0, -1).join(", ")} and ${builds[builds.length - 1]}` : builds.join(" and ")}: nothing to add. If your page uses ${builds.length > 1 ? "one" : "it"} itself, print its usage by name.\n`);
    const needs = new Set((manifest.modules[name]?.requires ?? []).filter((n) => !builds.includes(n)));
    for (let grew = true; grew;) { grew = false; for (const n of [...needs]) for (const r of manifest.modules[n].requires ?? []) if (!needs.has(r)) { needs.add(r); grew = true; } }
    for (const n of Object.keys(manifest.modules)) if (needs.has(n)) section(n, name);
  };
  for (const name of names) section(name);
  return out.join("\n");
}

/** SKILL.md's index of modules as the text --usage prints, or null when SKILL.md is not beside compose.mjs. */
function indexText(skill) {
  if (!fs.existsSync(skill)) return null;
  const lines = indexLines(fs.readFileSync(skill, "utf8")).map((l) => `- ${l.line}`);
  return `Modules (node .agent/skills/basalt-html/compose.mjs --usage core NAME ... prints their usage; core is layout, type, panels and buttons):\n${lines.join("\n")}\n`;
}

function usage() {
  console.error("usage: node .agent/skills/basalt-html/compose.mjs <body.html> [--out <page.html>] [--no-fonts] [--lang <code>] [--all]\n       node .agent/skills/basalt-html/compose.mjs --usage [NAME ...]");
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const options = { fonts: true, lang: "en", all: false };
  let input = null;
  let out = null;
  let usageNames = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--usage") {
      usageNames = [];
      while (args[i + 1] !== undefined && !args[i + 1].startsWith("--")) usageNames.push(args[++i]);
    } else if (a === "--no-fonts") options.fonts = false;
    else if (a === "--all") options.all = true;
    else if (a === "--out" || a === "--lang") {
      if (args[i + 1] === undefined || args[i + 1].startsWith("--")) usage();
      if (a === "--out") out = args[++i]; else options.lang = args[++i];
    } else if (a.startsWith("--") || input) usage();
    else input = a;
  }
  const skill = path.join(here, "SKILL.md");
  if (usageNames) {
    // The usage of modules: no body is read and no page is written.
    if (input || out) usage();
    const index = indexText(skill);
    if (!usageNames.length) {
      if (index === null) { console.error("compose.mjs: SKILL.md is not beside compose.mjs, so there is no index to print"); process.exitCode = 1; } else console.log(index);
    } else {
      try {
        console.log(usageText(usageNames));
      } catch (e) {
        console.error(`compose.mjs: ${e.message}`);
        if (e.unknownName !== undefined && index !== null) console.error(`\n${index}`);
        process.exitCode = 1;
      }
    }
  } else {
    if (!input) usage();
    try {
      if (!out) {
        out = path.join(path.dirname(input), path.basename(input).replace(/\.body\.html?$/i, "").replace(/\.html?$/i, "") + ".html");
        if (path.resolve(out) === path.resolve(input)) throw new Error(`${input} would be overwritten; name the page with --out`);
      }
      if (path.resolve(out) === path.resolve(input)) throw new Error("--out is the input file; name another file");
      const result = compose(fs.readFileSync(input, "utf8"), options);
      fs.writeFileSync(out, result.html);
      console.log(`${out}: ${(result.bytes / 1024).toFixed(1)} KB, core + ${result.modules.join(", ") || "no modules"}; icons: ${result.icons.join(", ") || "none"}`);
      // One line of warning for each module added: the mistake an agent makes with it. The full text is `--usage NAME`.
      if (result.modules.length && fs.existsSync(skill)) {
        const lines = indexLines(fs.readFileSync(skill, "utf8"));
        const warnings = result.modules.map((n) => lines.find((l) => l.name === n)).filter(Boolean);
        const say = (l) => (l.name in result.built ? `  ${l.name}: built by the ${result.built[l.name]}; nothing to check.` : `  ${l.name}: ${l.warning}`);
        if (warnings.length) console.log(`Check before you hand it over (the full text of one: --usage NAME):\n${warnings.map(say).join("\n")}`);
      }
    } catch (e) {
      console.error(`compose.mjs: ${e.message}`);
      process.exit(1);
    }
  }
}
