/* Basalt HTML script, terminal module: .terminal. Draws the gutter (the prompt, a result's mark), the copy button and, with data-replay, the replay and its
   control, from lines written as <span data-kind="command|output|done|warning|error">…</span> inside the figure's <pre><code>. Basalt.terminal(el) wires one. */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var icon = _.icon;
  var COPY = '%glyph-svg:copy%';

  var MARKS = { done: ['CheckCircle', 'Done'], warning: ['Warning', 'Warning'], error: ['XCircle', 'Error'] };
  // A stage line (DECISIONS 316): braille while running, the core check when done, XCircle when failed, the core minus when skipped, Prohibit when
  // canceled. Running, done and failed are said by the mark (a named image); skipped and canceled by their word, drawn before the text.
  // A state is said once: where a word is drawn (skipped, canceled, or the page's own data-word) the mark is hidden from assistive technology.
  function stageMark(state, worded) {
    var seat = function (svg, name) { return '<span ' + (name && !worded ? 'role="img" aria-label="' + name + '"' : 'aria-hidden="true"') + ' class="terminal-mark">' + svg.replace('aria-hidden="true" ', '') + '</span>'; };
    if (state === 'done') return seat('%glyph-svg:check%', 'Done');
    if (state === 'failed') return seat(icon('XCircle', { size: 16 }), 'Failed');
    if (state === 'skipped') return seat('%glyph-svg:minus%');
    if (state === 'canceled') return seat(icon('Prohibit', { size: 16 }));
    return '<span ' + (worded ? 'aria-hidden="true"' : 'role="img" aria-label="Running"') + ' class="terminal-braille"><braille-spinner></braille-spinner></span>';
  }
  var STAGE_WORDS = { skipped: 'Skipped', canceled: 'Canceled' };

  /** Words that change in place stand in one grid cell: [key, html] pairs, the one shown marked. The cell is as wide as the widest. */
  function swap(show, forms) {
    return '<span class="terminal-swap">' + forms.map(function (f) { return '<span' + (f[0] === show ? ' data-on=""' : '') + '>' + f[1] + '</span>'; }).join('') + '</span>';
  }
  function words(list) { return list.map(function (w) { return [w, w]; }); }

  function lineNode(line, prompt) {
    if (line.kind === 'stage') {
      var state = line.state || 'running';
      var word = line.word || STAGE_WORDS[state];
      var node = document.createElement('span');
      node.className = 'terminal-line';
      node.setAttribute('data-kind', 'stage');
      node.setAttribute('data-state', state);
      node.innerHTML = '<span class="terminal-gutter">' + stageMark(state, Boolean(word)) + '</span><span class="terminal-text terminal-stage"><span>' + (word ? '<span class="terminal-word">' + esc(word) + ' </span>' : '') + esc(line.text) + '</span>' + (line.time ? '<span class="terminal-duration">' + esc(line.time) + '</span>' : '') + '</span>';
      return node;
    }
    var mark = MARKS[line.kind];
    var gutter = line.kind === 'command' ? '<span aria-hidden="true">' + esc(prompt) + '</span>' : mark ? icon(mark[0], { size: 16, label: mark[1] }).replace('class="icon"', 'class="icon terminal-mark"') : '';
    var el = document.createElement('span');
    el.className = 'terminal-line';
    el.setAttribute('data-kind', line.kind);
    el.innerHTML = '<span class="terminal-gutter">' + gutter + '</span><span class="terminal-text">' + esc(line.text) + '</span>';
    return el;
  }

  function terminal(root) {
    if (!root || root.__bh) return;
    root.__bh = true;
    var head = root.querySelector('figcaption');
    var pre = root.querySelector('pre');
    var code = pre && pre.querySelector('code');
    if (!head || !code) return;
    var title = head.textContent.trim();
    var prompt = root.getAttribute('data-prompt') || '$';
    var replay = root.hasAttribute('data-replay');
    var interval = Number(root.getAttribute('data-interval')) || 600;
    var exit = root.getAttribute('data-exit-code');
    var lines = Array.prototype.map.call(code.querySelectorAll('[data-kind]'), function (el) { return { kind: el.getAttribute('data-kind'), text: el.textContent, state: el.getAttribute('data-state'), word: el.getAttribute('data-word'), time: el.getAttribute('data-time') }; });
    // A stage transcript is declared on the figure: its window is never a log, whatever plays (the run's own words say what happened).
    var stages = root.hasAttribute('data-stages');
    if (stages) pre.setAttribute('data-stages', '');
    var commands = lines.filter(function (l) { return l.kind === 'command'; }).map(function (l) { return l.text; }).join('\n');
    // A replay ends failed on an error, and on a stage line that failed.
    var last = lines[lines.length - 1];
    var failed = Boolean(last) && (last.kind === 'error' || (last.kind === 'stage' && last.state === 'failed'));

    var actions = '';
    if (replay) {
      var failedWord = exit == null || exit === '' ? 'Failed' : 'Failed, exit ' + exit;
      actions += '<span class="terminal-state">' + swap('idle', [
        ['idle', 'Not started'], ['running', '<braille-spinner></braille-spinner><span>Running</span>'], ['paused', 'Paused'],
        ['done', icon('CheckCircle', { size: 16 }).replace('class="icon"', 'class="icon terminal-done"') + '<span>Done</span>'],
        ['failed', icon('XCircle', { size: 16 }).replace('class="icon"', 'class="icon terminal-failed"') + '<span data-error="">' + esc(failedWord) + '</span>']]) + '</span>';
      actions += '<button type="button" class="btn terminal-control" data-variant="ghost" data-size="sm">' + swap('Play', words(['Play', 'Pause', 'Resume', 'Replay'])) + '</button>';
    }
    var copyDisabled = commands ? '' : ' disabled';
    // The words hold and the glyph says what happened (DECISIONS 336, Q5): the check after a write, the close after a refused one.
    actions += '<button type="button" class="btn terminal-copy" data-variant="ghost" data-size="sm" data-edge="end"' + copyDisabled + '>' + COPY + '<span>Copy commands</span></button>' +
      '<button type="button" class="btn terminal-copy-compact" data-variant="ghost" data-size="sm" data-icon-only data-edge="end" aria-label="Copy commands"' + copyDisabled + '>' + COPY + '</button>' +
      '<span class="visually-hidden" role="status"></span>';
    head.classList.add('code-head');
    head.innerHTML = '<span class="terminal-title">' + esc(title) + '</span><span class="terminal-actions">' + actions + '</span>';
    pre.setAttribute('aria-label', title + ', transcript');
    code.className = 'terminal-lines';
    code.textContent = '';

    var state = replay ? 'idle' : null;
    var shown = replay ? 0 : lines.length;
    var timer = 0;
    var frame = 0;
    var atEnd = true;
    pre.addEventListener('scroll', function () { atEnd = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 2; });

    function show(swapEl, key, forms) {
      Array.prototype.forEach.call(swapEl.children, function (child, i) { child.toggleAttribute('data-on', forms[i] === key); });
    }
    var stateEl = root.querySelector('.terminal-state .terminal-swap');
    var controlEl = root.querySelector('.terminal-control .terminal-swap');
    var copyEl = root.querySelector('.terminal-copy');
    var live = root.querySelector('.terminal-actions [role="status"]');
    var compact = root.querySelector('.terminal-copy-compact');
    var STATES = ['idle', 'running', 'paused', 'done', 'failed'];
    var CONTROL = ['Play', 'Pause', 'Resume', 'Replay'];

    function paint() {
      var count = code.querySelectorAll('.terminal-line').length;
      if (shown < count) { code.textContent = ''; count = 0; }
      for (var i = count; i < shown; i++) code.appendChild(lineNode(lines[i], prompt));
      // It is a log only while lines arrive; before the first line it is a named group, because a named element with no role and no text is not valid ARIA; otherwise a named region, as React's is (a scrollable stop that has a name needs a role).
      pre.setAttribute('role', replay && state === 'running' && !stages ? 'log' : replay && !shown ? 'group' : 'region');
      if (replay) {
        var hint = code.querySelector('.terminal-hint');
        if (state === 'idle' && shown === 0) { if (!hint) { hint = document.createElement('span'); hint.className = 'terminal-hint'; hint.textContent = 'Press Play to start'; code.appendChild(hint); } } else if (hint) hint.remove();
        root.toggleAttribute('data-live', true);
        root.querySelector('.terminal-state').setAttribute('data-state', state);
        show(stateEl, state, STATES);
        show(controlEl, state === 'idle' ? 'Play' : state === 'running' ? 'Pause' : state === 'paused' ? 'Resume' : 'Replay', CONTROL);
        if (atEnd) pre.scrollTop = pre.scrollHeight;
      }
    }

    function next() {
      if (state !== 'running') return;
      if (shown >= lines.length) { state = failed ? 'failed' : 'done'; paint(); return; }
      var advance = function () { shown++; paint(); next(); };
      // Line 1 arrives one frame after the log region does, so it lands in a live region that is already in the accessibility tree and is announced.
      if (shown === 0) frame = requestAnimationFrame(advance); else timer = setTimeout(advance, interval);
    }
    function halt() { clearTimeout(timer); cancelAnimationFrame(frame); }
    if (replay) {
      root.querySelector('.terminal-control').addEventListener('click', function () {
        if (state === 'running') { halt(); state = 'paused'; paint(); } else if (state === 'paused') { state = 'running'; paint(); next(); } else { halt(); atEnd = true; shown = 0; state = 'running'; paint(); next(); }
      });
    }

    var reset;
    function copy() {
      if (!commands || !B.copyText) return;
      B.copyText(commands).then(function (ok) {
        copyEl.firstElementChild.outerHTML = ok ? '%glyph-svg:check%' : '%glyph-svg:close%';
        if (ok) { compact.innerHTML = '%glyph-svg:check%'; compact.setAttribute('aria-label', 'Copied'); }
        live.textContent = ok ? 'Copied' : 'Copy failed';
        clearTimeout(reset);
        reset = setTimeout(function () { copyEl.firstElementChild.outerHTML = COPY; compact.innerHTML = COPY; compact.setAttribute('aria-label', 'Copy commands'); live.textContent = ''; }, %duration-confirm%);
      });
    }
    root.querySelector('.terminal-copy').addEventListener('click', copy);
    compact.addEventListener('click', copy);
    paint();
  }

  function wireTerminals() {
    document.querySelectorAll('.terminal').forEach(terminal);
  }

  B.terminal = terminal;
  _.step(50, 'wireTerminals', wireTerminals);
})(window.Basalt);
