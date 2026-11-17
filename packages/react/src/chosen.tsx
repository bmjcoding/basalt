import * as React from "react";

type IconProps = { icon?: unknown; selected?: boolean; label?: string; children?: React.ReactNode };
type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

/** An `Icon` is the one element with an `icon` prop. */
const isIcon = (node: React.ReactNode): node is React.ReactElement<IconProps> => React.isValidElement<IconProps>(node) && node.props.icon !== undefined;

/**
 * Every icon in the item draws both of its forms in one box, the rest and the selected, and the stylesheet shows the one that
 * matches the item (`data-active` on a tab, `data-pressed` on a segment), crossfading over `duration-fast`. So the glyph takes its
 * selected form whenever its item is chosen, with a label or without one, and the box is the same either way: nothing moves. It
 * needs no state, so it works for an item an app draws itself (`render`). An icon the app set `selected` on is left as it is. An
 * icon that carries a `label` names the item once: the rest form keeps the name and the selected form is hidden from assistive
 * technology.
 */
function follow(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (node) => {
    if (isIcon(node)) {
      if (node.props.selected !== undefined) return node;
      return <span className="basalt-glyph-pair">{React.cloneElement(node, { selected: false, key: "rest" })}{React.cloneElement(node, { selected: true, label: undefined, key: "chosen" })}</span>;
    }
    if (React.isValidElement<IconProps>(node) && node.props.children !== undefined) return React.cloneElement(node, undefined, follow(node.props.children));
    return node;
  });
}

