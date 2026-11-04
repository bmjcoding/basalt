// The completion previews reuse the same working examples as the browser tests and review
// rounds. Keep the wrapper small: behaviour lives in packages/react/examples/completion.tsx.
const doc = (name, body) => `# ${name}\n\n${body.trim()}\n`;
const preview = (group, height, expression) => `<!-- @dsCard group="${group}" height=${height} -->
<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}
</style></head><body><div id="root"></div><script>
var B=window.Basalt,h=React.createElement;
ReactDOM.createRoot(document.getElementById('root')).render(${expression});
</script></body></html>`;

export const COMPLETION_DOCS = {
  Form: doc("Form and Fieldset", `
Form coordinates validation and submission of named Fields. Fieldset groups related inputs with a required, visible legend. Both retain Base UI's props.

\`<Form onFormSubmit={values => save(values)}>\` receives values by Field name. Put native required/minLength/pattern constraints on text inputs, or provide Field validation. A failed submit focuses the invalid field. Pass server errors using Form's errors prop.

\`<Fieldset legend="Sandbox details" disabled>\` disables the group. Put a visible label on every Field, including controls inside the group. Give the submit Button \`type="submit"\`; other Basalt buttons default to button.

Form is generic: \`<Form<{name: string}> …>\` types the submit callback. Client validation does not replace validation in the receiving application.
`),
  Combobox: doc("Combobox", `
A searchable selection from known options. Use Select when a short list needs no search.

Provide \`options\` as \`{ value: string, label: string, disabled?: boolean }[]\` and wrap the control in a Field. The submitted value is the option value; the input displays its label. Controlled/uncontrolled selection, search input, validation and name props pass through to Base UI. Use inputProps for input-specific attributes and controlSize for xs–xl sizing.

Arrow keys move through results, Enter selects, Escape closes, and Tab closes before continuing through the form. No matches shows emptyMessage. Disabled options cannot be chosen. An open popup inside a Dialog or Sheet inherits the correct portal layer.

This wrapper is a single-value choice. Free text, asynchronous loading and multi-selection require a separate product API rather than overloading these option labels.
`),
  NumberField: doc("NumberField", `
An exact number with decrement/input/increment controls, labelled by its Field. Provide min, max, step, locale and format as needed; value/defaultValue and onValueChange follow Base UI.

Buttons and arrow keys obey the same bounds; reaching a bound disables that step button. Use decrementLabel and incrementLabel for context-specific or translated action names. Input-specific attributes belong in inputProps. Use controlSize for the shared five-size scale.

Use Slider for approximate adjustment; keep NumberField for precise entry. Values received by a server still need server validation.
`),
  Slider: doc("Slider", `
A named, bounded scalar or range. Provide a required label, min/max/step and value/defaultValue. An array creates one thumb per value. onValueChange and onValueCommitted retain Base UI's generic value types.

Range thumbs need distinct thumbLabels, such as Minimum duration and Maximum duration. Use getValueText to add spoken units. showValue=false hides the visible value without removing the thumb's accessible value.

Arrow keys step; Home and End reach bounds. The control has a 44px touch area. Vertical orientation is supported; give the parent enough height. Avoid a slider when a precise value is the primary task.
`),
  AlertDialog: doc("AlertDialog", `
A deliberate decision, usually before an irreversible action. Compose AlertDialogTrigger, Content, Title, Description and Actions. Use AlertDialogCancel for the safe action and AlertDialogAction for confirmation, rendering Basalt Buttons.

Cancel receives initial focus even if it appears second. An outside click does not dismiss the confirmation; Escape cancels and restores focus. Title names the thing, description states the consequence, and destructive confirmation uses variant=danger.

Use the action's onClick to perform the operation. Closing a dialog does not implement persistence, loading or error handling for a product. Give the safe action a specific label, such as Keep sandbox.
`),
  Sheet: doc("Sheet", `
A modal panel for a focused task that needs vertical space. Compose SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetActions and SheetClose. Content takes side=right (default), left or bottom.

Focus stays inside and returns to the trigger on close. The panel scrolls internally and includes device safe-area padding. Menus and comboboxes remain above it; a necessary confirmation can layer above the panel. Prefer one task at a time and keep nested confirmation exceptional.

Use a controlled open/onOpenChange pair when a successful form submission should close the panel. Motion follows the slower token and reduces to a fade when requested by the operating system.
`),

};

export const COMPLETION_PREVIEWS = {
  Form: preview("Forms", 510, "h(B.Examples.FormExample)"),
  Combobox: preview("Forms", 290, "h(B.Examples.ComboboxExample,{open:true})"),
  NumberField: preview("Forms", 135, "h(B.Examples.NumberExample)"),
  Slider: preview("Forms", 225, "h(B.Examples.SliderExample)"),
  AlertDialog: preview("Overlays", 360, "h(B.Examples.AlertExample,{open:true})"),
  Sheet: preview("Overlays", 560, "h(B.Examples.SheetExample,{open:true})"),

};
