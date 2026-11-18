/* Basalt HTML script, terminal module: .terminal. Draws the gutter (the prompt, a result's mark), the copy button and, with data-replay, the replay and its
   control, from lines written as <span data-kind="command|output|done|warning|error">…</span> inside the figure's <pre><code>. Basalt.terminal(el) wires one. */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var icon = _.icon;
  var COPY = '%glyph-svg:copy%';

  var MARKS = { done: ['CheckCircle', 'Done'], warning: ['Warning', 'Warning'], error: ['XCircle', 'Error'] };

  /** Words that change in place stand in one grid cell: [key, html] pairs, the one shown marked. The cell is as wide as the widest. */
  function swap(show, forms) {
    return '<span class="terminal-swap">' + forms.map(function (f) { return '<span' + (f[0] === show ? ' data-on=""' : '') + '>' + f[1] + '</span>'; }).join('') + '</span>';
  }
  function words(list) { return list.map(function (w) { return [w, w]; }); }

  function lineNode(line, prompt) {
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
    var lines = Array.prototype.map.call(code.querySelectorAll('[data-kind]'), function (el) { return { kind: el.getAttribute('data-kind'), text: el.textContent }; });
    var commands = lines.filter(function (l) { return l.kind === 'command'; }).map(function (l) { return l.text; }).join('\n');
    var failed = lines.length > 0 && lines[lines.length - 1].kind === 'error';

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
    actions += '<button type="button" class="btn terminal-copy" data-variant="ghost" data-size="sm"' + copyDisabled + '>' + COPY + swap('Copy commands', words(['Copy commands', 'Copied'])) + '</button>' +
      '<button type="button" class="btn terminal-copy-compact" data-variant="ghost" data-size="sm" data-icon-only aria-label="Copy commands"' + copyDisabled + '>' + COPY + '</button>' +
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
    var copyEl = root.querySelector('.terminal-copy .terminal-swap');
    var live = root.querySelector('.terminal-actions [role="status"]');
    var compact = root.querySelector('.terminal-copy-compact');
    var STATES = ['idle', 'running', 'paused', 'done', 'failed'];
    var CONTROL = ['Play', 'Pause', 'Resume', 'Replay'];

    function paint() {
      var count = code.querySelectorAll('.terminal-line').length;
      if (shown < count) { code.textContent = ''; count = 0; }
      for (var i = count; i < shown; i++) code.appendChild(lineNode(lines[i], prompt));
      // It is a log only while lines arrive; before the first line it is a named group, because a named element with no role and no text is not valid ARIA; otherwise a named region, as React's is (a scrollable stop that has a name needs a role).
      pre.setAttribute('role', replay && state === 'running' ? 'log' : replay && !shown ? 'group' : 'region');
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
        if (!ok) return;
        show(copyEl, 'Copied', ['Copy commands', 'Copied']);
        compact.innerHTML = '%glyph-svg:check%';
        compact.setAttribute('aria-label', 'Copied');
        live.textContent = 'Copied';
        clearTimeout(reset);
        reset = setTimeout(function () { show(copyEl, 'Copy commands', ['Copy commands', 'Copied']); compact.innerHTML = COPY; compact.setAttribute('aria-label', 'Copy commands'); live.textContent = ''; }, 1500);
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