// The second copy of a label is there for its width and for nothing else, so it may hold nothing that can be resolved to, found, or submitted.
const REFERENCES = ["id", "name", "form", "htmlFor", "list", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-activedescendant", "aria-details", "aria-errormessage"];
// Twin of reserve()'s decline list in tools/html-skill/src/core.js; anything that takes input, submits, loads or plays cannot be copied.
const UNSAFE = "input,select,textarea,button,form,iframe,object,embed,script,style,video,audio,canvas,dialog,template,slot";

/** Whether the label's content can be copied for its width: text, `Icon`s, plain elements and components. What a component renders is its own, so its copy is checked once it is drawn (see `ReservedLabel`). */
function copyable(children: React.ReactNode): boolean {
  return React.Children.toArray(children).every((node) => {
    if (!React.isValidElement<AnyProps>(node)) return true;
    if (isIcon(node)) return true;
    if (node.type === React.Fragment) return copyable(node.props.children);
    if (typeof node.type === "string" && UNSAFE.split(",").includes(node.type)) return false;
    return copyable(node.props.children);
  });
}

const ATTRIBUTES = ["id", "name", "form", "for", "list", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-activedescendant", "aria-details", "aria-errormessage"];

/** Native elements are cleaned in props already; only an opaque component needs the DOM observer. */
function holdsComponent(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((node) => React.isValidElement<AnyProps>(node) && !isIcon(node) &&
    ((typeof node.type !== "string" && node.type !== React.Fragment) || holdsComponent(node.props.children)));
}

/**
 * The label's content drawn twice in one grid cell, the second copy for its width. The copy of a plain element or an `Icon` is cleaned in
 * props (`stripped`). The copy of a component is cleaned in the DOM, in a layout effect (before a client mount paints, but after server HTML can paint) and by an observer
 * (so after every update, however the component re-renders): its ids, names and references are removed. A component that renders anything
 * in `UNSAFE` (a hidden input included) is not reserved at all, and that is decided at client mount: its label keeps its weight.
 */
function ReservedLabel({ children }: { children: React.ReactNode }) {
  const copy = React.useRef<HTMLSpanElement>(null);
  const [declined, setDeclined] = React.useState(false);
  const observed = holdsComponent(children);
  React.useLayoutEffect(() => {
    const element = copy.current;
    if (!element || !observed) return undefined;
    const clean = () => {
      if (element.querySelector(UNSAFE)) { setDeclined(true); return; }
      for (const node of [element, ...Array.from(element.querySelectorAll("*"))]) {
        for (const name of ATTRIBUTES) node.removeAttribute(name);
        for (const attribute of Array.from(node.attributes)) if (attribute.value.includes("url(#")) node.removeAttribute(attribute.name);
      }
    };
    clean();
    const observer = new MutationObserver(clean);
    observer.observe(element, { subtree: true, childList: true, attributes: true });
    return () => observer.disconnect();
  }, [observed, declined]);
  if (declined) return <>{follow(children)}</>;
  return (
    <span className="basalt-chosen-label">
      <span>{follow(children)}</span>
      <span ref={copy} data-wide="" aria-hidden="true" inert>{follow(stripped(withoutRefs(children)))}</span>
    </span>
  );
}

/** Clear every app ref in the width copy, including nested React children, while preserving ordinary component props. */
function withoutRefs(children: React.ReactNode): React.ReactNode {
  if (children && typeof children === "object" && Symbol.iterator in children) return Array.from(children as Iterable<React.ReactNode>, withoutRefs);
  if (!React.isValidElement<AnyProps>(children)) return children;
  // React 19 cloneElement keeps a ref for undefined; null clears it. Fragments accept only key and children.
  return React.cloneElement(children, children.type === React.Fragment ? undefined : { ref: null },
    ...(children.props.children === undefined ? [] : [withoutRefs(children.props.children)]));
}

/** The same content with no `id`, no `name`, no reference to either and no hidden control (nothing a `for`, an `aria-labelledby`, a `url(#…)` or a form can resolve to). */
function stripped(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (node) => {
    if (!React.isValidElement<AnyProps>(node)) return node;
    if (isIcon(node)) return React.cloneElement(node, { label: undefined });
    // Component props named id, name or a reference may be the words it displays. Only DOM attributes can be stripped here.
    if (typeof node.type !== "string") return node.type === React.Fragment ? React.cloneElement(node, undefined, stripped(node.props.children)) : node;
    const overrides: AnyProps = {};
    for (const [key, value] of Object.entries(node.props)) if (REFERENCES.includes(key) || (key !== "children" && typeof value === "string" && value.includes("url(#"))) overrides[key] = undefined;
    for (const key of REFERENCES) overrides[key] = undefined;
    const style = node.props.style;
    if (style && typeof style === "object" && Object.values(style).some((value) => typeof value === "string" && value.includes("url(#"))) overrides.style = undefined;
    return React.cloneElement(node, overrides, ...(node.props.children === undefined ? [] : [stripped(node.props.children)]));
  });
}

/**
 * What a chosen item shows (decisions 138, 139 and 149): the chosen label is 600 in primary ink and a resting one is 400 in secondary,
 * and every label Basalt can see reserves its 600 width, so choosing moves nothing. The 600 is on the label, not on the item, so words
 * Basalt cannot see keep their weight and move nothing.
 *
 * - Plain text, with or without icons: each run of text is drawn in a span that carries a copy of it in `data-label`, which the
 *   stylesheet lays out at 600, unseen, as the navigation's label does. The DOM holds the words once.
 * - Text with plain elements and icons (words in a `span`): the content is drawn twice in one grid cell, the second copy at 600,
 *   unseen, `aria-hidden` and inert, and stripped of anything an id, a name or a reference could resolve to.
 * - A component (a Phosphor icon, an app's own small component) is copied too, and the copy is cleaned in the DOM (see `ReservedLabel`).
 * - A control (a hidden input included), a frame, media, or a component that renders one: it cannot be copied without risking a duplicate, so it
 *   is not reserved and does not change weight when chosen. The same holds for words an app's own `render` supplies: Basalt never
 *   sees them.
 * - Icons alone: there is no weight to show; the icon follows the choice (see `follow`).
 *
 * This wraps the item's children before the primitive sees them, so an item an app renders as its own element (`render`) reserves too.
 */
export function ChosenLabel({ children }: { children?: React.ReactNode }) {
  const nodes = React.Children.toArray(children);
  const texts = nodes.some((node) => (typeof node === "string" && node.trim() !== "") || typeof node === "number");
  const composed = nodes.some((node) => !(typeof node === "string" || typeof node === "number" || isIcon(node)));
  if (composed && !copyable(children)) return <>{follow(children)}</>;
  if (!texts && !composed) return <>{follow(children)}</>;
  if (composed) return <ReservedLabel>{children}</ReservedLabel>;
  const parts: React.ReactNode[] = [];
  let run = "";
  const flush = () => {
    if (run) parts.push(<span key={`text-${parts.length}`} data-label={run}>{run}</span>);
    run = "";
  };
  for (const node of nodes) {
    if (typeof node === "string" || typeof node === "number") run += node;
    else { flush(); parts.push(node); }
  }
  flush();
  return <>{follow(parts)}</>;
}
