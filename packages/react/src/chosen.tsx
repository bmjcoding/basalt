import * as React from "react";

type IconProps = { icon?: unknown; selected?: boolean; children?: React.ReactNode };

/** An `Icon` is the one element with an `icon` prop. */
const isIcon = (node: React.ReactNode): node is React.ReactElement<IconProps> => React.isValidElement<IconProps>(node) && node.props.icon !== undefined;

/**
 * Every icon in the item draws both of its forms in one box, the rest and the selected, and the stylesheet shows the one that
 * matches the item (`data-active` on a tab, `data-pressed` on a segment), crossfading over `duration-fast`. So the glyph takes its
 * selected form whenever its item is chosen, with a label or without one, and the box is the same either way: nothing moves. It
 * needs no state, so it works for an item an app draws itself (`render`). An icon the app set `selected` on is left as it is.
 */
function follow(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (node) => {
    if (isIcon(node)) {
      if (node.props.selected !== undefined) return node;
      return <span className="basalt-glyph-pair">{React.cloneElement(node, { selected: false, key: "rest" })}{React.cloneElement(node, { selected: true, key: "chosen" })}</span>;
    }
    if (React.isValidElement<IconProps>(node) && node.props.children !== undefined) return React.cloneElement(node, undefined, follow(node.props.children));
    return node;
  });
}

/**
 * What a chosen item shows (decisions 138 and 139): the chosen label is 600 in primary ink and a resting one is 400 in secondary,
 * and every label reserves its 600 width, so choosing moves nothing, whatever the label is.
 *
 * - Plain text, with or without icons: each run of text is drawn in a span that carries a copy of it in `data-label`, which the
 *   stylesheet lays out at 600, unseen, as the navigation's label does. The DOM holds the words once.
 * - Anything else (an element, a component, words inside a `span`): the content is drawn twice in one grid cell, the second copy at
 *   600, unseen, `aria-hidden` and inert, so the cell is as wide as the content at 600 whatever it holds. Duplicated `id`s are the
 *   app's to avoid, as with `Reserve`.
 * - Icons alone: there is no weight to show; the icon follows the choice (see `follow`).
 *
 * This wraps the item's children before the primitive sees them, so an item an app renders as its own element (`render`) reserves too.
 */
export function ChosenLabel({ children }: { children?: React.ReactNode }) {
  const nodes = React.Children.toArray(children);
  const texts = nodes.some((node) => (typeof node === "string" && node.trim() !== "") || typeof node === "number");
  const composed = nodes.some((node) => !(typeof node === "string" || typeof node === "number" || isIcon(node)));
  if (!texts && !composed) return <>{follow(children)}</>;
  if (composed) {
    return (
      <span className="basalt-chosen-label">
        <span>{follow(children)}</span>
        <span data-wide="" aria-hidden="true" inert>{follow(children)}</span>
      </span>
    );
  }
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
