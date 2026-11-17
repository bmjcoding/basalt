// Round 42: overlays and search (DECISIONS 155). The council voted this batch of ports from the owner's approved sites: a wide dialog, a sheet with a head, body, foot and
// steps, a docked drawer, the search trigger and dialog, a standalone listbox, a list that opens its rows, and a notice bar. No wider popover is built (all four kept
// 320). Castle's store opens on 1 December and uses the cart sheet, the search dialog, the search trigger and the notice bar. The design panel has not reviewed this
// implementation, and the owner has not approved it. Every word, name and number here is synthetic.
//
// The states are real. "open" opens the dialog or sheet at load; "open-hover" puts a pointer on the part that marks itself `data-wt-hover` (build.mjs); "focus" and
// "open-focus" move keyboard focus to the part before the shot. "forced-colours" and "reduced-motion" (and the same after "open-") are emulations build.mjs sets before the page
// loads. The printed measurements are read from the live DOM by this page, after the part has settled: Basalt draws none of them.

import * as React from "react";

import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerSection,
  DrawerTrigger,
  FilterResult,
  Listbox,
  ListboxGroup,
  ListboxOption,
  NoticeBar,
  OpenList,
  OpenListGroup,
  OpenListRow,
  SearchDialog,
  SearchResult,
  SearchResults,
  SearchTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" };

type Box = { x: number; y: number; w: number; h: number };
const box = (el: Element | null | undefined): Box | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
const frames = (n = 2) => new Promise<void>((resolve) => { const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve()); step(n); });
const later = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const same = (a: Box | null | undefined, b: Box | null | undefined) => (a && b ? a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h : a === b);
const css = (el: Element | null | undefined, ...props: string[]) => { const s = el ? getComputedStyle(el) : null; return props.map((p) => `${p} ${s ? (s as unknown as Record<string, string>)[p] : "?"}`).join(", "); };

/**
 * Prints lines this page reads from the DOM once the part has settled. `read` runs after `wait` and may await frames. The shot waits for it: build.mjs awaits
 * `window.__BASALT_READY__` before it takes a still, so a readout is never shot while it still says "measuring…".
 */
function Readout({ title, read, wait = 500 }: { title: string; read: () => Promise<string[]> | string[]; wait?: number }) {
  const [lines, setLines] = React.useState<string[]>(["measuring…"]);
  React.useEffect(() => {
    let live = true;
    const ready = window as unknown as { __BASALT_READY__?: Promise<unknown> };
    const done = later(wait).then(read).then(async (out) => { if (live) setLines(out); await frames(3); });
    ready.__BASALT_READY__ = Promise.all([ready.__BASALT_READY__, done]);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <pre style={mono} aria-hidden="true"><b>{title}</b>{"\n"}{lines.join("\n")}</pre>;
}

/** The words of an option or a link, one for each part, joined by a space as the accessibility tree joins block parts (this page's reading; the test reads the browser's own tree). */
const parts = (el: Element | null | undefined) => (el ? [...el.children].filter((c) => c.getAttribute("aria-hidden") !== "true").map((c) => (c.textContent ?? "").trim()).filter(Boolean).join(" ") : "");

/** WCAG contrast of a token's ink over the hover wash over the dialog's level (surface-1), in the shot's theme, as the browser paints them. */
function washRatio(ink: string): string {
  const resolve = (token: string, prop: "color" | "backgroundColor") => { const probe = document.createElement("div"); probe.style[prop] = `var(--basalt-${token})`; document.body.append(probe); const v = getComputedStyle(probe)[prop]; probe.remove(); return v; };
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "?";
  const paint = (colours: string[]) => { ctx.clearRect(0, 0, 1, 1); for (const c of colours) { ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); } return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = (rgb: number[]) => { const [r, g, b] = rgb.map((c) => { const x = (c ?? 0) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0); };
  const wash = paint([resolve("surface-1", "backgroundColor"), resolve("state-hover", "backgroundColor")]);
  const text = paint([resolve("surface-1", "backgroundColor"), resolve("state-hover", "backgroundColor"), resolve(ink, "color")]);
  const [a, b] = [lum(wash), lum(text)];
  return `${((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)}:1`;
}

const stateOpen = (state: string) => state.startsWith("open");
const picture = (tone: string) => <span style={{ display: "block", width: "100%", height: "100%", borderRadius: 4, background: `var(--basalt-surface-${tone})`, boxShadow: "inset 0 0 0 1px var(--basalt-border-input)" }} />;

// ---- 1. The wide dialog ----

function WideDialogDemo({ state }: { state: string }) {
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      {caption("A reference dialog: 992px wide (118 characters of Geist Mono at 14px, 991.17px, rounded up and kept in px; DECISIONS 158, Q1), capped by the window less 2 × 16. Basalt's own padding, radius and scroll. Its first focus is its title, not a button, so Enter on opening runs nothing.")}
      <Dialog defaultOpen={stateOpen(state)}>
        <DialogTrigger render={<Button>Open the manual</Button>} />
        <DialogContent size="wide">
          <DialogTitle>Help</DialogTitle>
          <DialogDescription>Keys act while the application has focus; typing in a field is typing.</DialogDescription>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 24, marginTop: 16 }}>
            {["Moving", "Opening", "Filtering"].map((name) => (
              <div key={name}>
                <Text weight="medium">{name}</Text>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: 8 }}>
                  {["j", "k", "g", "G"].map((key) => <React.Fragment key={key}><kbd className="basalt-kbd"><kbd className="basalt-kbd-key">{key}</kbd></kbd><Text size="sm" tone="secondary">Does a thing on a synthetic row</Text></React.Fragment>)}
                </div>
              </div>
            ))}
          </div>
          <DialogActions><DialogClose render={<Button>Close</Button>} /></DialogActions>
        </DialogContent>
      </Dialog>
      {stateOpen(state) ? (
        <Readout title="Measured" read={() => {
          const dialog = document.querySelector(".basalt-dialog");
          const b = box(dialog);
          return [`dialog width ${b?.w}px (the token is 992; the window less 32 is ${window.innerWidth - 32})`, `first focus: ${document.activeElement?.className || document.activeElement?.tagName}`, css(dialog, "paddingTop", "borderTopLeftRadius", "overflowY")];
        }} />
      ) : null}
    </div>
  );
}

