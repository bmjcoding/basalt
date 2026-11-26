/* Basalt HTML script, forms module: the file field (React's FileInput). Source: tools/html-skill/src/modules/forms.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var CLOSE = '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="%glyph:close%"/></svg>';

  /** Bytes in decimal units, en-US, the short unit, one decimal at most: "14.3 kB", "2.5 MB". */
  function size(bytes) {
    var units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
    var at = 0;
    while (bytes >= 1000 && at < units.length - 1) { bytes /= 1000; at++; }
    try { return new Intl.NumberFormat('en-US', { style: 'unit', unit: units[at], unitDisplay: 'short', maximumFractionDigits: 1 }).format(bytes); }
    catch (e) { return Math.round(bytes * 10) / 10 + ' ' + units[at]; }
  }

  /**
   * Builds a .file-field's box around its native input. What is drawn is only ever a reading of input.files, taken on each change (a pick, a drop, Clear),
   * at once (a page the browser restored) and after the form's reset: the script never writes input.files and handles no drop. Clear empties the input,
   * sends one bubbling change and focuses it. data-choose, data-empty, data-clear and data-files ("{n} files chosen") set the words.
   */
  function wire(box) {
    var input = box.querySelector('input[type="file"]');
    if (!input) return;
    var many = input.multiple;
    var words = {
      choose: box.getAttribute('data-choose') || (many ? 'Choose files' : 'Choose file'),
      empty: box.getAttribute('data-empty') || 'No file chosen',
      clear: box.getAttribute('data-clear') || (many ? 'Clear chosen files' : 'Clear chosen file'),
      files: box.getAttribute('data-files') || '{n} files chosen'
    };
    var face = document.createElement('span');
    face.className = 'file-field-face';
    face.setAttribute('aria-hidden', 'true');
    face.innerHTML = _.icon('Paperclip', { size: 16 }) + '<span class="file-field-line"></span><span class="file-field-choose"></span><span class="file-field-size"></span>';
    var line = face.children[1], choose = face.children[2], weight = face.children[3];
    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'file-field-clear';
    clear.setAttribute('aria-label', words.clear);
    clear.innerHTML = CLOSE;
    box.appendChild(face);
    box.appendChild(clear);
    box.setAttribute('data-ready', '');
    function read() {
      var files = input.files ? Array.prototype.slice.call(input.files) : [];
      line.textContent = !files.length ? words.empty : files.length === 1 ? files[0].name : words.files.replace('{n}', files.length);
      line.toggleAttribute('data-empty', !files.length);
      choose.textContent = words.choose;
      choose.hidden = files.length > 0;
      weight.textContent = files.length === 1 ? size(files[0].size) : '';
      weight.hidden = files.length !== 1;
      clear.hidden = !files.length;
      clear.disabled = input.matches(':disabled');
      box.toggleAttribute('data-chosen', files.length > 0);
      box.removeAttribute('data-drag');
    }
    input.addEventListener('change', read);
    clear.addEventListener('click', function () {
      if (input.disabled) return;
      input.value = '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    });
    var carries = function (e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; };
    input.addEventListener('dragenter', function (e) { if (carries(e)) box.setAttribute('data-drag', ''); });
    input.addEventListener('dragover', function (e) { if (carries(e)) box.setAttribute('data-drag', ''); });
    input.addEventListener('dragleave', function () { box.removeAttribute('data-drag'); });
    // After a drop the browser sends no dragleave, so this resets the drag look, and only that: the drop is the browser's own (it sets input.files and fires
    // change, which read follows); no file is read here and nothing is prevented.
    input.addEventListener('drop', function () { box.removeAttribute('data-drag'); });
    // A reset event comes before the reset: the input is read once the browser has emptied it.
    if (input.form) input.form.addEventListener('reset', function () { setTimeout(read); });
    // Clear and the look follow the input's real disabled state, whatever sets it (its own attribute or a fieldset round it).
    var follow = function () { clear.disabled = input.matches(':disabled'); };
    var watch = new MutationObserver(follow);
    watch.observe(input, { attributes: true, attributeFilter: ['disabled'] });
    for (var set = input.closest('fieldset'); set; set = set.parentElement && set.parentElement.closest('fieldset')) watch.observe(set, { attributes: true, attributeFilter: ['disabled'] });
    read();
  }

  _.step(90, 'fileFields', function () {
    document.querySelectorAll('.file-field').forEach(function (box) {
      if (box.__bh) return;
      box.__bh = true;
      wire(box);
    });
  });
})(window.Basalt);
