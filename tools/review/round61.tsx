// Round 61: the agnosticism audit's fixes (cimip-gaps-2, batch AF; Sol's audit, DECISIONS 266). Decided and built by Opus on the no-council path (DECISIONS 226 and 265);
// Astra reviews the code and the lead checks the pixels; the implementation has not been reviewed. Every part whose behaviour changed, each in two unlike domains with
// synthetic words: a list in a pane that scrolls on its own (`scroller`), one FormGrid in a pane and in a wide dialog at one viewport, a field cleared while it is written
// (`writingEmpty`), loading with a date, a list and a known-empty field (`fillIn`), and an explainer on a header that does not sort.

import * as React from "react";

import { DocumentsLoading, FixedExplainers, FormPlaces, PaneList, RewriteFields } from "./af-demos";
import type { Round } from "./rounds";

const SHOT = { widths: [1440, 390], scales: [2], bleed: true, touch: true };

export const ROUND_61: Round = {
  id: "61",
  title: "Basalt for any app: a list's own scroller, a form grid that answers its width, a field cleared while written, known-empty data, an explainer on any header (cimip-gaps-2, AF)",
  reviewed: false,
  summary:
    "Sol's audit found Basalt still a general design system, with behaviour shaped around its first app. These are the fixes, each shown in two unlike domains: ListBand and BackToTop take a scroller (a pane that scrolls on its own), and the band's handoff waits for the page the press asked for and tells a filter by the app's filterKey; FormGrid answers its own width; the form dialog reads what is entered by the fields' structure and takes the app's own dirty answer; the loading helpers persist nothing on their own, merge plain records only and keep null as known-empty; a written field can show an empty value; and a header that does not sort can take an explainer, as a focus stop of its own. Decided and built by Opus on the no-council path; the implementation has not been reviewed.",
  steps: [
    {
      id: "pane-catalog",
      name: "A list in a pane: a shop's catalog",
      intro: "The app's main pane scrolls by itself beside a narrow aside, and the band is given that pane as its scroller.",
      decisions: [
        "`scroller` (an element or a ref) names what scrolls the list; the default is the window. The band sticks to the pane's top, a page change returns the pane to the band's rest, and Back to top watches and moves the pane.",
        "In a pane the band rests at the pane's top edge (`--basalt-sticky-offset` is 0 there); an app with a sticky header inside the pane sets the property on `.basalt-list-band-wrap` in its own CSS.",
        "The return to rest waits for the page or size asked for, with no timer, and is forgotten when `filterKey` changes or the app moves elsewhere. With a `filterKey`, a total that changes by itself never clears a page change's line.",
      ],
      tryIt: ["Scroll the pane: the band sticks to its top.", "Press Next while stuck: the pane comes back to the band's rest."],
      states: ["page-4", "back-down", "foot-end", "back-down-forced-colours", "page-4-reduced-motion"],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <PaneList domain="catalog" state={state} />,
    },
    {
      id: "pane-builds",
      name: "A list in a pane: a build pipeline",
      intro: "The same band over 412 synthetic builds, filtered by branch, in a pane of its own.",
      decisions: ["Every word is the app's: “Builds per page”, “Build pages, end of list”, “Showing 103 of 412 builds”."],
      tryIt: ["Choose a branch: the list returns to page 1 and the band's line clears; the result line speaks the filter."],
      states: ["filtered", "back-down", "filtered-forced-colours"],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <PaneList domain="builds" state={state} />,
    },
    {
      id: "form-account",
      name: "One form grid, two places: account details",
      intro: "At one desktop viewport the form is one column in a 360 pane and two columns in the wide dialog.",
      decisions: [
        "FormGrid is the columns where its own width is at least 640 and the window at least 720; one column in the markup's order anywhere else. The phone stack is unchanged.",
        "The form dialog reads what is entered by the fields' structure: a multi-select's chosen values, checked boxes and radios, a file input's files, and text. `dirty` on `DialogContent` is the app's own answer and wins when given.",
      ],
      tryIt: ["Tick a topic in the dialog and press the scrim: it stays open."],
      states: ["dialog", "dialog-forced-colours", "reduced-motion"],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <FormPlaces form="account" state={state} />,
    },
    {
      id: "form-delivery",
      name: "One form grid, two places: a delivery address",
      intro: "A shop's delivery form, in the same two places.",
      decisions: ["The same rule: the width the grid is given decides its columns, not the window's."],
      tryIt: ["Open it in the dialog and compare the columns with the pane's one column."],
      states: ["dialog", "dialog-reduced-motion"],
      ...SHOT,
      height: 900,
      demo: ({ state }) => <FormPlaces form="shipping" state={state} />,
    },
    {
      id: "written",
      name: "A field written into: keep or clear",
      intro: "A product listing translated again and a support reply drafted again. `rewriting` keeps the last text (the default); `cleared` shows the empty value with the busy look kept (`writingEmpty=\"clear\"`).",
      decisions: ["`writingEmpty` is the app's choice; today's behaviour (`keep`) stays the default."],
      tryIt: ["Press Translate again or Draft again."],
      states: ["rewriting", "cleared", "cleared-forced-colours", "cleared-reduced-motion"],
      widths: [1440, 390],
      scales: [2],
      height: 520,
      demo: ({ state }) => <RewriteFields key={state} state={state} />,
    },
    {
      id: "documents",
      name: "Loading with another data shape: shared documents",
      intro: "Rows with a Date, an array of editors and a note that may be empty; a cache knows the titles and that two notes are empty.",
      decisions: [
        "`fillIn` merges plain records only; a Date, an array and every atomic value are taken as given. `undefined` is unknown (stood in), `null` is known-empty (drawn empty).",
        "`rememberCount` keeps a count where the app says (a `CountStore`), or for the page's life: nothing is written to the origin's storage unless the app asks. The stand-in words are neutral.",
      ],
      tryIt: ["Compare “full” with “prefill”."],
      states: ["full", "prefill", "prefill-forced-colours", "prefill-reduced-motion"],
      ...SHOT,
      height: 700,
      demo: ({ state }) => <DocumentsLoading state={state} />,
    },
    {
      id: "explainers",
      name: "An explainer on a header that does not sort",
      intro: "A price table (“Fair use”) and energy readings (“Normalised”), neither sortable. The header cell itself is the opener: a focus stop with the still table's −2 inset ring, described by the card's words.",
      decisions: [
        "A header that does not sort becomes a focus stop (`tabindex=\"0\"`) while it has an explainer; it keeps its role and name (a column header), and nothing new is drawn in the header, so no column reserves a trigger's seat.",
        "It opens as on a sortable header: hover after 600ms, keyboard focus at once, a long press on touch; a press does nothing else. The card is the same popover: above the header, else beside it, never over its column.",
        "The HTML skill's explainer stays on sortable headers; this form is React's alone.",
      ],
      tryIt: ["Tab from “Compare plans”: focus lands on “Fair use” and the card opens; Esc closes it and the ring stays.", "Hover “Normalised” for 600ms."],
      states: ["explain-hover", "explain-focus", "explain-touch", "explain-focus-forced-colours", "explain-hover-reduced-motion"],
      ...SHOT,
      height: 700,
      demo: () => <FixedExplainers />,
    },
  ],
};