// ---- 2. A sheet with a head, a body, a foot and steps ----

function CartDemo({ state }: { state: string }) {
  const [step, setStep] = React.useState(state.includes("step-2") ? "summary" : "cart");
  const lines = Array.from({ length: 14 }, (_, i) => `Synthetic line ${i + 1}`);
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      {caption("Castle's cart as a sheet: a head band (the title, a count, a 44px close), a body that scrolls and a foot that does not. Review order swaps the body in place and moves focus to the title, so the new title is read out.")}
      <Sheet defaultOpen={stateOpen(state)}>
        <SheetTrigger render={<Button>Open the cart</Button>} />
        <SheetContent side="right" step={step}>
          <SheetHeader closeLabel="Close cart">
            <SheetTitle>{step === "cart" ? "Your cart" : "Order summary"}</SheetTitle>
            <SheetDescription>{step === "cart" ? "14 items" : "14 items, to be confirmed"}</SheetDescription>
          </SheetHeader>
          <SheetBody tabIndex={0}>
            {step === "cart" ? <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{lines.map((line) => <li key={line} style={{ padding: "16px 0", borderBottom: "1px solid var(--basalt-border-divider)" }}><Text>{line}</Text></li>)}</ul> : <div style={{ padding: "16px 0" }}><Text>Subtotal. Shipping and tax are worked out at checkout.</Text></div>}
          </SheetBody>
          <SheetFooter>
            <Button variant="primary" style={{ width: "100%" }} onClick={() => setStep(step === "cart" ? "summary" : "cart")}>{step === "cart" ? "Review order" : "Back to cart"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {stateOpen(state) ? (
        <Readout title="Measured" read={async () => {
          const sheet = document.querySelector(".basalt-sheet");
          const head = box(sheet?.querySelector(".basalt-sheet-head"));
          const foot = box(sheet?.querySelector(".basalt-sheet-foot"));
          const body = sheet?.querySelector<HTMLElement>(".basalt-sheet-body");
          if (body) body.scrollTop = 120;
          await frames();
          const moved = !same(head, box(sheet?.querySelector(".basalt-sheet-head"))) || !same(foot, box(sheet?.querySelector(".basalt-sheet-foot")));
          if (body) body.scrollTop = 0;
          return [`close ${box(sheet?.querySelector(".basalt-sheet-close"))?.w} × ${box(sheet?.querySelector(".basalt-sheet-close"))?.h}px`, `body scrolled 120px: head and foot moved? ${moved ? "YES" : "no (0px)"}`, `focus: ${(document.activeElement as HTMLElement)?.textContent?.slice(0, 24) || document.activeElement?.tagName}`, css(sheet, "paddingTop", "transitionDuration"), css(sheet?.querySelector(".basalt-sheet-head .basalt-dialog-title"), "fontSize", "lineHeight", "fontWeight")];
        }} />
      ) : null}
    </div>
  );
}

