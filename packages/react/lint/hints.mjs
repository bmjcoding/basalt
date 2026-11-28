// The fix-it message for an appearance override on a Basalt component: it names the prop that sets that look, read from the installed declarations.
import { group, HOOKS } from "./appearance.mjs";

const EXCEPTION = "basalt-lint-disable-next-line basalt/no-restyle -- <reason>";

/** The prop that sets a component's size (`size`, or a field's `controlSize`), or null. */
export const sizeProp = (info) => (info?.props.has("size") ? "size" : info?.props.has("controlSize") ? "controlSize" : null);

const list = (values) => (values.length ? ` (${values.map((v) => `"${v}"`).join(" | ")})` : "");

/**
 * @param {{ components: Map<string, any>, has: (name: string) => boolean } | null} vocabulary the installed Basalt (vocabulary.mjs)
 * @param {string | null} component the export's name, or null for a Basalt class no export owns
 * @param {string} property kebab-case
 * @param {{ className?: string, exception?: string }} [options]
 */
export function restyleHint(vocabulary, component, property, options = {}) {
  const info = component ? vocabulary?.components.get(component) : null;
  const props = info?.props ?? new Set();
  const name = component ? `\`${component}\`` : `\`.${options.className}\``;
  const prop = (p) => `use ${name}'s \`${p}\` prop${list(info.valuesOf(p))}`;
  const sized = sizeProp(info);
  const g = group(property);
  let advice;
  if (g === "token") {
    const isToken = vocabulary?.tokens?.names.has(property.replace(/^--basalt-/, ""));
    advice = isToken
      ? `it sets Basalt's token \`${property}\` for what it covers; a token is design, decided by Basalt's panel, not an app's`
      : `\`${property}\` is Basalt's own (a measurement or a part's private value), not one of the hooks an app sets (${[...HOOKS].map((h) => `\`${h}\``).join(", ")})`;
  }
  else if (g === "padding") advice = sized ? `${prop(sized)}; for space between controls, set the parent's \`gap\`` : `${name} sets its own padding; space around it is the parent's \`gap\` or a wrapper's margin`;
  else if (g === "height") advice = sized ? prop(sized) : `${name} sets its own height`;
  else if (g === "type-size") advice = sized ? prop(sized) : `${name} sets its own type${vocabulary?.has("Text") ? "; for words of another size, use `Text`'s `size`" : ""}`;
  else if (g === "weight") advice = `weight marks what is selected in Basalt (foundations: Selected); ${name} sets it`;
  else if (g === "type") advice = `${name} sets its own type`;
  else if (g === "radius") advice = `radius follows the size a box is drawn at (foundations: Radius by role); ${sized ? prop(sized) : `${name} sets it`}`;
  else if (g === "colour") {
    advice = props.has("variant") ? prop("variant") : props.has("tone") ? prop("tone") : `${name} draws its colours from role tokens`;
  } else if (g === "motion") advice = `motion comes from Basalt's duration and easing tokens; ${name} sets its own`;
  else if (g === "inner-layout") advice = `${name} lays out its own parts`;
  else advice = `${name}'s look comes from its props`;
  const lead = g === "token" ? "If it must stay, record why" : "Put layout on a wrapper, or record why";
  return `${advice}. ${lead}: ${options.exception ?? EXCEPTION}`;
}
