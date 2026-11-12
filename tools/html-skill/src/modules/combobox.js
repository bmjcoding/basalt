/* Basalt HTML script, combobox module: React's Combobox (Base UI's). A `.combobox` holds an `input.input` and a `ul` of `li` options (`data-value`, an optional
   `data-description` for a second line, `aria-selected="true"` on the chosen one, `aria-disabled="true"` on one that can't be). The script writes the rest: a
   ghost caret button over the input's end, a hidden input that takes the field's `name` and holds the chosen value (the visible input holds the label), and a
   popup of rows (the popover module's native popup, the glide's shared plate). Focus stays in the input: it is `role="combobox"` with `aria-activedescendant` on a
   `listbox` of `option`s. Keys: Down and Up open the list (on the chosen row, else the first or last) and move the lit row, through none at either end; Enter
   chooses the lit row and closes (with none lit it just closes); Esc closes and puts the chosen label back, and Esc again on a closed field clears the text and
   the choice. Typing opens the list and filters it by the label (and the description, when any option has one), the text matching the chosen label shows every
   row, and emptying the field clears the choice. Clicking the input or the caret opens it; a click or blur outside closes it. A `comboboxchange` event
   ({ detail: { value, label } }) bubbles from the `.combobox` on a choice or a clear. Basalt.combobox(el) wires one made at run time and returns { value, set }.
   Source: tools/html-skill/src/modules/combobox.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var seq = 0;
  var collator;

  function el(tag, cls, attrs, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    for (var k in attrs || {}) node.setAttribute(k, attrs[k]);
    if (html != null) node.innerHTML = html;
    return node;
  }

  // Base UI's match: the query anywhere in the text, ignoring case and accents. Described options also search their second line, as React's does.
  function contains(text, query) {
    collator = collator || new Intl.Collator(undefined, { usage: 'search', sensitivity: 'base' });
    for (var i = 0; i + query.length <= text.length; i++) if (collator.compare(text.slice(i, i + query.length), query) === 0) return true;
    return false;
  }

  function wire(root) {
    if (root.__bhCombobox) return root.__bhCombobox;
    var input = root.querySelector('input:not([type="hidden"])');
    var source = root.querySelector('ul,ol');
    if (!input || !source) return null;
    var id = 'bh-cb-' + (++seq);
    var described = false;
    var opts = Array.prototype.map.call(source.querySelectorAll('li'), function (li, i) {
      var description = li.getAttribute('data-description') || '';
      var label = li.textContent.trim();
      if (description) described = true;
      var value = li.hasAttribute('data-value') ? li.getAttribute('data-value') : label;
      var node = el('div', 'combobox-option', { role: 'option', id: id + '-' + i, 'aria-selected': 'false', 'tabindex': '-1' },
        '<span class="combobox-check" aria-hidden="true"></span><span class="combobox-option-label"></span>' + (description ? '<span class="combobox-option-description"></span>' : ''));
      node.querySelector('.combobox-option-label').textContent = label;
      if (description) { node.setAttribute('data-described', ''); node.querySelector('.combobox-option-description').textContent = description; }
      var disabled = li.getAttribute('aria-disabled') === 'true' || li.hasAttribute('disabled');
      if (disabled) node.setAttribute('aria-disabled', 'true');
      return { value: value, label: label, description: description, disabled: disabled, node: node, chosen: li.getAttribute('aria-selected') === 'true' };
    });
    source.remove();

    var name = input.getAttribute('name');
    var hidden = null;
    if (name) { input.removeAttribute('name'); hidden = el('input', '', { type: 'hidden', name: name }); if (input.hasAttribute('form')) hidden.setAttribute('form', input.getAttribute('form')); }
    var trigger = el('button', 'btn combobox-trigger', { type: 'button', tabindex: '-1', 'aria-label': 'Show options', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'data-variant': 'ghost', 'data-icon-only': '' }, _.icon('CaretUpDown'));
    var pop = el('div', 'panel float combobox-popup', { popover: 'manual', role: 'presentation', tabindex: '-1' });
    var plate = el('span', 'plate', { 'aria-hidden': 'true' });
    var empty = el('div', 'combobox-empty', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    var list = el('div', '', { role: 'listbox', id: id + '-list', tabindex: '-1' });
    opts.forEach(function (o) { list.appendChild(o.node); });
    pop.appendChild(plate); pop.appendChild(empty); pop.appendChild(list);
    root.setAttribute('role', 'group');
    if (hidden) root.appendChild(hidden);
    root.appendChild(trigger);
    root.appendChild(pop);
    var attrs = { role: 'combobox', autocomplete: 'off', spellcheck: 'false', 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' };
    for (var a in attrs) input.setAttribute(a, attrs[a]);
    if (input.disabled) trigger.disabled = true;

    var selected = null;
    var lit = null;
    var isOpen = false;
    var unglide = null;
    var emptyText = root.getAttribute('data-empty') || 'No options match.';

    function choose(opt) {
      selected = opt;
      opts.forEach(function (o) {
        o.node.setAttribute('aria-selected', o === opt ? 'true' : 'false');
        o.node.firstChild.innerHTML = o === opt ? _.icon('Check') : '';
      });
      if (hidden) hidden.value = opt ? opt.value : '';
      input.value = opt ? opt.label : '';
    }
    function announceChange() {
      root.dispatchEvent(new CustomEvent('comboboxchange', { bubbles: true, detail: { value: selected ? selected.value : '', label: selected ? selected.label : '' } }));
    }
    function visible() { return opts.filter(function (o) { return !o.node.hidden; }); }
    function light(opt) {
      if (lit) lit.node.removeAttribute('data-highlighted');
      lit = opt || null;
      if (lit) {
        lit.node.setAttribute('data-highlighted', '');
        input.setAttribute('aria-activedescendant', lit.node.id);
        lit.node.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }
    // The rows that match what is typed. The text that is the chosen label (a choice just made, or the field as it was loaded) shows every row.
    function filter() {
      var text = input.value.trim();
      var query = selected && input.value === selected.label ? '' : text;
      var shown = 0;
      opts.forEach(function (o) {
        var ok = !query || contains(o.label, query) || (described && contains(o.description, query));
        o.node.hidden = !ok;
        if (ok) shown++;
      });
      empty.textContent = shown ? '' : emptyText;
      if (lit && lit.node.hidden) light(null);
    }
    // The listbox is named as the field is, by its aria-label or its label's words.
    function nameList() {
      var label = input.getAttribute('aria-label') || (input.labels && input.labels[0] && input.labels[0].textContent.trim());
      if (label) list.setAttribute('aria-label', label);
    }
    function place() {
      if (isOpen) _.place(pop, root, { side: 'bottom', align: 'center', offset: 6 });
    }
    function open(where) {
      if (isOpen || input.disabled) return;
      isOpen = true;
      pop.style.setProperty('--anchor-width', root.getBoundingClientRect().width + 'px');
      filter();
      pop.showPopover();
      input.setAttribute('aria-expanded', 'true');
      input.setAttribute('aria-controls', list.id);
      trigger.setAttribute('aria-expanded', 'true');
      nameList();
      place();
      unglide = _.glide(pop, plate, { active: '[data-highlighted]', attr: 'data-highlighted' });
      window.addEventListener('resize', place);
      document.addEventListener('scroll', scrolled, true);
      var rows = visible();
      var enabled = rows.filter(function (o) { return !o.disabled; });
      if (where === 'last') light(selected && !selected.node.hidden ? selected : enabled[enabled.length - 1]);
      else if (where === 'first') light(selected && !selected.node.hidden ? selected : enabled[0]);
      else if (where === 'click') light(selected && !selected.node.hidden ? selected : null);
      place();
    }
    function scrolled(e) { if (!pop.contains(e.target)) place(); }
    // Closing puts the chosen label back in the field, whatever was typed.
    function close() {
      if (!isOpen) return;
      isOpen = false;
      light(null);
      if (unglide) { unglide(); unglide = null; }
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', scrolled, true);
      if (pop.matches(':popover-open')) pop.hidePopover();
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-controls');
      trigger.setAttribute('aria-expanded', 'false');
      input.value = selected ? selected.label : '';
    }
    function pick(opt) {
      if (opt.disabled) return;
      var changed = opt !== selected;
      choose(opt);
      close();
      if (changed) announceChange();
    }
    function clear() {
      var had = selected;
      choose(null);
      if (had) announceChange();
    }
    function move(step) {
      var rows = visible();
      var at = lit ? rows.indexOf(lit) : -1;
      // Through none at either end: down from the last row lights nothing, and down from nothing lights the first.
      var next = step > 0 ? (at + 1 < rows.length ? rows[at + 1] : null) : (lit ? (at > 0 ? rows[at - 1] : null) : rows[rows.length - 1]);
      light(next);
    }

    input.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) open(e.key === 'ArrowDown' ? 'first' : 'last'); else move(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' && isOpen) {
        e.preventDefault();
        if (lit && !lit.disabled) pick(lit); else if (!lit) close();
      } else if (e.key === 'Escape' && (isOpen || input.value || selected)) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) close(); else { clear(); input.value = ''; }
      }
    });
    input.addEventListener('input', function () {
      if (input.value === '' && selected) clear();
      if (isOpen) { filter(); light(null); place(); } else if (input.value !== '') open('typing');
    });
    input.addEventListener('click', function () { if (!isOpen) open('click'); });
    root.addEventListener('focusout', function (e) {
      if (isOpen && !root.contains(e.relatedTarget)) close();
    });
    document.addEventListener('pointerdown', function (e) { if (isOpen && !root.contains(e.target)) close(); }, true);
    // A press on the caret or a row keeps focus in the input.
    [trigger, pop].forEach(function (node) { node.addEventListener('mousedown', function (e) { e.preventDefault(); }); });
    trigger.addEventListener('click', function () {
      input.focus();
      if (isOpen) close(); else open('click');
    });
    pop.addEventListener('click', function (e) {
      var node = e.target.closest('.combobox-option');
      if (node) pick(opts.filter(function (o) { return o.node === node; })[0]);
    });
    pop.addEventListener('pointermove', function (e) {
      var node = e.pointerType !== 'touch' && e.target.closest('.combobox-option');
      if (node && (!lit || lit.node !== node)) light(opts.filter(function (o) { return o.node === node; })[0]);
    });
    pop.addEventListener('pointerout', function (e) {
      var node = e.target.closest('.combobox-option');
      if (node && lit && lit.node === node && !node.contains(e.relatedTarget)) light(null);
    });

    opts.forEach(function (o) { if (o.chosen && !selected) selected = o; });
    if (selected) choose(selected);
    nameList();
    var api = {
      value: function () { return selected ? selected.value : ''; },
      set: function (value) { var o = opts.filter(function (x) { return x.value === value; })[0]; if (o) { choose(o); if (isOpen) close(); } else { choose(null); } }
    };
    root.__bhCombobox = api;
    return api;
  }

  B.combobox = wire;
  _.step(70, 'wireComboboxes', function () { document.querySelectorAll('.combobox').forEach(wire); });
})(window.Basalt);