// ---- 3. The docked drawer ----

const subscribePhone = (notify: () => void) => { const query = window.matchMedia("(max-width: 719px)"); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); };

/**
 * What an app does with the drawer (README): on a phone the open drawer replaces the record, so the record is hidden (and so out of the accessibility tree)
 * while it is open; Back closes it, shows the record again and puts focus on the drawer's trigger. The component supplies the stacked halves and the Back button.
 */
function DrawerDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(state !== "closed");
  const phone = React.useSyncExternalStore(subscribePhone, () => window.matchMedia("(max-width: 719px)").matches, () => false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const replaced = open && phone;
  return (
    <div style={{ ...col, maxWidth: 960 }}>
      {caption("A region in the flow under a page's column: no scrim, level reset, motion, shadow, fill, rim or corner. Its one mark is a divider along its top. 13 rows of 24 from 720. Under 720 it is a page of its own: open, it replaces the record, and Back closes it, shows the record and returns focus to the trigger (the app does that; the drawer supplies the stacked halves and Back).")}
      <Card style={{ padding: 16 }} hidden={replaced}><Text>The record: the page's column sits here.</Text></Card>
      <DrawerTrigger ref={trigger} drawer="session" open={open} onClick={() => setOpen(!open)}>Session</DrawerTrigger>
      <Drawer id="session" label="The session and the sources" open={open} onBack={() => { setOpen(false); trigger.current?.focus(); }}>
        <DrawerSection title="Session" actions={<Button size="xs" data-wt-hover="">Replay</Button>}>
          {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ padding: "2px 0", color: "var(--basalt-text-secondary)" }}>12:0{i % 10} a synthetic session line</div>)}
        </DrawerSection>
        <DrawerSection title="Sources" actions={<Button size="xs">Refresh</Button>}>
          {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ padding: "2px 0", color: "var(--basalt-text-secondary)" }}>source {i + 1}: ok</div>)}
        </DrawerSection>
      </Drawer>
      <Readout title="Measured" read={() => {
        const d = document.getElementById("session");
        const record = [...document.querySelectorAll(".basalt-card")].find((c) => c.textContent?.startsWith("The record"));
        return [`drawer ${d?.hasAttribute("hidden") ? "closed" : `open, height ${box(d)?.h}px (13 rows of 24 = 312 from 720)`}`, css(d, "position", "boxShadow", "borderTopWidth", "borderTopLeftRadius", "backgroundColor"), `halves: ${[...document.querySelectorAll(".basalt-drawer-section")].map((s) => Math.round(s.getBoundingClientRect().width)).join(" and ")}px wide`, `the record: ${record?.hasAttribute("hidden") ? "replaced (hidden, out of the accessibility tree)" : "shown"}; Back: ${box(document.querySelector(".basalt-drawer-back"))?.h ? "drawn" : "not drawn"}`];
      }} />
    </div>
  );
}

// ---- 4. The search trigger ----

function TriggerDemo({ state }: { state: string }) {
  React.useEffect(() => { if (state === "focus") later(150).then(() => document.querySelector<HTMLElement>(".basalt-search-trigger")?.focus()); }, [state]);
  return (
    <div style={{ ...col, maxWidth: 480 }}>
      {caption("A button shaped like a field from 720: a 1px input boundary, the glyph and the word, 200 by 44. Under 720 a 44px icon button. The boundary never fades on hover; the word lifts to primary.")}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8 }}>
        <Text>Castle</Text><span style={{ flex: 1 }} />
        <SearchTrigger data-wt-hover="" />
      </div>
      <Readout title="Measured" wait={300} read={() => { const t = document.querySelector(".basalt-search-trigger"); const b = box(t); return [`${b?.w} × ${b?.h}px`, css(t, "borderTopWidth", "borderTopLeftRadius", "color"), `word aria-hidden: ${document.querySelector(".basalt-search-trigger-word")?.getAttribute("aria-hidden")}; name: ${t?.getAttribute("aria-label")}`]; }} />
    </div>
  );
}

