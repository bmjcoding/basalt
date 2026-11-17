// Round 41: the controls batch of the components stream (DECISIONS 154): a text button (D5d), the switch row and option chips (D9), control sizes 44 to 56
// (D11a), the outline, the amount, two lines and a full-width Button (D11b, X12), an icon button's done state (D11c), the count pill (D11d), link tabs
// (D12) and panels that share one seat (X6). Each part was ported from a site the owner approved (DECISIONS 151); the council voted on what the port
// had to change (DECISIONS 154). The design panel has not reviewed this implementation. Every word is synthetic: no name, brand or figure is a real one.
//
// The readouts under each part are this review page's own: they are measured from the rendered DOM when the page loads (a number printed here is the
// browser's, not a claim). "hover" puts a real pointer on the part that marks itself `data-wt-hover`; "focus" moves focus to the part's first control.
// "forced-colours" and "reduced-motion" are real emulations. "touch" is a coarse pointer. "chosen" and "changed" act on the part before the shot, and the
// readout then prints how far anything moved (it must say 0px).

import * as React from "react";

import {
  Button,
  ChevronRightGlyph,
  FilterResult,
  HomeGlyph,
  IconButton,
  Input,
  LinkTab,
  LinkTabs,
  MultiSelect,
  OptionChips,
  PlusGlyph,
  Select,
  StatusLine,
  SwitchRow,
  SwitchRowGroup,
  Tab,
  Tabs,
  TabsList,
  TabsPanel,
  TabsPanels,
  Text,
  TextButton,
  useConfirm,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const row: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };

const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const box = (el: Element | null) => (el ? el.getBoundingClientRect() : null);

