/* Basalt HTML script, selection module: a table's checkbox column. `[data-select-all]` is the header checkbox of a table whose rows each start with a
   `td.select-col` checkbox. A row's box sets aria-selected on its row (the wash band); the header box is checked when every row is, mixed (the
   native indeterminate state) when some are, and checking it selects every row (or none). A `[data-select-count]` (role="status") says the count
   in words, as React's pattern does: "3 of 12 selected", "None selected". Nothing in the table moves: the column has a fixed width.
   Source: tools/html-skill/src/modules/selection.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  // The first frame: a state set on load paints at once, with no crossfade (data-still on the root until the page has painted; choice.css and toggle.css read it).
  var still = _.still || (_.still = function () {
    var root = document.documentElement;
    root.setAttribute('data-still', '');
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.removeAttribute('data-still'); }); });
  });

  function rowBoxes(table) { return Array.prototype.slice.call(table.querySelectorAll('tbody td.select-col input[type="checkbox"]')); }

  function sync(table, head) {
    var boxes = rowBoxes(table);
    var on = 0;
    boxes.forEach(function (box) {
      var row = box.closest('tr');
      if (row) row.setAttribute('aria-selected', String(box.checked));
      if (box.checked) on++;
    });
    head.checked = boxes.length > 0 && on === boxes.length;
    head.indeterminate = on > 0 && on < boxes.length;
    var count = document.querySelector('[data-select-count]');
    if (count && table.contains(head)) count.textContent = on ? on + ' of ' + boxes.length + ' selected' : 'None selected';
  }

  _.step(70, 'selection', function () {
    still();
    document.querySelectorAll('[data-select-all]').forEach(function (head) {
      var table = head.closest('table');
      if (!table || table.__bhSelect) return;
      table.__bhSelect = true;
      table.addEventListener('change', function (event) {
        var box = event.target;
        if (box === head) rowBoxes(table).forEach(function (b) { b.checked = head.checked; });
        else if (!(box.matches && box.matches('td.select-col input[type="checkbox"]'))) return;
        sync(table, head);
      });
      sync(table, head);
    });
  });
})(window.Basalt);
