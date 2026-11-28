// Where Basalt has a proven part (the advisory `basalt/primitive`): a competing library's import, a Phosphor icon the core set draws, and a few native
// elements with a Basalt part of the same contract. Each suggestion is checked against the installed exports, so a message never names a part the
// release does not have. Never a blanket native ban: a row action, a hidden file input and a `render` target keep their own element.

/** A part's name in a library → Basalt's. The library's own name is tried first, so most entries are only where the names differ. */
const PARTS = {
  "alert-dialog": "AlertDialog", dialog: "Dialog", modal: "Dialog", popover: "Popover", "hover-card": "Popover", tooltip: "Tooltip",
  "dropdown-menu": "Menu", "context-menu": "Menu", menubar: "Menu", menu: "Menu", select: "Select", listbox: "Listbox", combobox: "Combobox",
  autocomplete: "Combobox", tabs: "Tabs", tab: "Tabs", switch: "Switch", checkbox: "Checkbox", "radio-group": "RadioGroup", radio: "Radio",
  slider: "Slider", progress: "Progress", meter: "Meter", separator: "Separator", divider: "Separator", accordion: "Accordion",
  collapsible: "Disclosure", disclosure: "Disclosure", toast: "ToastProvider", avatar: "Avatar", "toggle-group": "SegmentedControl",
  "segmented-control": "SegmentedControl", toolbar: "Toolbar", "navigation-menu": "Nav", "visually-hidden": "VisuallyHidden", "number-field": "NumberField",
  label: "Field", form: "Form", field: "Field", input: "Input", textarea: "Textarea", fieldset: "Fieldset", table: "Table", badge: "Badge",
  card: "Card", kbd: "Kbd", skeleton: "Skeleton", spinner: "Spinner", pagination: "Pagination", breadcrumbs: "Breadcrumbs", breadcrumb: "Breadcrumbs",
  drawer: "Sheet", sheet: "Sheet", "scroll-area": null, portal: null, slot: null, "focus-scope": null, "dismissable-layer": null,
};
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const pascal = (name) => name.split(/[-_/]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");

/** Libraries whose parts compete with Basalt's, by import specifier. `part` is the module's own part (the Radix form), else the imported name is. */
const LIBRARIES = [
  { test: /^@radix-ui\/react-([\w-]+)$/, label: "Radix", part: (m) => m[1] },
  { test: /^radix-ui$/, label: "Radix" },
  { test: /^@base-ui\/react\/([\w-]+)$/, label: "Base UI", part: (m) => m[1], note: "Basalt wraps Base UI and styles it" },
  { test: /^@base-ui\/react$/, label: "Base UI", note: "Basalt wraps Base UI and styles it" },
  { test: /^@base-ui-components\/react(\/([\w-]+))?$/, label: "Base UI", part: (m) => m[2], note: "Basalt wraps Base UI and styles it" },
  { test: /^@headlessui\/react$/, label: "Headless UI" },
  { test: /^react-aria-components$|^@react-aria\/|^@react-spectrum\//, label: "React Aria" },
  { test: /^@ariakit\/react/, label: "Ariakit" },
  { test: /^@ark-ui\/react/, label: "Ark UI" },
  { test: /^@mui\/(material|joy|base)/, label: "MUI" },
  { test: /^@chakra-ui\//, label: "Chakra UI" },
  { test: /^@mantine\//, label: "Mantine" },
  { test: /^antd$/, label: "Ant Design" },
  { test: /^react-bootstrap$/, label: "React Bootstrap" },
  { test: /^@fluentui\//, label: "Fluent UI" },
  { test: /^@(nextui-org|heroui)\/react$/, label: "HeroUI" },
  { test: /^semantic-ui-react$/, label: "Semantic UI" },
  { test: /^react-modal$/, label: "react-modal", whole: "Dialog" },
  { test: /^react-select(\/|$)/, label: "react-select", whole: "Select", also: ["Combobox", "MultiSelect"] },
  { test: /^(react-tooltip|@tippyjs\/react)$/, label: "a tooltip library", whole: "Tooltip" },
  { test: /^(sonner|react-hot-toast|react-toastify|notistack)$/, label: "a toast library", whole: "ToastProvider", also: ["useToast"] },
  { test: /^cmdk$/, label: "cmdk", whole: "CommandMenu", also: ["CommandList"], note: "Basalt's command menu is built on it" },
  { test: /^(react-syntax-highlighter|prismjs|highlight\.js|shiki)(\/|$)/, label: "a highlighter", whole: "CodeBlock", note: "it loads Shiki on demand" },
];
const ICON_LIBRARIES = /^(lucide-react|react-icons(\/.*)?|@heroicons\/react(\/.*)?|@tabler\/icons-react|react-feather|@radix-ui\/react-icons|@fortawesome\/react-fontawesome|@mui\/icons-material(\/.*)?|iconoir-react|@iconify\/react)$/;
const PHOSPHOR = /^@phosphor-icons\/react(\/.*)?$/;
/** Phosphor's names for what the core set draws (foundations: Icons). Only these; every other Phosphor icon is Basalt's long tail. */
const CORE_FROM_PHOSPHOR = {
  Check: "CheckGlyph", X: "CloseGlyph", CaretDown: "ChevronDownGlyph", CaretUp: "ChevronUpGlyph", CaretLeft: "ChevronLeftGlyph", CaretRight: "ChevronRightGlyph",
  Copy: "CopyGlyph", Plus: "PlusGlyph", Minus: "MinusGlyph", MagnifyingGlass: "SearchGlyph", ArrowLeft: "ArrowLeftGlyph", ArrowRight: "ArrowRightGlyph",
  ArrowUp: "ArrowUpGlyph", ArrowDown: "ArrowDownGlyph", ArrowSquareOut: "ExternalGlyph", Trash: "TrashGlyph", House: "HomeGlyph", Gear: "SettingsGlyph",
  Bell: "NotificationsGlyph", Play: "PlayGlyph", Pause: "PauseGlyph", DotsThree: "MoreGlyph", List: "MenuGlyph", CalendarBlank: "CalendarGlyph",
  Keyboard: "KeyboardGlyph", DownloadSimple: "DownloadGlyph",
};

/**
 * The advisory for one import declaration, or null.
 * @param {string} source the module specifier
 * @param {string[]} names the imported names (`default` for a default import, `*` for a namespace)
 * @param {(name: string) => boolean} has whether the installed Basalt exports a name
 */
export function competingImport(source, names, has) {
  if (PHOSPHOR.test(source)) {
    const core = names.map((n) => [n, CORE_FROM_PHOSPHOR[n.replace(/Icon$/, "")]]).filter(([, g]) => g && has(g));
    if (!core.length) return null;
    return `the core set draws ${core.map(([n, g]) => `${n} as \`${g}\``).join(", ")} (foundations: Icons); import ${core.length > 1 ? "them" : "it"} from @srasyndicate/basalt and keep Phosphor for what the core set does not draw`;
  }
  if (ICON_LIBRARIES.test(source)) {
    return `Basalt's icons are its core set (\`CheckGlyph\` and the rest, from @srasyndicate/basalt) and Phosphor Bold for the long tail (@phosphor-icons/react, drawn through \`Icon\`), never ${source}`;
  }
  for (const lib of LIBRARIES) {
    const m = lib.test.exec(source);
    if (!m) continue;
    const found = new Set();
    if (lib.whole) for (const n of [lib.whole, ...(lib.also ?? [])]) if (has(n)) found.add(n);
    const fromPart = lib.part?.(m);
    for (const raw of fromPart ? [fromPart] : names.filter((n) => n !== "*" && n !== "default")) {
      const own = pascal(raw);
      const mapped = PARTS[kebab(raw)];
      if (mapped === null) continue;
      if (has(own)) found.add(own);
      else if (mapped && has(mapped)) found.add(mapped);
    }
    const parts = [...found];
    const named = parts.length ? `use ${parts.map((p) => `\`${p}\``).join(" or ")} from @srasyndicate/basalt` : "Basalt is this app's component layer: use its part for this, or record why there is none";
    return `${source} is ${lib.label}; ${named}${lib.note ? ` (${lib.note})` : ""}`;
  }
  return null;
}

/** Text-like input types: an `Input` in a `Field`. */
const TEXT_INPUTS = new Set(["text", "email", "password", "url", "tel"]);

/**
 * The advisory for one native element, or null.
 * @param {string} tag
 * @param {Map<string, any>} attrs attribute name → static value (a string), `true` when present without one, `undefined` when computed
 * @param {{ inRender: boolean, inRow: boolean, hasSpread: boolean, children: string[] }} where
 * @param {(name: string) => boolean} has
 */
export function nativeElement(tag, attrs, where, has) {
  if (where.inRender || where.hasSpread || attrs.has("role")) return null;
  const hidden = attrs.has("hidden") || attrs.get("aria-hidden") === "true" || attrs.get("aria-hidden") === true || /(^|\s)(basalt-)?(visually-hidden|sr-only|hidden)(\s|$)/.test(String(attrs.get("className") ?? ""));
  const pick = (...names) => names.filter(has);
  const say = (parts, extra = "") => (parts.length ? `use ${parts.map((p) => `\`${p}\``).join(" or ")} from @srasyndicate/basalt${extra}` : null);
  switch (tag) {
    case "button": {
      // A row's own action (a link-like button in a list or table row) has a different contract: Basalt's rows (ListBand, PanelRow) or the app's.
      if (where.inRow || hidden) return null;
      // A composite (several parts, or block content) is a row or a card target, not an action button.
      if (where.children.length > 1 || where.children.some((c) => /^(div|ul|ol|li|p|h[1-6]|table|section|article|img|figure)$/.test(c))) return null;
      const iconOnly = where.children.length > 0 && where.children.every((c) => /^[A-Z]/.test(c)) && !where.text;
      return say(iconOnly ? pick("IconButton") : pick("Button"), iconOnly ? " (its `label` names it)" : has("TextButton") ? " (`variant` and `size` for its look), or `TextButton` for one that reads as a link" : " (`variant` and `size` for its look)");
    }
    case "input": {
      if (hidden) return null;
      const type = String(attrs.get("type") ?? "text").toLowerCase();
      if (attrs.get("type") === undefined && attrs.has("type")) return null;
      if (type === "checkbox") return say(pick("Checkbox", "SwitchRow"));
      if (type === "radio") return say(pick("RadioGroup", "Radio"));
      if (type === "range") return say(pick("Slider"));
      if (type === "number") return say(pick("NumberField"));
      if (type === "search") return say(pick("SearchField", "Input"));
      if (type === "file") return say(pick("FileInput"));
      if (TEXT_INPUTS.has(type)) return say(pick("Input"), " in a `Field`, which labels it");
      return null;
    }
    case "select": return say(pick("Select"));
    case "textarea": return say(pick("Textarea"), " in a `Field`");
    case "dialog": return say(pick("Dialog", "AlertDialog", "Sheet"));
    case "progress": return say(pick("Progress"));
    case "meter": return say(pick("Meter"));
    case "hr": return say(pick("Separator"));
    case "kbd": return say(pick("Kbd"));
    case "table": return say(pick("Table"), " (the still table: fixed columns, sortable headers)");
    case "details": return say(pick("Disclosure", "Accordion"));
    default: return null;
  }
}
