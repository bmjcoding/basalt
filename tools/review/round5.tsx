import * as React from "react";
import { AlertExample, ComboboxExample, FormExample, MenuOptionsExample, NumberExample, SheetExample, SliderExample } from "../../packages/react/examples/completion";
import { Field, Fieldset, Input } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 };

export const ROUND_5: Round = {
  id: "5",
  reviewed: false,
  title: "Forms and overlays",
  summary: "Complete forms, searchable choices, numeric and range entry, safer confirmations, sheets and stateful menus. These additions are proposed for review.",
  steps: [
    {
      id: "form", name: "Form and Fieldset",
      intro: "Validate related fields together, then submit their named values. A fieldset gives a group a visible name and can disable it as one unit.",
      decisions: ["Form keeps Base UI's validation and field errors; values come from each Field's name.", "Labels stay visible. A failed submit focuses the first invalid field and shows instructions beside it.", "Fieldset uses a native legend, so its name and disabled state survive outside the visual design."],
      tryIt: ["Create a sandbox with the fields empty, then fill the name and choose a substrate.", "Submit again and inspect the saved values below the button. This demo only saves in memory."],
      demo: () => <div style={col}><FormExample /><Fieldset legend="Unavailable settings" disabled><Field label="Region"><Input defaultValue="us-central" /></Field></Fieldset></div>,
    },
    {
      id: "combobox", name: "Combobox",
      intro: "Search a list and choose a known value. Use Select for a short list that needs no search.",
      decisions: ["The display label can differ from the submitted value; a selected option gets a check as well as a wash.", "The input keeps focus while arrow keys move through results. Disabled options cannot be chosen.", "An explicit empty message explains a search with no matches. Tab dismisses the popup and continues through the form."],
      tryIt: ["Search for Kubernetes and select it with the keyboard.", "Search for something absent. Clear the query and try the disabled Hosted sandbox option."],
      states: ["open"],
      demo: ({ state }) => <div style={{ ...col, minHeight: state === "open" ? 240 : undefined }}><ComboboxExample open={state === "open"} /></div>,
    },
    {
      id: "number", name: "NumberField",
      intro: "Enter an exact numeric value, with locale-aware formatting and bounded stepping.",
      decisions: ["The input and both step buttons share one field label and boundary.", "Minimum, maximum, step, locale and number-format options pass through to Base UI.", "A button becomes unavailable at its bound. The keyboard and typed entry obey the same bounds."],
      tryIt: ["Step up to four, then down to one.", "Type another value, then Tab away. Try the arrow keys in the input."],
      demo: () => <div style={col}><NumberExample /></div>,
    },
    {
      id: "slider", name: "Slider",
      intro: "Adjust one value or a range when the relationship matters more than typing an exact number.",
      decisions: ["The track remains visible at the control-boundary contrast. The indicator and thumb are monochrome.", "Every thumb has a name; range ends get distinct names and meaningful spoken units.", "Arrow keys step, Home and End reach the bounds, and touch gets a 44px control area."],
      tryIt: ["Tab to each thumb and use the arrow keys.", "Compare the single request limit with the two-thumb duration range."],
      demo: () => <div style={col}><SliderExample /></div>,
    },
    {
      id: "alert", name: "AlertDialog",
      intro: "A deliberate confirmation for an irreversible action. It names the thing and explains the consequence.",
      decisions: ["The safe cancel action receives initial focus even when it appears second in the DOM.", "An outside click cannot confirm or dismiss it. Escape cancels and restores focus.", "The destructive action keeps the red text and hairline used by every Basalt danger button."],
      tryIt: ["Open it, check the focused action, then press Escape.", "Open it again and click outside. Choose Keep sandbox or Remove sandbox."],
      states: ["open"],
      demo: ({ state }) => <AlertExample open={state === "open"} />,
    },
    {
      id: "sheet", name: "Sheet",
      intro: "A modal panel for a task that benefits from more vertical room, such as editing settings.",
      decisions: ["Right, left and bottom share the dialog's surface, focus trap, scrim and focus return.", "An internal combobox or menu is above its parent panel. A confirmation opened from the panel covers it correctly.", "Sheets scroll internally, include safe-area padding, and become short fades under reduced motion."],
      tryIt: ["Open settings, change the agent, then save.", "Open the nested Remove sandbox confirmation and cancel it before returning to the settings."],
      states: ["right", "left", "bottom"],
      demo: ({ state }) => <SheetExample open={state !== "default"} side={state === "left" ? "left" : state === "bottom" ? "bottom" : "right"} />,
    },
    {
      id: "menu-options", name: "Menu choices and submenus",
      intro: "Checkbox and radio items express persistent settings; a submenu groups secondary actions.",
      decisions: ["Checks and filled radio marks make state readable without colour.", "Checkbox and radio changes keep the menu open so related settings can be adjusted together.", "ArrowRight opens a submenu; Escape returns to its parent, then to the original trigger."],
      tryIt: ["Toggle Show archived and switch row density.", "Open Export with the keyboard and select JSON. The local result appears below the trigger."],
      states: ["open"],
      demo: ({ state }) => <div style={{ minHeight: state === "open" ? 280 : undefined }}><MenuOptionsExample open={state === "open"} /></div>,
    },
  ],
};