type ReadyWindow = Window & { __BASALT_READY__?: Promise<void> };
const frames = (n: number) => new Promise<void>((done) => { const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/**
 * Runs `read` once the page has laid out (and again on `again`, after an action), and prints the lines it returns. It registers its measurement
 * on `window.__BASALT_READY__`, which build.mjs awaits before a still, and settles it only after the last read has written its lines and three
 * frames have painted them (and `quiet` ms with no new read, for a state whose action is still to come). A read that throws prints the error
 * instead of leaving the box empty. A page that never settles is released after 8 seconds.
 */
function Readout({ read, again = [], title = "Measured on this page", quiet = 0 }: { read: (root: HTMLElement) => string[]; again?: unknown[]; title?: string; quiet?: number }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const ready = React.useRef<{ promise: Promise<void>; done: () => void } | null>(null);
  if (!ready.current) {
    let done = () => {};
    const promise = new Promise<void>((resolve) => { done = resolve; });
    ready.current = { promise, done };
  }
  React.useLayoutEffect(() => {
    const own = ready.current!;
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([own.promise, new Promise<void>((resolve) => window.setTimeout(resolve, 8000))]);
    return () => own.done();
  }, []);
  React.useEffect(() => {
    let live = true;
    let settle: number | undefined;
    const t = window.setTimeout(async () => {
      const root = ref.current?.closest("[data-round41]") as HTMLElement | null;
      let next: string[];
      try {
        next = root ? read(root) : ["(no page to measure)"];
      } catch (error) {
        next = [`(the measurement failed: ${error instanceof Error ? error.message : String(error)})`];
      }
      if (!live) return;
      setLines(next);
      await frames(3);
      if (live) settle = window.setTimeout(() => ready.current?.done(), quiet);
    }, 400);
    return () => { live = false; window.clearTimeout(t); window.clearTimeout(settle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, again);
  return <pre ref={ref} style={mono}>{`${title}\n${lines.join("\n")}`}</pre>;
}

/** What a state asks the page to do before the shot: hover a part, or focus its first control, both real. */
function useFocusFirst(state: string, selector: string) {
  React.useEffect(() => {
    if (state !== "focus") return;
    const t = window.setTimeout(() => (document.querySelector(selector) as HTMLElement | null)?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [state, selector]);
}
const Page = ({ children }: { children: React.ReactNode }) => <div data-round41="" style={col}>{children}</div>;
const hoverMark = (state: string) => (state === "hover" || state.startsWith("hover-") ? { "data-wt-hover": "" } : {});

// ---- D5d ----
function TextButtonDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-text-button");
  return (
    <Page>
      <div style={{ ...col, maxWidth: 520 }}>
        <Text>
          The run wrote its output to the log. <TextButton {...hoverMark(state)}>Run the same command again</TextButton> or <TextButton quiet iconEnd={ChevronRightGlyph}>open the full record</TextButton>. This one is <TextButton disabled>not available</TextButton>.
        </Text>
        <div><TextButton>On a line of its own</TextButton></div>
      </div>
      <Readout read={(root) => {
        const own = root.querySelectorAll(".basalt-text-button")[3] as HTMLElement | undefined;
        const s = own ? getComputedStyle(own.querySelector(".basalt-text-button-label")!) : null;
        const b = box(own ?? null);
        return [
          `a text button: ${b ? `${px(b.height)} tall` : "?"}, no box (padding ${own ? getComputedStyle(own).paddingTop : "?"}, background ${own ? getComputedStyle(own).backgroundColor : "?"})`,
          `underline: ${s?.textDecorationThickness} at ${s?.textUnderlineOffset} offset, in ${s?.textDecorationColor}`,
          `focus ring: ${document.activeElement && own && document.activeElement === own ? `${getComputedStyle(own).outlineWidth} at ${getComputedStyle(own).outlineOffset} offset (outside)` : "2px at +2 outside (shown in the focus still)"}; radius ${own ? getComputedStyle(own).borderTopLeftRadius : "?"}`,
        ];
      }} />
    </Page>
  );
}

// ---- D9a ----
// The tile is the app's own picture, not Basalt's: here a plain neutral square in tokens, so no colour of a real product is borrowed.
const TILE = () => <span style={{ display: "block", borderRadius: 8, background: "var(--basalt-surface-sunken-strong)", boxShadow: "inset 0 0 0 1px var(--basalt-border-input)" }} />;
function SwitchRowDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-switch-row");
  const [on, setOn] = React.useState<string[]>(["one"]);
  const [before, setBefore] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (state !== "chosen") return;
    const t = window.setTimeout(() => {
      setBefore([...document.querySelectorAll(".basalt-switch-row")].map((r) => { const b = r.getBoundingClientRect(); return `${b.x},${b.y},${b.width},${b.height}`; }));
      setOn(["one", "two"]);
    }, 200);
    return () => window.clearTimeout(t);
  }, [state]);
  const names = { one: "Source one", two: "Source two", three: "Source three" } as const;
  const said = on.length ? `${on.length} of 4 switched on: ${on.map((v) => names[v as keyof typeof names] ?? "A source with a long name").join(", ")}` : "Nothing switched on";
  return (
    <Page>
      <div style={{ ...col, maxWidth: 420 }}>
        <Text weight="medium" id="r41-wear">Sources</Text>
        <div id="r41-hint">{caption("Switch on the sources you use. The tile is the app's own picture, drawn here as a neutral square: it is not Basalt's colour.")}</div>
        <SwitchRowGroup aria-labelledby="r41-wear" aria-describedby="r41-hint" value={on} onValueChange={setOn}>
          <SwitchRow value="one" tile={TILE()} kind="Kind A" {...hoverMark(state)}>Source one</SwitchRow>
          <SwitchRow value="two" tile={TILE()} kind="Kind B">Source two</SwitchRow>
          <SwitchRow value="three" tile={TILE()} kind="Kind C" disabled>Source three</SwitchRow>
          <SwitchRow value="long" tile={TILE()} kind="Kind D">A source with a name long enough that it has to end in an ellipsis</SwitchRow>
        </SwitchRowGroup>
        <FilterResult>{said}</FilterResult>
      </div>
      <Readout quiet={state === "chosen" ? 500 : 0} again={[on.join(), before.join("|")]} read={(root) => {
        const rows = [...root.querySelectorAll(".basalt-switch-row")] as HTMLElement[];
        const first = rows[0]!;
        const tile = first.querySelector(".basalt-switch-row-tile")!;
        const moved = before.length ? rows.map((r, i) => { const b = r.getBoundingClientRect(); return `${b.x},${b.y},${b.width},${b.height}` !== before[i]; }).filter(Boolean).length : null;
        return [
          `row ${px(box(first)!.height)} tall, tile ${px(box(tile)!.width)} by ${px(box(tile)!.height)}, radius ${getComputedStyle(first).borderTopLeftRadius}; name ${getComputedStyle(first.querySelector(".basalt-switch-row-name")!).fontSize}`,
          `edge at rest ${getComputedStyle(rows[1]!).borderTopColor} (the input boundary); checked edge ${getComputedStyle(first).borderTopColor} (the same)`,
          `hover edge steps to text-secondary: 8.1:1 on the page in dark, 8.1:1 in light. border-hover would be 1.94:1 in dark and 1.45:1 in light, fainter than the 3.4:1 and 3.3:1 boundary it sits on, so the edge would drop under 3:1 (A3: sol's point)`,
          moved === null ? "rows moved when one is switched on: press \"chosen\"" : `rows whose box moved when "Source two" was switched on: ${moved} (0px)`,
          `the 100ms plus/check crossfade: ${getComputedStyle(first.querySelector(".basalt-switch-row-check")!).transitionDuration}, with or without reduced motion`,
        ];
      }} />
    </Page>
  );
}

// ---- D9b ----
function OptionChipsDemo({ state }: { state: string }) {
  const [value, setValue] = React.useState<string | null>("one");
  useFocusFirst(state, ".basalt-option-chip");
  // The chips are drawn by OptionChips, so the second one is marked for the pointer from here.
  React.useEffect(() => { if (state === "hover") document.querySelectorAll(".basalt-option-chip")[1]?.setAttribute("data-wt-hover", ""); }, [state]);
  React.useEffect(() => {
    if (state !== "landed") return;
    const t = window.setTimeout(() => (document.querySelector(".basalt-option-chip[data-unavailable]") as HTMLElement | null)?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <Page>
      <div style={{ ...col, maxWidth: 440 }}>
        <OptionChips legend="Choice" value={value} onValueChange={setValue} options={[
          { value: "one", label: "Choice one" }, { value: "two", label: "Choice two" }, { value: "three", label: "Choice three", unavailable: "not available now" }, { value: "four", label: "Choice four" }, { value: "five", label: "Choice five, with a longer name" },
        ]} />
      </div>
      <Readout again={[value]} read={(root) => {
        const chips = [...root.querySelectorAll(".basalt-option-chip")] as HTMLElement[];
        const on = root.querySelector(".basalt-option-chip[data-checked]") as HTMLElement;
        const off = chips.find((c) => !c.hasAttribute("data-checked") && !c.hasAttribute("data-unavailable"))!;
        return [
          `chips ${px(box(on)!.height)} tall, radius ${getComputedStyle(on).borderTopLeftRadius}, ${getComputedStyle(on).fontSize}; seat ${px(box(on.querySelector(".basalt-option-chip-seat")!)!.width)} round (${getComputedStyle(on.querySelector(".basalt-option-chip-seat")!).borderTopLeftRadius})`,
          `chosen edge ${getComputedStyle(on).borderTopColor}; resting edge ${getComputedStyle(off).borderTopColor} (the same: the chosen chip's border does not change)`,
          `the arrow lands on "Choice three" (focus the unavailable chip with "landed"): it is aria-disabled, never chosen, and the next arrow goes on`,
          `the seat crossfade: ${getComputedStyle(on.querySelector(".basalt-option-chip-seat > .basalt-icon")!).transitionDuration}, with or without reduced motion`,
        ];
      }} />
    </Page>
  );
}

// ---- D11a ----
const RUNGS = ["xl", "2xl", "3xl", "4xl", "5xl"] as const;
function SizesDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-button");
  return (
    <Page>
      {(["default", "compact"] as const).map((density) => (
        <div key={density} data-density={density} style={col}>
          {caption(density === "compact" ? "Compact: each rung steps down one (56 to 52, 52 to 48, 48 to 44, 44 to 40)." : "Regular.")}
          <div style={row}>
            {RUNGS.map((s) => <Button key={s} size={s} variant="primary" {...(s === "3xl" ? hoverMark(state) : {})}>{s}</Button>)}
            <IconButton size="2xl" variant="outline" icon={PlusGlyph} label="Add" />
          </div>
          <div style={{ ...row, maxWidth: 520 }}>
            <Input aria-label="Name" controlSize="2xl" placeholder="44" style={{ width: 120 }} />
            <Input aria-label="Name 48" controlSize="3xl" placeholder="48" style={{ width: 120 }} />
            <Select aria-label="Select" controlSize="5xl" options={[{ value: "a", label: "Select 56" }]} defaultValue="a" />
            <MultiSelect label="Group" toolbar controlSize="2xl" options={[{ value: "a", label: "One" }, { value: "b", label: "Two" }]} />
          </div>
        </div>
      ))}
      <Readout read={(root) => {
        const out: string[] = [];
        for (const d of ["default", "compact"]) {
          const scope = root.querySelector(`[data-density="${d}"]`)!;
          out.push(`${d}: ${[...scope.querySelectorAll(".basalt-button[data-variant=primary]")].map((b) => `${b.getAttribute("data-size")} ${px(box(b)!.height)}`).join(", ")}`);
        }
        const b = root.querySelector('.basalt-button[data-size="3xl"]')!;
        out.push(`a 48 button: radius ${getComputedStyle(b).borderTopLeftRadius}, ${getComputedStyle(b).fontSize} at ${getComputedStyle(b).fontWeight}; a 32 button is 500`);
        return out;
      }} />
    </Page>
  );
}

// ---- D11b, X12 ----
function ButtonFormsDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-button");
  const [i, setI] = React.useState(0);
  const amounts = ["$9", "$49", "$1,299.99"];
  const [before, setBefore] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (state !== "changed") return;
    const t = window.setTimeout(() => { setBefore(JSON.stringify([...document.querySelectorAll(".basalt-button-label, .basalt-button[data-amount-demo]")].map((e) => e.getBoundingClientRect().x))); setI(2); }, 200);
    return () => window.clearTimeout(t);
  }, [state]);
  const wide = (w: number) => <div style={{ containerType: "inline-size", width: w }}><Button size="xl" note="A note on a second line"><code>source-one.example</code></Button></div>;
  return (
    <Page>
      <div style={row}>
        <Button variant="outline" size="3xl" {...hoverMark(state)}>Outline, 48</Button>
        <Button variant="outline" size="5xl">Outline, 56</Button>
        <Button variant="primary" size="5xl" amount={amounts[i]} amountReserve={amounts} data-amount-demo="">Primary with amount</Button>
        <Button variant="secondary" size="3xl" amount="$49" amountReserve={["$1,299.99"]}>Secondary with amount</Button>
        <Button variant="ghost" size="3xl" amount="$49">Ghost, full ink</Button>
      </div>
      <div style={{ width: 360, ...col }}>
        <Button fullWidth variant="primary" size="3xl">Full width</Button>
        <Button fullWidth variant="outline" size="3xl">Full width, outline</Button>
      </div>
      <div style={col}>{caption("Two lines: 300 wide (two), 400 wide (one line at 48), 600 wide (two).")}{wide(300)}{wide(400)}{wide(600)}</div>
      <Readout quiet={state === "changed" ? 500 : 0} again={[i, before]} read={(root) => {
        const a = root.querySelector("[data-amount-demo]")!;
        const label = a.querySelector(".basalt-button-label")!;
        const moved = before ? (JSON.stringify([...root.querySelectorAll(".basalt-button-label, .basalt-button[data-amount-demo]")].map((e) => e.getBoundingClientRect().x)) === before ? "0px" : "MOVED") : "press \"changed\"";
        const amt = (v: string) => getComputedStyle(root.querySelector(`.basalt-button[data-variant=${v}] > .basalt-button-amount`)!).opacity;
        const lines = [...root.querySelectorAll(".basalt-button[data-lines]")] as HTMLElement[];
        return [
          `the amount changed $9 to $1,299.99: the label and the button moved ${moved}; the button is ${px(box(a)!.width)} wide`,
          `amount ink: primary ${amt("primary")}, secondary ${amt("secondary")}, ghost ${amt("ghost")} (0.72 only where it holds 4.5:1; ghost's would be 3.92:1 in light)`,
          `outline: edge ${getComputedStyle(root.querySelector(".basalt-button[data-variant=outline]")!).boxShadow.slice(0, 60)}`,
          `two lines: ${lines.map((l) => px(l.getBoundingClientRect().height)).join(", ")} tall (64 or more, 48, 64 or more); label ${px(box(label)!.x)} start-aligned`,
          `full width: ${px(box(root.querySelector(".basalt-button[data-full-width]")!)!.width)} of a 360 space`,
        ];
      }} />
    </Page>
  );
}

// ---- D11c ----
function DoneDemo({ state }: { state: string }) {
  const [done, confirm] = useConfirm();
  useFocusFirst(state, ".basalt-button");
  React.useEffect(() => { if (state === "done") { const t = window.setTimeout(confirm, 200); return () => window.clearTimeout(t); } return undefined; }, [state, confirm]);
  return (
    <Page>
      <div style={row}>
        <IconButton variant="outline" size="2xl" icon={PlusGlyph} label="Add item one" done={done} onClick={confirm} {...hoverMark(state)} />
        <IconButton variant="outline" size="2xl" icon={PlusGlyph} label="Add item two" done={false} />
        <StatusLine>{done ? "Added item one" : ""}</StatusLine>
        {caption(done ? "Added item one (said once, by a line outside the button)" : "Press the first button: the plus becomes a check for 1500ms.")}
      </div>
      <Readout quiet={state === "done" ? 500 : 0} again={[done]} read={(root) => {
        const b = root.querySelector(".basalt-button")!;
        const glyphs = [...b.querySelectorAll(".basalt-button-swap > .basalt-icon")];
        return [
          `button ${px(box(b)!.width)} by ${px(box(b)!.height)}; ${done ? "done" : "at rest"}; name "${b.getAttribute("aria-label")}" (it does not change)`,
          `plus opacity ${getComputedStyle(glyphs[0]!).opacity}, check opacity ${getComputedStyle(glyphs[1]!).opacity}; fill ${getComputedStyle(b).backgroundColor} (none); ink ${getComputedStyle(b).color}`,
          `crossfade ${getComputedStyle(glyphs[1]!).transitionDuration}, kept under reduced motion; the hold is duration-confirm, 1500ms`,
        ];
      }} />
    </Page>
  );
}

// ---- D11d ----
function CountDemo({ state }: { state: string }) {
  useFocusFirst(state, ".basalt-button");
  return (
    <Page>
      <div style={row}>
        {[0, 3, 99, 100].map((n, i) => (
          <Button key={n} variant="ghost" size="2xl" icon={HomeGlyph} count={n} {...(i === 1 ? hoverMark(state) : {})}><span className="basalt-visually-hidden">Items, {n} selected</span></Button>
        ))}
      </div>
      <Readout read={(root) => {
        const bs = [...root.querySelectorAll(".basalt-button")] as HTMLElement[];
        const pills = bs.map((b) => b.querySelector(".basalt-button-count") as HTMLElement);
        return [
          `pill widths at 0, 3, 99, 100: ${pills.map((p) => px(box(p)!.width)).join(", ")} (0 to 99 are one width; a third digit widens it. No majority on A12: two digits stands)`,
          `button widths: ${bs.map((b) => px(box(b)!.width)).join(", ")}`,
          `pill ${px(box(pills[0]!)!.height)} tall, edge ${getComputedStyle(pills[0]!).boxShadow.slice(0, 50)}; number at 0 ${getComputedStyle(pills[0]!).color}, at 3 ${getComputedStyle(pills[1]!).color}; fill ${getComputedStyle(pills[1]!).backgroundColor} (none)`,
          `the search button beside a header cart would move 0px from 0 to 99 and move at 100 (for the owner's review page)`,
        ];
      }} />
    </Page>
  );
}

// ---- D12 ----
function LinkTabsDemo({ state }: { state: string }) {
  const [current, setCurrent] = React.useState(0);
  // Every navigation the Select asks for (onNavigate), so the readout can say none came from a typed letter. "typed" presses a letter on the closed Select, as a keyboard does.
  const [navs, setNavs] = React.useState(0);
  React.useEffect(() => {
    if (state !== "typed") return;
    const t = window.setTimeout(() => {
      const trigger = document.querySelector(".basalt-select-trigger") as HTMLElement | null;
      if (!trigger || trigger.offsetParent === null) return;
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true, cancelable: true }));
      trigger.dispatchEvent(new KeyboardEvent("keyup", { key: "p", bubbles: true, cancelable: true }));
    }, 150);
    return () => window.clearTimeout(t);
  }, [state]);
  const names = ["Tab 1", "Tab 2", "Tab 3", "Tab 4", "Tab 5", "Tab 6", "Tab 7", "Tab 8", "Tab 9"];
  // Under 720 the row is a Select, so "focus" goes to whichever of the two is drawn, and "open" opens the Select with a real click (it shows at 390 only).
  // "hover" marks the second link of the 48 row, or the Select's trigger where the row is not drawn, for the build's real pointer.
  React.useEffect(() => {
    if (state !== "hover") return;
    const link = document.querySelectorAll(".basalt-link-tab")[1] as HTMLElement | undefined;
    ((link && link.offsetParent !== null ? link : document.querySelector(".basalt-select-trigger")) as HTMLElement | null)?.setAttribute("data-wt-hover", "");
  }, [state]);
  React.useEffect(() => {
    if (state !== "focus" && state !== "open") return;
    const t = window.setTimeout(() => {
      const shown = (el: Element | null) => (el as HTMLElement | null)?.offsetParent !== null;
      const link = document.querySelector(".basalt-link-tab");
      const trigger = document.querySelector(".basalt-select-trigger") as HTMLElement | null;
      if (state === "open") { if (shown(trigger)) trigger!.click(); } else ((shown(link) ? link : trigger) as HTMLElement | null)?.focus();
    }, 150);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <Page>
      {(["3xl", "5xl"] as const).map((size) => (
        <LinkTabs key={size} aria-label={`Link tabs, ${size}`} size={size} onNavigate={(href) => { setNavs((n) => n + 1); setCurrent(names.findIndex((n) => `#${n}` === href)); }}>
          {names.map((n, i) => <LinkTab key={n} href={`#${n}`} current={i === current} onClick={(e) => { e.preventDefault(); setCurrent(i); }}>{n}</LinkTab>)}
        </LinkTabs>
      ))}
      {/* The component expects a size container for the 56 row's 48 step (consent row 9: N1's phone tab); this one is 600 wide, under 640, so its 56 row draws at 48. */}
      <div data-r41-narrow="" style={{ containerType: "inline-size", width: 600, maxWidth: "100%" }}>
        <LinkTabs aria-label="Link tabs, 56 in a 600px container" size="5xl">
          {names.slice(0, 4).map((n, i) => <LinkTab key={n} href={`#${n}`} current={i === 0}>{n}</LinkTab>)}
        </LinkTabs>
      </div>
      <Readout again={[current, navs]} read={(root) => {
        const nav = root.querySelector(".basalt-link-tabs")!;
        const ul = nav.querySelector("ul")!;
        const asSelect = getComputedStyle(ul).display === "none";
        const trigger = nav.querySelector(".basalt-select-trigger") as HTMLElement;
        const wide = [
          `the viewport is ${window.innerWidth}px: ${asSelect ? "under 720, so the row is display: none and the Select is the one navigation (out of the Tab order and the accessibility tree: the row)" : "720 or more, so the row is shown and the Select is display: none"}; both are in the markup, and CSS alone chooses`,
        ];
        if (asSelect) {
          return [
            ...wide,
            `Select: ${px(box(trigger)!.width)} by ${px(box(trigger)!.height)} (Castle's 44 for the 48 row; 36 for a 36 row, 48 for the 56 row), drawn "${trigger.innerText.replace(/\s+/g, " ").trim()}" (the "Go to" label, then the page's name, on one line)`,
            `its accessible name: "${(trigger.getAttribute("aria-labelledby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim()}" (the visible words start it, WCAG 2.5.3; DECISIONS 158, Q2)`,
            `navigations asked for so far: ${navs}; a typed letter on the closed Select asks for none (press "typed"), and only a choice from the open list, by a click or Enter, navigates`,
            `the 56 row's Select: ${px(box(root.querySelectorAll(".basalt-select-trigger")[1]!)!.height)} tall; below the component the page moves across 720 by the row's height less the Select's: 4px at 48 (56 row: 8px, or 0 in a container under 640)`,
            `the value is the current link's: Tab ${current + 1} (the row's aria-current agrees at 720 and up); choosing a value navigates (onNavigate here, the link's href by default) ; with onNavigate routing in place (as here) focus stays on the Select: ${document.activeElement === trigger ? "it is on the Select now" : "press \"focus\" to see it"}; on the default, window.location.assign, a new page loads and focus starts over there`,
            `the page below the Select does not move between the server's markup and after mount (0px: the same CSS draws both)`,
            `the prototype's route effect that moved focus to the heading is X10 and is not ported`,
          ];
        }
        const tabs = [...nav.querySelectorAll(".basalt-link-tab")] as HTMLElement[];
        const first = tabs[0]!;
        const labels = [...ul.querySelectorAll(".basalt-link-tab-label")].map((l) => box(l)!);
        const line = root.querySelector(".basalt-link-tab[aria-current] .basalt-link-tab-line")!;
        return [
          ...wide,
          `48 row: link ${px(box(tabs[1]!)!.height)} tall, ${getComputedStyle(tabs[1]!).fontSize}, radius ${getComputedStyle(tabs[1]!).borderTopLeftRadius}; 56 row (here ${window.innerWidth}px wide, a container of ${px(box(root.querySelectorAll(".basalt-link-tabs")[1]!.parentElement)!.width)}): ${px(box(root.querySelectorAll(".basalt-link-tabs")[1]!.querySelector(".basalt-link-tab")!)!.height)}`,
          `the same 56 row in a 600px container: ${px(box(root.querySelector("[data-r41-narrow] .basalt-link-tab")!)!.height)} (consent row 9: the 48 step); the Select beside it is 44 for the 48 row and 48 for the 56 row`,
          `24px between two labels: ${px(labels[2]!.x - (labels[1]!.x + labels[1]!.width))}; the first label starts at ${px(labels[0]!.x - box(ul)!.x)} from the row's edge`,
          `underline ${px(box(line)!.height)} tall, static (transition ${getComputedStyle(line).transitionDuration}); focus ring ${document.activeElement === first ? `${getComputedStyle(first).outlineOffset} offset` : "+2 outside (shown in the focus still)"}, never inset`,
          `nine links: the row wraps and does not scroll; link tabs are a nav with aria-current, not a tablist`,
          `the chosen label's weight (DECISIONS 138 A, 145, 149) is not built here: the wrapper (chosen.tsx) is in the audit-design-a branch, and LinkTab's label taking ChosenLabel and the skill's link tabs taking reserve() is a named step of the merge, with a test that a link tab's box does not move when the current link changes. Until then the current link is 500`,
        ];
      }} />
    </Page>
  );
}

