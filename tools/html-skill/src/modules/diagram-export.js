/* Basalt HTML script, diagram-export module (DECISIONS 306, 1.7): a figure whose JSON says "export": true gets "Download SVG" and "Download PNG" in its
   foot (secondary small buttons, before "Clear highlight"), and in its viewer's foot, where they write the viewer's drawing at 100%. They write the figure in
   the theme shown: native SVG, never foreignObject, its words as text, the faces embedded. The code is React's (packages/react/src/diagram-export.ts),
   bundled into this module by build.mjs. compose.mjs adds it only to a page with such a figure. A download that makes no file says so in a note under the
   foot's buttons (diagrams-cimip ruling 2): the page's content policy refusing the PNG switches "Download PNG" off. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-export.js (do not edit the copy in the skill folder). */
import { diagramToPng, diagramToSvg, exportName } from "../../../../packages/react/src/diagram-export.ts";

(function (B) {
  'use strict';
  var _ = B._;
  // The words of the note (diagrams-cimip ruling 2), fixed strings set as text.
  var REFUSED = "This page's security policy blocks the PNG. Download SVG still works.";
  var FAILED = { svg: 'The SVG could not be made.', png: 'The PNG could not be made.' };
  // The page's policy refused a PNG: no figure tries again while the page is open. Each "Download PNG" still answers its own first press, at once.
  var refused = false;

  function save(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function button(words, run, titleId, suffix) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn diagram-download';
    b.setAttribute('data-variant', 'secondary');
    b.setAttribute('data-size', 'sm');
    var label = document.createElement('span');
    label.textContent = words;
    b.appendChild(label);
    // On the page each names its figure (G17 of cimip-gaps-3): its words, then the title, as the foot's other buttons. The viewer's dialog names its own.
    if (titleId) {
      label.id = titleId.replace(/-title$/, '') + suffix;
      b.setAttribute('aria-labelledby', label.id + ' ' + titleId);
    }
    b.addEventListener('click', run);
    return b;
  }

  /** Puts the two buttons in a foot, before "Clear highlight", for the figure `fig`. Returns them (and a note once there is one), so a redraw can take them out. */
  _.diagramExport = function (foot, fig) {
    var made = [];
    // The note is the last thing in the figure's foot, on a row of its own; in the viewer, last in the controls' row, under the buttons it answers.
    var host = foot.classList.contains('diagram-viewer-end') ? foot.parentElement : foot;
    var dialog = foot.closest('dialog');
    var off = false;
    var note = null;
    function say(words) {
      if (!note) {
        note = document.createElement('p');
        note.className = 'diagram-export-note';
        // Built on its figure's base (G146), read as the note is made: the viewer's drawing has its base only once it is drawn.
        note.id = (fig.getAttribute('aria-labelledby') || 'diagram-title').replace(/-title$/, '') + '-export-note';
        host.appendChild(note);
        made.push(note);
      }
      if (note.textContent === words) return;
      note.textContent = words;
      // Spoken once, politely: in the viewer through its own status (a modal dialog makes the page's announcer inert), on the page through announce.
      var status = dialog && dialog.querySelector('[role="status"]');
      if (status) { status.textContent = ''; setTimeout(function () { status.textContent = words; }, 30); } else _.announce(words);
    }
    // The next press of either download clears a failure's note; a refusal's stays, as long as the page is open.
    function reset() {
      if (!note) return;
      if (off) { note.textContent = REFUSED; return; }
      note.remove();
      made.splice(made.indexOf(note), 1);
      note = null;
    }
    function refuse() {
      off = true;
      png.setAttribute('aria-disabled', 'true');
      say(REFUSED);
      png.setAttribute('aria-describedby', note.id);
    }
    var titleId = dialog ? null : fig.getAttribute('aria-labelledby');
    var svg = button('Download SVG', function () {
      reset();
      diagramToSvg(fig).then(function (b) { save(b, exportName(fig, 'svg')); }, function (error) { say(FAILED.svg); console.error(error); });
    }, titleId, '-svg-words');
    var png = button('Download PNG', function () {
      if (off) return;
      reset();
      if (refused) { refuse(); return; }
      diagramToPng(fig).then(function (b) { save(b, exportName(fig, 'png')); }, function (error) {
        // The console keeps the developer's error, which names the img-src to allow.
        console.error(error);
        // The policy's refusal is named by the export (DiagramPolicyError), never read from its words.
        if (error && error.name === 'DiagramPolicyError') { refused = true; refuse(); } else say(FAILED.png);
      });
    }, titleId, '-png-words');
    var clear = foot.querySelector('.diagram-clear');
    foot.insertBefore(svg, clear);
    foot.insertBefore(png, clear);
    made.push(svg, png);
    return made;
  };
})(window.Basalt);
