// The site header's markup, finished at build time. A page writes the short form (see sites/test/fixtures/sample/index.body.html):
//
//   <header class="basalt-chrome basalt-site-header" [data-solid] [data-menu-label="…"]>
//     <div class="basalt-site-bar">
//       <a class="basalt-site-brand" …>…</a>
//       <nav class="basalt-site-links" aria-label="Primary"><ul><li><a href="…" [aria-current="page"]>Label</a></li> …</ul></nav>
//       <span class="basalt-bar-spacer"></span>
//       <div class="basalt-bar-actions">[theme toggle] [<span class="basalt-site-action"><a class="btn" …>…</a></span>]</div>
//     </div>
//   </header>
//
// and the built page carries the final bar: the links with their classes, their pills and their labels (which reserve the 600 width of
// the current page), the shared hover pill's element, and, under 720, the Menu button. So the bar a visitor sees in the first paint is the
// bar they see after the script has run, and a page with no script still has real links. The script (shared/site-header.js) only wires
// behaviour and builds what is invisible until used: the closed menu. It adopts this markup and changes nothing in the bar.
//
// The shape is constrained, and a header that does not match it fails the build, naming the page. A header that already carries the
// final markup (its links are `basalt-site-link`) is left as it is. Nothing here runs at import time.

/** The Menu glyph, as MorphIcon draws it settled at 16 (named data-glyph, not data-icon: the skill's core script replaces any [data-icon] with a Phosphor icon). Equal to the one in shared/site-header.js (a test checks it against that and against React). */
export const MENU_GLYPH = '<svg class="basalt-morph" data-glyph="menu" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><g fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7C9.667 7 14.333 7 19 7"></path><path d="M5 12C9.667 12 14.333 12 19 12"></path><path d="M5 17C9.667 17 14.333 17 19 17"></path></g></svg>';

const attr = (value) => value.replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/"/g, "&quot;");
const has = (attrs, name) => new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|$)`).test(attrs);
const classes = (attrs) => (attrs.match(/(?:^|\s)class\s*=\s*"([^"]*)"/)?.[1] ?? "").split(/\s+/);

/** The body with each site header's markup finished. `where` names the page in an error. */
export function finishHeaders(source, where = "the page") {
  // A comment is not markup: it is set aside, so a header named in one is not taken for the header.
  const comments = [];
  const body = source.replace(/<!--[\s\S]*?-->/g, (c) => `\u0000${comments.push(c) - 1}\u0000`);
  let found = 0;
  const out = body.replace(/<header\b([^>]*)>([\s\S]*?)<\/header>/g, (whole, attrs, inner) => {
    if (!classes(attrs).includes("basalt-site-header")) return whole;
    found += 1;
    if (found > 1) throw new Error(`${where}: a page has one site header (the one smoked bar); found a second`);
    const fail = (why) => new Error(`${where}: the site header ${why} (the shape is in sites/header-markup.mjs and sites/README.md)`);
    const solid = has(attrs, "data-solid");
    const label = attrs.match(/data-menu-label\s*=\s*"([^"]*)"/)?.[1] ?? "Menu";

    let content = inner;
    let hasLinks = false;
    if (!/basalt-site-link\b/.test(content)) {
      const nav = content.match(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/);
      if (nav) {
        if (!classes(nav[1]).includes("basalt-site-links")) throw fail('has a <nav> that is not class="basalt-site-links"');
        const list = nav[2].match(/^\s*<ul>([\s\S]*)<\/ul>\s*$/);
        if (!list) throw fail("has links that are not one <ul> of <li><a href>Label</a></li>");
        const items = [...list[1].matchAll(/<li>\s*<a\b([^>]*)>([^<]*)<\/a>\s*<\/li>/g)];
        if (!items.length || list[1].replace(/<li>\s*<a\b[^>]*>[^<]*<\/a>\s*<\/li>/g, "").trim() !== "") throw fail("has links that are not exactly <li><a href>Label</a></li>, one after another");
        const rendered = items.map(([, linkAttrs, text]) => {
          if (!has(linkAttrs, "href")) throw fail(`has a link with no href (${text.trim()})`);
          if (has(linkAttrs, "class")) throw fail(`has a link that sets its own class (${text.trim()}); the build adds basalt-site-link`);
          const words = text.trim();
          if (!words) throw fail("has a link with no words");
          return `<li><a class="basalt-site-link"${linkAttrs.replace(/\s+$/, "")}><span class="basalt-site-pill"><span class="basalt-site-label" data-label="${attr(words)}">${words}</span></span></a></li>`;
        });
        content = content.replace(nav[0], `<nav${nav[1]}><span class="basalt-plate" aria-hidden="true" data-state="off"></span><ul class="basalt-site-links-list">${rendered.join("")}</ul></nav>`);
        hasLinks = true;
      }
    } else hasLinks = true;

    if (!/basalt-site-menu-trigger/.test(content)) {
      const actions = content.match(/(<div\b[^>]*class="basalt-bar-actions"[^>]*>)([\s\S]*?)(<\/div>)/);
      if (!actions) throw fail('has no <div class="basalt-bar-actions">');
      if (/<div\b/.test(actions[2])) throw fail("has a <div> inside its actions; the actions are the theme toggle and one .basalt-site-action");
      if (hasLinks || /basalt-site-action/.test(actions[2])) {
        const trigger = `<button class="btn basalt-site-menu-trigger" type="button" data-variant="ghost" data-icon-only aria-label="${attr(label)}" aria-haspopup="dialog" aria-expanded="false">${MENU_GLYPH}</button>`;
        content = content.replace(actions[0], `${actions[1]}${actions[2]}${trigger}${actions[3]}`);
      }
    }
    // The page opens at the top: from the first frame the bar is clear if the page has a stage that declared its headroom (the style decides
    // that), without waiting for the script at the end of the body. With no script at all there is no snippet, and the bar is the smoked one.
    const top = solid ? "" : `<script>/* site header: the page opens at the top */(function(){var h=document.currentScript.previousElementSibling;if(h&&window.scrollY<1){h.setAttribute("data-top","");h.setAttribute("data-jump","")}})();</script>`;
    return `<header${attrs}>${content}</header>${top}`;
  });
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => comments[Number(i)]);
}