// ---- 5. The search dialog ----

const PACKS = ["Whey isolate", "Whey concentrate", "Casein", "Creatine monohydrate", "Pre-workout"];
function SearchDemo({ state }: { state: string }) {
  const [open, setOpen] = React.useState(stateOpen(state));
  const [q, setQ] = React.useState(state.includes("empty") ? "" : state.includes("none") ? "zzz" : state.includes("many") ? "many" : "whey");
  const [submitted, setSubmitted] = React.useState("");
  const words = q.trim();
  const many = words === "many";
  const packs = !words || words === "zzz" ? [] : PACKS.slice(0, many ? 5 : 2);
  const brands = !words || words === "zzz" ? [] : ["Acme", "Bolt", "Core"].slice(0, many ? 3 : 1);
  const count = !words ? "Or go straight to a brand." : packs.length + brands.length ? `${packs.length} products, ${brands.length} ${brands.length === 1 ? "brand" : "brands"}` : "0 products";
  React.useEffect(() => {
    if (state.includes("row-focus")) later(400).then(() => document.querySelector<HTMLElement>(".basalt-search-result")?.focus());
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      {caption("Castle's search: a field and a close, a count line and link rows, in a dialog whose results area is as tall as a full result, so nothing moves as you type. Rows are links with a full-bleed hover wash that lifts no ink, and no active row. Enter sends the query to the app.")}
      <div><SearchTrigger onClick={() => setOpen(true)} /></div>
      <SearchDialog open={open} onOpenChange={setOpen} title="Search the shop" label="Search products and brands" placeholder="A brand, whey, creatine" query={q} onQueryChange={setQ} onSubmit={setSubmitted} count={count}>
        <SearchResults>
          {words && words !== "zzz" ? brands.map((b, i) => <SearchResult key={b} href="#brand" media={picture("2")} mediaShape="logo" detail="Brand" trailing="›" data-wt-hover={i === 0 ? "" : undefined}>{b}</SearchResult>) : !words ? ["Acme", "Bolt", "Core"].map((b) => <SearchResult key={b} href="#brand">{b}</SearchResult>) : null}
          {packs.map((p) => <SearchResult key={p} href="#product" media={picture("3")} detail="Acme · 2 lb" trailing="$39.99">{p}</SearchResult>)}
          {many ? <SearchResult href="#all" centered>See all 12</SearchResult> : null}
        </SearchResults>
      </SearchDialog>
      {open ? (
        <Readout title="Measured: type, then compare" wait={600} read={async () => {
          const snap = () => ({ form: box(document.querySelector(".basalt-search-form")), count: box(document.querySelector(".basalt-search-count")), results: box(document.querySelector(".basalt-search-results")), dialog: box(document.querySelector(".basalt-dialog")) });
          const input = document.querySelector<HTMLInputElement>(".basalt-search-input");
          const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          const start = input?.value ?? "";
          const rest = snap();
          const lines: string[] = [];
          for (const query of ["", "zzz", "whey", "many"]) {
            if (input && set) { set.call(input, query); input.dispatchEvent(new Event("input", { bubbles: true })); }
            await frames(3);
            const now = snap();
            lines.push(`"${query || " "}": field ${same(rest.form, now.form) ? "0px" : "MOVED"}, count ${same(rest.count, now.count) ? "0px" : "MOVED"}, results area ${same(rest.results, now.results) ? "0px" : "MOVED"}, dialog ${same(rest.dialog, now.dialog) ? "0px" : "MOVED"}`);
          }
          if (input && set) { set.call(input, start); input.dispatchEvent(new Event("input", { bubbles: true })); }
          await frames(3);
          const rows = [...document.querySelectorAll(".basalt-search-result")].map((r) => Math.round(r.getBoundingClientRect().height));
          return [`ink on the hover wash over the dialog's level, this theme: tertiary ${washRatio("text-tertiary")}, secondary ${washRatio("text-secondary")} (dark 4.78 and 6.83, light 4.88 and 7.74): tertiary passes 4.5:1, so a result lifts no ink`, `results area ${rest.results?.h}px (14 + 3 × 60 + 5 × 72 + 48 = 602)`, ...lines, `row heights now: ${rows.join(", ") || "none"}`, `Enter sends: ${submitted || "(nothing yet)"}`];
        }} />
      ) : null}
    </div>
  );
}

// ---- 6. The listbox ----

function ListboxDemo({ state }: { state: string }) {
  const [value, setValue] = React.useState("alpha");
  React.useEffect(() => { if (state === "focus") later(150).then(() => document.querySelector<HTMLElement>(".basalt-listbox")?.focus()); }, [state]);
  return (
    <div style={{ ...col, maxWidth: 480 }}>
      {caption("Personal's contents list: a single choice that stays in the page, one tab stop, a choice that follows ↑ ↓ Home End. The chosen option has a chevron in its gutter and primary ink; its weight does not change. Rows are 24, two lines 48.")}
      <Card style={{ padding: 0 }}>
        <Listbox label="Contents" value={value} onValueChange={setValue} data-wt-hover="">
          <ListboxGroup label="Work">
            <ListboxOption value="alpha" detail="A synthetic line about where it stands" trailing="live">Alpha</ListboxOption>
            <ListboxOption value="beta" trailing="soon">Beta</ListboxOption>
            <ListboxOption value="gamma" detail="Another synthetic line" trailing="live">Gamma</ListboxOption>
          </ListboxGroup>
          <ListboxGroup label="Code">
            <ListboxOption value="delta" trailing="web">Delta</ListboxOption>
            <ListboxOption value="epsilon" trailing="data">Epsilon</ListboxOption>
          </ListboxGroup>
        </Listbox>
      </Card>
      <Readout title="Measured" wait={300} read={() => {
        const opts = [...document.querySelectorAll<HTMLElement>("[role=option]")];
        const chosen = document.querySelector("[role=option][aria-selected=true]");
        const rest = opts.find((o) => o.getAttribute("aria-selected") !== "true");
        return [`heights ${opts.map((o) => Math.round(o.getBoundingClientRect().height)).join(", ")}`, `radius: two-line ${css(opts[0], "borderTopLeftRadius")}, one-line ${css(rest, "borderTopLeftRadius")}`, `chosen weight ${getComputedStyle(chosen as Element).fontWeight}, other ${getComputedStyle(rest as Element).fontWeight}`, `aria-activedescendant names the option "${parts(document.getElementById(document.querySelector(".basalt-listbox")?.getAttribute("aria-activedescendant") ?? ""))}" (its parts, in the order the tree reads them: name, trailing word, second line)`];
      }} />
    </div>
  );
}

// ---- 7. The opening list ----

const OPEN_ROWS: Array<[string, string, string, string, string, string]> = [
  ["alpha", "Alpha", "design", "live", "A synthetic line about it", "record"],
  ["beta", "Beta", "data", "soon", "", "record"],
  ["gamma", "Gamma", "web", "live", "Another synthetic line", "page"],
  ["delta", "Delta", "web", "soon", "", "page"],
];
function OpenListDemo({ state }: { state: string }) {
  const [off, setOff] = React.useState<string[]>(state.includes("filtered") ? ["beta", "alpha"] : []);
  React.useEffect(() => { if (state.includes("focus")) later(150).then(() => document.querySelector<HTMLElement>("[data-open-button][tabindex='0']")?.focus()); }, [state]);
  return (
    <div style={{ ...col, maxWidth: 720 }}>
      {caption("Personal's first screen: rows that open. The name is a button over the whole row; one row has the tab stop and a ↵ chip. A filter leaves every row in place: a non-match steps to tertiary ink and hides its cells, and the cursor skips it.")}
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" onClick={() => setOff([])}>No filter</Button>
        <Button size="sm" onClick={() => setOff(["beta", "alpha"])}>Filter to web</Button>
      </div>
      <FilterResult>{off.length ? `${OPEN_ROWS.length - off.length} of ${OPEN_ROWS.length} match` : `${OPEN_ROWS.length} rows`}</FilterResult>
      <Card style={{ padding: 0 }}>
        <OpenList label="Work">
          <OpenListGroup label="Work">
            {OPEN_ROWS.map(([id, name, part, st, detail, opens]) => <OpenListRow key={id} id={id} name={name} part={part} state={st} detail={detail || undefined} opens={opens} off={off.includes(id)} onOpen={() => {}} data-wt-hover={id === "gamma" ? "" : undefined} />)}
          </OpenListGroup>
        </OpenList>
      </Card>
      <Readout title="Measured: filter, then compare" wait={500} read={async () => {
        const rects = () => [...document.querySelectorAll(".basalt-open-row")].map((r) => box(r));
        const cells = () => [...document.querySelectorAll(".basalt-open-part")].map((c) => Math.round(c.getBoundingClientRect().x));
        const a = rects(); const ca = cells();
        const start = off;
        const other = state.includes("filtered") ? [] : ["beta", "delta"];
        setOff(other);
        await frames(4);
        const b = rects(); const cb = cells();
        const moved = a.some((r, i) => !same(r, b[i]));
        setOff(start);
        await frames(4);
        const stops = [...document.querySelectorAll<HTMLElement>("[data-open-button]")].map((e) => e.tabIndex);
        return [`a filter moved a row: ${moved ? "YES" : "no (0px)"}; a column: ${ca.join() === cb.join() ? "no (0px)" : "YES"}`, `heights ${a.map((r) => r?.h).join(", ")}`, `tab stops ${stops.join(" ")} (one 0)`, `first row (two lines) ${css(document.querySelector(".basalt-open-row"), "borderTopLeftRadius")}`];
      }} />
    </div>
  );
}

// ---- 8. The notice bar ----

function NoticeDemo() {
  return (
    <div style={{ ...col, maxWidth: 1100 }}>
      {caption("Castle's notice, above the header on every page that shows a price: the level-1 fill with a divider under it, text-sm secondary with its first words primary at 600. A named region, not a live one. Under 720 it keeps its extra 6px on top.")}
      <div style={{ border: "1px solid var(--basalt-border-divider)", borderRadius: 8, overflow: "hidden" }}>
        <NoticeBar label="Preview notice" title="Preview.">Prices are the brands' own list prices. Prices, stock and which products Castle carries are to be confirmed.</NoticeBar>
        <div style={{ padding: 16 }}><Text tone="secondary">The site header and the page follow.</Text></div>
      </div>
      <Readout title="Measured" wait={300} read={() => {
        const bar = document.querySelector(".basalt-notice-bar");
        const p = document.querySelector(".basalt-notice-bar-text");
        return [`${box(bar)?.w} × ${box(bar)?.h}px; the line starts ${Math.round((box(p)?.y ?? 0) - (box(bar)?.y ?? 0))}px below the bar's top`, css(bar, "borderBottomWidth", "backgroundColor"), `role ${bar?.getAttribute("role")}, name "${bar?.getAttribute("aria-label")}", live regions: ${document.querySelectorAll(".basalt-notice-bar [aria-live]").length}`];
      }} />
    </div>
  );
}

// ---- The round ----

const common = { widths: [1440, 390], scales: [1, 2] };
const media = ["forced-colours", "reduced-motion"];

export const ROUND_42: Round = {
  id: "42",
  title: "Overlays and search: a wide dialog, a sheet with steps, a drawer, search, a listbox, an opening list and a notice bar",
  reviewed: false,
  summary:
    "The overlays and search batch of the components stream, ported from the owner's approved sites (DECISIONS 155; the owner's \"port what is approved\", DECISIONS 151). Castle's store opens on 1 December and uses the cart sheet with steps, the search dialog, the search trigger and the notice bar. No wider popover is built: all four kept N1's 320. The design panel has not reviewed this implementation and the owner has not approved it. Where the council voted with no majority (the search field's focus mark, the notice bar's fill), the vote's first option stands, and each step says so.",
  steps: [
    {
      id: "wide-dialog",
      name: "A wide dialog",
      intro: "DialogContent size=\"wide\": the personal site's manual, 992px wide (DECISIONS 158, Q1) with Basalt's padding and scroll, first focus on the title.",
      ...common,
      height: 760,
      states: ["open", "open-forced-colours", "open-reduced-motion"],
      decisions: [
        "Ported as approved: the reference dialog's radius 12 and its measure of 118 characters of Geist Mono at 14px. Changed by the council: Basalt's padding and scroll replace the prototype's 64 and 66, and its own outline stays (the prototype removed it). The width is 992px, fixed, decided in DECISIONS 158 (Q1, 3 to 1): DECISIONS 155's 118ch is withdrawn because on Basalt's dialog (Geist Sans) it draws 1,251.7px; 992px is the 118 characters of Geist Mono at 14px (991.17px) rounded up, kept in px, as the token size-dialog-width-wide.",
        "Changed: the first focus is the title, not the first \"things to try\" button, so Enter on opening runs nothing (the ballot's defect). The title takes tabIndex -1 and draws no ring, since nothing operates it.",
        "R1 and the wider popover: all four refused (4 to 0). N1's popover drew at size-popover-max, 320, three measured it, so no wide size is built.",
        "V1, the scrim: Basalt's own (black 80% in dark, 40% in light, unblurred), 4 to 0; a product may re-point the token.",
      ],
      tryIt: ["Open the manual, press Enter at once: nothing runs. Tab to see the buttons in order.", "Resize to 390: the dialog is the window less 32."],
      demo: ({ state }) => <WideDialogDemo state={state} />,
    },
    {
      id: "sheet-anatomy",
      name: "A sheet with a head, a body, a foot and steps",
      intro: "SheetHeader, SheetBody, SheetFooter and SheetContent step: Castle's cart, and its order summary in the same sheet.",
      ...common,
      height: 760,
      states: ["open", "open-step-2", ...media.map((m) => `open-${m}`)],
      decisions: [
        "Ported as approved: the head (padding 12 12 12 20, a divider under it), the foot (16 20, bottom max(20, the safe area), a divider above), the sheet's width 440, 300ms in and 225ms out, the title taking focus on a step.",
        "Changed by the council (R3, R4 and the ballot's defects): the title is text-xl 20/28, the close is 44 at every pointer (a local value that joins the controls batch's size token), the head and the foot keep the safe areas that Castle's padding 0 dropped, the scrim leaves at 0.75× and honours reduced motion, and focus goes to this sheet's title by a ref, not a document-wide query.",
        "V1: Basalt's scrim, 4 to 0. B1: the head, body and foot are parts, and a step prop moves focus; the title's tabIndex is -1 either way.",
      ],
      tryIt: ["Press Review order: focus goes to the new title; Back to cart returns it.", "Scroll the cart: the head and the foot stay."],
      demo: ({ state }) => <CartDemo state={state} />,
    },
    {
      id: "drawer",
      name: "A docked drawer",
      intro: "Drawer, DrawerSection and DrawerTrigger: personal's session and sources under its column.",
      ...common,
      height: 640,
      states: ["closed", "hover", ...media],
      decisions: [
        "V2, the drawer's top edge: the prototype's form with the break removed, a 1px border-divider on top and no fill step, 4 to 0 (the prototype's brighter line broke the divider rule).",
        "A drawer is in the flow: no portal, scrim, level reset, sheet motion, shadow or corner radius (sol's note), so it is not a modal={false} sheet. Its height is the app's in rows (R12): 13 rows of 24 is 312. Under 720 it is a page of its own: open, it replaces the record, and Back closes it, shows the record again and returns focus to the trigger. The component draws the stacked halves and Back; the app hides the record and moves focus (the README says which is which).",
        "Changed: the trigger carries aria-controls and aria-expanded (the ballot's defect). The halves are equal by default (the prototype's 62ch column is the site's own); `columns` sets them. Nothing here moves focus when it opens: the app does.",
      ],
      tryIt: ["Press Session to close and open the drawer: what is above does not move.", "At 390 the open drawer replaces the record; press Back: the record returns and Session has focus."],
      demo: ({ state }) => <DrawerDemo state={state} />,
    },
    {
      id: "search-trigger",
      name: "The search trigger",
      intro: "SearchTrigger: Castle's header button, a field from 720 and an icon button under it.",
      ...common,
      height: 360,
      states: ["hover", "focus", ...media],
      decisions: [
        "Ported as approved: a 1px control boundary, radius 8, gap 10, inline padding 14, the glyph and the word from 720, a 44px icon button below. The word is aria-hidden and the button carries aria-label.",
        "R5: size-search-trigger, 200. R6, R7 and R8 follow the control sizes: 44 high at every pointer (a local value that joins the controls batch's size token) and 16px text. Hover lifts the word to primary and keeps the boundary at the input boundary; Castle's hover faded it.",
      ],
      tryIt: ["Hover and Tab to it; resize across 720: the height stays 44."],
      demo: ({ state }) => <TriggerDemo state={state} />,
    },
    {
      id: "search-dialog",
      name: "The search dialog",
      intro: "SearchDialog, SearchResults and SearchResult: Castle's search, a field, a count and link rows with pictures.",
      ...common,
      height: 900,
      states: ["open", "open-empty", "open-none", "open-many", "open-hover", "open-row-focus", ...media.map((m) => `open-${m}`)],
      decisions: [
        "V3, 4 to 0: the dialog stays centred and the results area has a fixed height, a full result's (14 + 3 × 60 + 5 × 72 + 48), so the field and the count never move. The step prints each measurement while the query changes.",
        "V4, no majority (muse, opus: a real 2px outline at −2 round the field's band; sol and grok wrote in +2): the vote's first option stands, the −2 inset. All four keep the Close button. A browser's own clear × is hidden, so the band has one ×.",
        "V5, 3 to 1 (opus wanted options in a listbox with arrow keys): results stay links, each a tab stop with the +2 ring, a full-bleed hover wash and no active row. For the owner's review.",
        "R9, three refused a fixed 48px row: a row is its picture plus 6px above and below, 72 for a 48 by 60 pack, 60 for a 96 by 48 logo, 48 only as a floor. R7 and R8: 16px for the result names and the field. The count is FilterResult's debounced line, not a status rewritten per keystroke.",
      ],
      tryIt: ["Type: nothing moves.", "Tab from the field: close, then each result; press Enter in the field to send the query."],
      demo: ({ state }) => <SearchDemo state={state} />,
    },
    {
      id: "listbox",
      name: "A standalone listbox",
      intro: "Listbox, ListboxGroup and ListboxOption: personal's contents list, a single choice that follows the arrow keys.",
      ...common,
      height: 520,
      states: ["focus", "hover", ...media],
      decisions: [
        "Ported as approved: the chevron in a gutter that marks the chosen row, two-line options, the arrow keys that choose, aria-activedescendant.",
        "Changed: the chosen name stays at weight 400 (the prototype went to 500; there is no weight change), the header rows are labelled groups (not role=presentation children of the listbox), and the list shows the control ring at +2 (the prototype removed it). B3: flush draws it inside at −2 where the list meets a clipping edge.",
        "R10 and R11 (by the drawn-box rule, DECISIONS 138 E): rows are 24 and two lines 48; the plate's radius is 6 on a 24px row and 8 on a row drawn at 44 or more (a coarse pointer's 44).",
      ],
      tryIt: ["Tab to the list, then ↓ ↑ Home End: the choice moves with the keys."],
      demo: ({ state }) => <ListboxDemo state={state} />,
    },
    {
      id: "open-list",
      name: "A list that opens its rows",
      intro: "OpenList, OpenListGroup and OpenListRow: personal's first screen, rows that open and one cursor.",
      ...common,
      height: 640,
      states: ["focus", "filtered", "hover", ...media],
      decisions: [
        "V6, 4 to 0: the cursor row keeps its ↵ chip (aria-hidden, one per list, hidden on touch until a hardware key). V7, 4 to 0: filtering leaves every row in place, a non-match steps to tertiary ink and hides its cells, the cursor skips it, and there is no match mark.",
        "Changed: the row's right margin is 6px, not 4 (the foundations rule for a focusable row), and the hover wash runs full bleed. The ring is the control ring at +2 outside the row. The columns are one grid shared by every row, and every row holds the chip's and the chevron's seats, so the cursor moving moves no column.",
        "The cursor plate is the hover wash at rest and the selected wash while the list holds focus (the prototype's two steps in Basalt's tokens). Counting is a FilterResult outside the list.",
      ],
      tryIt: ["Tab in, then j k g G Home End; Filter to web and press k: the cursor skips the rows left in place."],
      demo: ({ state }) => <OpenListDemo state={state} />,
    },
    {
      id: "notice-bar",
      name: "A notice bar",
      intro: "NoticeBar: Castle's one line across the top of every page that shows a price.",
      ...common,
      height: 420,
      states: media,
      decisions: [
        "V8, no majority (muse, opus: the level-1 fill with a border-divider under it; sol and grok: the level-1 fill and no line, as Castle has none): the vote's first option stands, with the divider. The divider is the build's detail, not Castle's.",
        "Ported as approved: text-sm secondary with the first words primary at 600, padding 4 above and below, gap 24, wrapping under 720. Under 720 the line keeps its extra 6px on top (grok's note). Changed: it is a named region (B4), the fill is Basalt's level-1 fill, not Castle's darker light-mode fill.",
      ],
      tryIt: ["Resize to 390: the line wraps and keeps 6px more above it."],
      demo: () => <NoticeDemo />,
    },
  ],
};
