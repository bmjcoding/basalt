/* Basalt HTML script, code module: a code block's line numbers and its sideways cue (React's CodeBlock lineNumbers, startLine and the scroll line).
   data-line-numbers on .code (or on a bare pre.code) numbers every source line, from data-start-line (an integer, 1 by default): CRLF and blank lines
   inside count, a final newline adds none. Each number is a span whose digits are drawn by CSS (attr), aria-hidden, so a copy (the element's text) and a
   selection never take them; the newlines stay in the text, so the copy is the code as written. Every block shows "Scroll sideways to see the long
   lines" under its code while the code is wider than its box: aria-hidden (the pre is a focusable region), never changed while it scrolls, absent in print.
   Source: tools/html-skill/src/modules/code.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var HINT = 'Scroll sideways to see the long lines';

  /** The code's text cut into lines: each line a fragment, each piece of text inside clones of the elements it sat in (a token span). Newlines are dropped here. */
  function cut(code) {
    var lines = [[]];
    (function walk(node, chain) {
      [].forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) {
          child.nodeValue.split('\n').forEach(function (piece, i) {
            if (i) lines.push([]);
            if (piece) lines[lines.length - 1].push({ text: piece, chain: chain });
          });
        } else if (child.nodeType === 1) walk(child, chain.concat(child));
      });
    })(code, []);
    return lines.map(function (pieces) {
      var frag = document.createDocumentFragment();
      pieces.forEach(function (p) {
        var node = document.createTextNode(p.text);
        for (var i = p.chain.length - 1; i >= 0; i--) { var shell = p.chain[i].cloneNode(false); shell.appendChild(node); node = shell; }
        frag.appendChild(node);
      });
      return frag;
    });
  }

  function number(block) {
    var pre = block.matches('pre') ? block : block.querySelector('pre');
    var code = pre && (pre.querySelector(':scope > code') || pre);
    if (!code || code.__bhLines) return;
    code.__bhLines = true;
    var text = code.textContent;
    var start = parseInt(block.getAttribute('data-start-line'), 10);
    if (!isFinite(start) || String(start) !== String(block.getAttribute('data-start-line') || '').trim()) start = 1;
    var lines = cut(code);
    // A final newline does not add an empty last line (a pre doesn't show one either).
    var trailing = /\n$/.test(text) && lines.length > 1;
    if (trailing) lines.pop();
    code.textContent = '';
    code.classList.add('code-lines');
    lines.forEach(function (frag, i) {
      var line = document.createElement('span');
      line.className = 'code-line';
      var n = document.createElement('span');
      n.className = 'code-number';
      n.setAttribute('aria-hidden', 'true');
      n.setAttribute('data-n', String(start + i));
      var body = document.createElement('span');
      body.className = 'code-text';
      body.appendChild(frag);
      line.appendChild(n);
      line.appendChild(body);
      code.appendChild(line);
      if (i < lines.length - 1 || trailing) code.appendChild(document.createTextNode('\n'));
    });
  }

  function hint(block) {
    var pre = block.matches('pre') ? block : block.querySelector('pre');
    if (!pre || pre.__bhHint) return;
    pre.__bhHint = true;
    var line = document.createElement('p');
    line.className = 'code-hint';
    line.setAttribute('aria-hidden', 'true');
    line.textContent = HINT;
    line.hidden = true;
    pre.insertAdjacentElement('afterend', line);
    var measure = function () { line.hidden = !(pre.scrollWidth > pre.clientWidth); };
    measure();
    var watch = new ResizeObserver(measure);
    watch.observe(pre);
    if (pre.firstElementChild) watch.observe(pre.firstElementChild);
  }

  _.step(50, 'wireCode', function () {
    document.querySelectorAll('.code[data-line-numbers]').forEach(number);
    document.querySelectorAll('.code').forEach(function (block) {
      // A .code that is a pre's container, or a bare pre.code; never a .code nested in another's head.
      if (block.matches('pre') || block.querySelector(':scope > pre')) hint(block);
    });
  });
})(window.Basalt);