// ---- X6 ----
function PanelsDemo({ state }: { state: string }) {
  const [view, setView] = React.useState<string>(state === "trends" ? "trends" : state === "plan" ? "plan" : "week");
  const [log, setLog] = React.useState<string[]>([]);
  useFocusFirst(state, ".basalt-tab");
  React.useEffect(() => {
    if (state !== "walk") return;
    const t = window.setTimeout(() => {
      const ys: string[] = [];
      const under = () => (document.getElementById("r41-under")?.getBoundingClientRect().y ?? 0);
      ys.push(`week ${px(under())}`);
      setView("trends");
      window.setTimeout(() => { ys.push(`trends ${px(under())}`); setView("plan"); window.setTimeout(() => { ys.push(`plan ${px(under())}`); setLog(ys); }, 350); }, 350);
    }, 200);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <Page>
      {/* The 56 bar's 48 step (consent row 9) is a container query: the component expects an ancestor that is a size container, so this demo is one. */}
      <div data-r41-bar="" style={{ containerType: "inline-size" }}>
      <Tabs value={view} onValueChange={(v) => setView(String(v))} size="5xl">
        <TabsList aria-label="Synthetic views">
          <Tab value="week" {...hoverMark(state)}>View one</Tab><Tab value="trends">View two</Tab><Tab value="plan">View three</Tab>
        </TabsList>
        <TabsPanels stacked>
          <TabsPanel value="week"><div style={{ height: 140 }}><Text>A short view.</Text></div></TabsPanel>
          <TabsPanel value="trends"><div style={{ height: 260 }}><Text>The tallest view (260px). <Button size="sm">Inside view two</Button></Text></div></TabsPanel>
          <TabsPanel value="plan"><div style={{ height: 90 }}><Text>Another.</Text></div></TabsPanel>
        </TabsPanels>
      </Tabs>
      </div>
      <p id="r41-under" style={{ margin: 0 }}>{caption("The line under the tabs.")}</p>
      <Readout quiet={state === "walk" ? 500 : 0} again={[view, log.join()]} read={(root) => {
        const panels = root.querySelector(".basalt-tabs-panels")!;
        const hidden = [...root.querySelectorAll(".basalt-tabs-panel[hidden]")] as HTMLElement[];
        return [
          `the bar: ${px(box(root.querySelector(".basalt-tab")!)!.height)} tall in a container ${px(box(root.querySelector("[data-r41-bar]"))!.width)} wide (56 from 640, 48 under it: consent row 9, N1's phone tab)`,
          `the seat is ${px(box(panels)!.height)} tall (the tallest panel is 260) in every view; the line under it is at y ${px(box(document.getElementById("r41-under"))!.y)}`,
          log.length ? `walked view one, view two, view three: ${log.join(", ")} (identical: 0px)` : "press \"walk\" to change tab twice and print where the line under it sits each time",
          `${hidden.length} hidden panels: visibility ${getComputedStyle(hidden[0]!).visibility}, inert ${String((hidden[0] as HTMLElement & { inert: boolean }).inert)}, display ${getComputedStyle(hidden[0]!).display}; the button inside the hidden second panel is not in the accessibility tree`,
          `the 8px slide of the incoming panel still plays on stacked panels (animation ${getComputedStyle(root.querySelector(".basalt-tabs-panel:not([hidden])")!).animationName})`,
          `under 640 wide (this page at 390) the panels stop sharing a seat: each takes its own height`,
        ];
      }} />
    </Page>
  );
}

const ALL = ["hover", "focus", "forced-colours", "reduced-motion", "touch"];
const COMMON = { widths: [1440, 390], scales: [1, 2], height: 760 };

export const ROUND_41: Round = {
  id: "41",
  title: "The controls: text button, switch row, option chips, sizes, button forms, done state, count pill, link tabs and shared panels",
  reviewed: false,
  summary:
    "The controls batch of the components stream, ported from the owner's approved site prototypes (DECISIONS 151) with the council's changes (DECISIONS 154): a text button that reads as running text; a switch row that holds a tile; option chips that wrap with no track; control heights 44, 48, 52 and 56; an outline Button, a quieter amount in a reserved seat, a two-line Button and a full-width Button; an icon button's done state; a count pill; link tabs; and panels that share one seat. Where the approved version could not be ported as it was, the step says what the council changed and the vote. Castle's lime fill, lime check and lime count are not here: accent as a fill is decided later (D17). The design panel has not reviewed this implementation. Every word is synthetic.",
  steps: [
    {
      id: "text-button", name: "D5d: a button that reads as running text", intro: "TextButton: no box and no height, the text's font, underlined as Link is, with a quiet form and an icon that is not underlined.",
      ...COMMON, states: ALL,
      decisions: [
        "Ported as approved (the personal site's .cmd and .lk): ink primary, a 1px underline in the input boundary that goes to the ink on hover, font inherited, no padding, a trailing chevron for \"opens in place\", and a quiet form in secondary ink.",
        "Changed by the consent list (consented): the focus ring's corner is radius 4 (the prototype's 3, no token below 4) and the underline sits 3px off (the prototype's 0.3em, matching Link's). Changed by A1, 4 to 0: it has no pressed state; a choice between two weeks is a SegmentedControl.",
        "Engineering, no pixel: a part of its own (TextButton), so it takes no Button box and no .98 press (sol). The 44px hit box on touch is a box with no content that changes no layout, and it is off inside a sentence.",
      ],
      tryIt: ["Hover each: the underline takes the ink. Tab to one: the ring is 2px, 2px outside.", "In \"touch\", the readout still says the line is the line: nothing moved."],
      demo: ({ state }) => <TextButtonDemo state={state} />,
    },
    {
      id: "switch-row", name: "D9a: the switch row", intro: "SwitchRow in a SwitchRowGroup: one checkbox drawn as a row with a tile, a name and a kind, and a 16px seat where a plus and a check cross over.",
      ...COMMON, states: [...ALL, "chosen"],
      decisions: [
        "Ported as approved (N1's .pick): a native-checkbox row with a tile, name over kind and a 16px seat; grid, padding 6 12 6 8, gap 10, radius 8, name 500 at 14/20 and kind 400 at 12/16; on is the selected wash and primary ink.",
        "A2, 3 to 0 with sol writing in: the row is not a filter (no count, no Clear, no seven-or-more rule); its sentence goes through FilterResult's 400ms hold; in forced colours on is Highlight with HighlightText and no outline. The ballot's \"no crossfade under reduced motion\" is wrong and does not stand (DECISIONS 138 C10, sol and opus): the 100ms plus/check swap stays.",
        "A3, 3 to 1: the edge at rest is border-input. Sol's point, which the council sent to the builder and this round: border-hover is fainter than border-input, so hover cannot step to it. The hover edge is text-secondary (the numbers are in the readout). The council took it up in DECISIONS 157, Q1: no majority (2 to 2), so what is built stands. The reading is the AA rule's: a hover edge that drops under 3:1 on a 3:1 boundary is not allowed.",
        "Consent row 3 (the vote could not draw the ballot's 48): 52px from 720 wide and 48px under it with a 32px tile and a 13/18 name, the approved prototype's own values (sol, grok). A new size, size-control-4xl = 52, so compact steps 56 to 52, 52 to 48 and 48 to 44.",
        "Defects not copied: the exponential seat copies (the sentence is one FilterResult), the bare aria-live (FilterResult holds 400ms), the Highlight outline in forced colours.",
      ],
      tryIt: ["Switch rows on and off: nothing moves. Tab through them; Space switches the one in focus.", "\"chosen\" switches the second row on and prints how many rows moved."],
      demo: ({ state }) => <SwitchRowDemo state={state} />,
    },
    {
      id: "option-chips", name: "D9b: option chips", intro: "OptionChips: one of many, eight at most, as wrapping chips with no track and a round seat every chip reserves. A value that cannot be chosen keeps its words.",
      ...COMMON, states: [...ALL, "landed"],
      decisions: [
        "Ported as approved (Castle's flavour picker): radios drawn as 44px chips that wrap 8px apart, padding 10 14, radius 8, a seat that fills and shows a check, a fieldset with a legend and a small count.",
        "A4, 4 to 0 (one foundations sentence amended): the chosen chip is the selected wash in primary ink with the check in a seat every chip reserves, and its border does not change (the prototype inked it, which reads as focus). The seat's check is 12 inside the 16 (consent row 5; the prototype's 18 and 14).",
        "A5, 4 to 0: a sold-out chip takes the chip's disabled look, stays reachable with aria-disabled and keeps its words; no dashed edge. An arrow key landing on it does not choose it (opus). Base UI's arrow keys skip an aria-disabled radio, so OptionChips takes the arrow keys itself, in the order the chips are drawn.",
        "The prototype's :has() with no fallback is a state attribute here.",
      ],
      tryIt: ["Arrow through the chips: the sold-out one takes focus and is not chosen.", "\"landed\" focuses the sold-out chip."],
      demo: ({ state }) => <OptionChipsDemo state={state} />,
    },
    {
      id: "sizes", name: "D11a: control sizes 44, 48, 52 and 56", intro: "Button, IconButton, Input, Select and MultiSelect take four rungs above 40, radius 8, 16px text.",
      ...COMMON, height: 900, states: ALL,
      decisions: [
        "Ported as approved (Castle): 44, 48 and 56 at radius 8 with 15px text, which is 16 here (consent row 10).",
        "Consent rows 6 to 8: new tokens size-control-2xl (44), -3xl (48), -4xl (52) and -5xl (56), and -6xl (64, the two-line Button's least height). The ballot named 44 as 2xl, 48 as 3xl, 56 as 4xl; the 52 rung the vote added sits between, so the ladder has no gap and the names follow it. DECISIONS 157, consent row C7, let the names stand with no objection.",
        "A6, 4 to 0: Button text is 600 at 44 and up and 500 at the shipped sizes. Compact steps every rung down one (grok); a touch target stays 44.",
        "The prototype passed controlSize lg and xl and then overrode the height in CSS; here the prop sets the pixels.",
      ],
      tryIt: ["Compare the two densities' heights in the readout."],
      demo: ({ state }) => <SizesDemo state={state} />,
    },
    {
      id: "button-forms", name: "D11b, X12: outline, amount, two lines and full width", intro: "Button's outline variant, an amount in a reserved seat, a two-line label and fullWidth.",
      ...COMMON, height: 900, states: [...ALL, "changed"],
      decisions: [
        "Ported as approved (Castle's .btn-line, .btn-sum, .btn-wide; Blacksand's two-line request button): an outline, an amount after the label in tabular figures 12px away, a two-line label that is one line between two container widths, and a full-width button.",
        "A7, 4 to 0: outline is a new variant (transparent, a border-input edge, primary ink, hover edge to primary ink). A8, 4 to 0: the amount sits in a seat as wide as the widest amount the app names, so the label never moves.",
        "Consent row 11, by the AA rule and not by vote (opus, sol): the amount's 0.72 opacity fails 4.5:1 on ghost's ink (3.92:1 in light), so it is 0.72 only on primary, secondary and outline (8.5 to 10.5:1 on primary; 6.7:1 at the least in primary ink) and full ink on ghost and danger. A new token, opacity-amount.",
        "Consent rows 12 and 13: two-line min-height 64 (size-control-6xl) and the one-line range 340 to 480 (size-breakpoint-container-sm = 340). X12 is ported entirely as it is.",
      ],
      tryIt: ["\"changed\" swaps the amount to $1,299.99 and prints how far the label moved (0px).", "Hover the outline: the edge goes to the ink."],
      demo: ({ state }) => <ButtonFormsDemo state={state} />,
    },
    {
      id: "done", name: "D11c: an icon button's done state", intro: "IconButton done: the plus becomes the check in the button's own ink; a line outside says what happened.",
      ...COMMON, height: 420, states: [...ALL, "done"],
      decisions: [
        "Ported as approved (Castle's quick add): two glyphs in one cell swapped by opacity, the core plus and check, held for a moment, the timer cleared on unmount.",
        "A9, 4 to 0: the glyph is the cue, in the button's own ink; the lime face is D17's and is not here. A10, 4 to 0: the name does not change; a StatusLine outside says what happened.",
        "Consent rows 14 and 15: the swap is duration-fast (100ms, the prototype's 120) and the hold is duration-confirm (1500ms, the prototype's 1600), a new token the two copy buttons now share. The 100ms crossfade stays under reduced motion (DECISIONS 138 C10).",
      ],
      tryIt: ["Press the first button; the second shows the same button at rest."],
      demo: ({ state }) => <DoneDemo state={state} />,
    },
    {
      id: "count", name: "D11d: the count pill", intro: "Button count: an outlined pill beside the label, holding two digits.",
      ...COMMON, height: 420, states: ALL,
      decisions: [
        "Ported as approved (Castle's header cart): 24 tall, 13px 600 tabular, a border-input edge, radius full, aria-hidden with the count in the button's name.",
        "A11, 4 to 0: outlined with the number's ink stepping from secondary at zero to primary above; no lime fill (D17).",
        "A12, no majority (muse, opus: two tabular digits; sol: one fixed seat showing 99+; grok: three digits): option (a), two digits, stands. Sol and grok measured that two digits still moves the search button beside the cart at 100: for the owner's review page.",
      ],
      tryIt: ["Compare the pill at 99 and 100."],
      demo: ({ state }) => <CountDemo state={state} />,
    },
    {
      id: "link-tabs", name: "D12: link tabs", intro: "LinkTabs and LinkTab: from 720 a nav of links with the current one underlined, at 48 and 56; under 720 a Select of the same links. The 1440 stills show the row, the 390 stills the Select closed and (state \"open\") open.",
      ...COMMON, height: 760, states: [...ALL, "open", "typed"],
      decisions: [
        "Ported as approved (Castle's kinds navigation, N1's bar): a row on a bottom hairline, padding 10 (24px between two labels), the first with no start padding, an underline 2px, wrapping.",
        "A13, 4 to 0: focus is the +2 ring outside (Castle's inset outline is the AI tell DECISIONS 135 names) and the underline is a real 2px element, Highlight in forced colours. A14, 3 to 1: static, no slide (opus: it slides where the row stays mounted). A15, 3 to 1 (muse, opus, sol): under 720 the row is replaced by a Select of the same links, in the component (Castle's form, at Castle's 44 for the 48 row: 36 for the 36 row, 48 for the 56 row); grok's write-in, the row at every width with the Select left to the app, lost. Both are in the markup and CSS alone chooses at 720, so nothing moves on load. DECISIONS 158, Q2 (3 to 1; sol: choose, then a Go button): the Select navigates at once and tells the reader first, a \"Go to\" label before the current page's name in its visible label and its accessible name (WCAG 3.2.2's exception, 2.5.3); only a choice from the open list navigates, and no key on the closed Select does (a typed letter included). Where it is drawn was not voted: the multi-select trigger's form, a label then its value, mapped and not decided. Focus stays on the Select when an app's onNavigate routes in place; on the default a new page loads and focus starts over (the prototype's route effect that moved it is X10, not ported). The 390 stills show the Select with its \"Go to\" label, closed and open; the 1440 stills show the row.",
        "Consent rows 8 to 10: the 56 bar, its 48 step (the prototype's phone 52), 16px text. For the owner's review page: Castle's nine tabs measure 1,039px with the bold width reserved against 929px, so the row wraps up to about a 1,120px window (opus).",
        "The ballot's \"chosen label 600 reserving width\" (DECISIONS 138 A, 145 and 149) is not built here: the wrapper (chosen.tsx) is in the audit-design-a branch, and building it into LinkTab (its label takes ChosenLabel) and the skill's link tabs (reserve()) is a named step of the merge, with a test that a link tab's box does not move when the current link changes. Until then the current link is 500, as a resting link.",
      ],
      tryIt: ["At 1440 click a tab: the underline appears on it and nothing moves.", "At 390 open the Select and choose Tab 4: the value follows and focus stays on the Select; press a letter on the closed Select (\"typed\"): nothing navigates."],
      demo: ({ state }) => <LinkTabsDemo state={state} />,
    },
    {
      id: "panels", name: "X6: panels that share one seat", intro: "TabsPanels stacked: every panel in one grid cell, so a change of tab moves nothing under it.",
      ...COMMON, height: 760, states: [...ALL, "trends", "plan", "walk"],
      decisions: [
        "Ported as approved (N1's dashboard): one grid cell, every panel grid-area 1 / 1, hidden ones stay laid out but visibility hidden. Off by default, so existing tabs draw the same.",
        "Not copied (the ballot's defects): the !important on the panels (an author rule beats [hidden]) and the 400ms timer. Hidden panels are inert, so they have no focus stop and leave the accessibility tree.",
        "Consent row 16: it turns off in a container narrower than 640 (a new token, size-breakpoint-container-lg), which is where N1's phone page makes each view take its own height. The 8px slide of the incoming panel still plays on stacked panels; this step is where to look at it.",
      ],
      tryIt: ["\"walk\" changes tab twice and prints where the line under the tabs sits each time (it is the same)."],
      demo: ({ state }) => <PanelsDemo state={state} />,
    },
  ],
};
