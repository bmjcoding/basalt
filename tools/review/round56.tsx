// Round 56: the composer, the mention, the mention picker and the public plate (cimip-gaps-2, batch B3). Decided and built by Opus on the
// no-council path (DECISIONS 226 and 265); the code review is Astra's and the pixels are the lead's, and neither has happened yet. Every part
// is shown in two unlike domains, a support inbox and a build pipeline, with synthetic names only. States: at rest (`default`), `typing`
// (words in the field and someone typing), `long` (the field at its cap, scrolling), `sending` (a send held out, Send's ring up),
// `picker` (@ typed, the picker open under the field's line), `picker-keys` (↓ twice), `picker-foot` (the composers at the page's foot: the
// picker above the line), and forced colours and reduced
// motion for each that moves or marks.

import * as React from "react";

import { Button, Card, CardContent, Composer, Mention, Text, typingStatus } from "../../packages/react/src/index";
import type { MentionOption } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "").replace(/-foot$/, "");

const SUPPORT: MentionOption[] = [
  { label: "Ana Ruiz", value: "u1", description: "Support lead · Online", group: "People" },
  { label: "Anders Holm", value: "u2", description: "Billing · Away until 2 pm", group: "People" },
  { label: "Ben Okafor", value: "u3", description: "Support · Online", group: "People" },
  { label: "billing", value: "t1", description: "Team of 4 · Refunds and invoices", group: "Teams" },
  { label: "android-app", value: "t2", description: "Team of 6 · Mobile reports", group: "Teams" },
  { label: "analytics", value: "t3", description: "Reaches nobody yet", group: "Teams", disabled: true },
  { label: "tier-2", value: "r1", description: "Whoever takes escalations this week", group: "Roles" },
];
const PIPELINE: MentionOption[] = [
  { label: "Lee Park", value: "u1", description: "Owns the arm64 runners", group: "People" },
  { label: "Lena Varga", value: "u2", description: "Release manager", group: "People" },
  { label: "Mira Sato", value: "u3", description: "Build tooling", group: "People" },
  { label: "linker", value: "t1", description: "Team of 3 · Toolchain", group: "Teams" },
  { label: "release", value: "t2", description: "Team of 5 · Signs and ships", group: "Teams" },
  { label: "on-call", value: "r1", description: "Whoever holds the pager this week", group: "Roles" },
];

const DOMAINS = {
  support: {
    title: "Order 4471: refund not received",
    label: "Reply to the customer",
    placeholder: "Reply to the customer. Type @ to bring someone in.",
    options: SUPPORT,
    typed: "Hi Jordan, the refund went out this morning. It takes three to five business days to reach your card.",
    long: ["Hi Jordan,", "", "The refund went out this morning.", "It takes three to five business days", "to reach your card, and your bank", "may show it as pending first.", "", "If it hasn't arrived by Friday,", "reply here and we'll trace it."].join("\n"),
    query: "Thanks, @an",
    typing: ["Ana Ruiz"],
    actions: <Button variant="ghost" size="sm">Attach</Button>,
    sendKey: "Enter" as const,
  },
  pipeline: {
    title: "Nightly build #2291 failed on arm64",
    label: "Comment on the build",
    placeholder: "Comment on the build. Type @ to ask someone.",
    options: PIPELINE,
    typed: "The linker ran out of memory on the arm64 runner. Rerunning with the larger runner now.",
    long: ["The linker ran out of memory on arm64:", "", "  ld: error: out of memory", "  allocating 2147483648 bytes", "", "Rerunning on the 32 GB runner.", "If that passes I'll raise the default", "for every arm64 job in the matrix", "and close this."].join("\n"),
    query: "@l",
    typing: ["Lee Park", "Mira Sato"],
    actions: <Button variant="ghost" size="sm">Code block</Button>,
    sendKey: "Mod+Enter" as const,
  },
};

function Thread({ domain, state }: { domain: keyof typeof DOMAINS; state: string }) {
  const d = DOMAINS[domain];
  const kind = kindOf(state);
  const [text, setText] = React.useState(kind === "typing" || kind === "sending" ? d.typed : kind === "long" ? d.long : "");
  const field = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    const ta = field.current;
    if (!ta) return undefined;
    if (kind === "picker" || kind === "picker-keys") {
      // A real focus and a real input event, so the picker reads the field as it would a person's typing.
      ta.focus();
      ta.value = d.query;
      ta.setSelectionRange(d.query.length, d.query.length);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      setText(d.query);
      if (kind === "picker-keys") {
        const timer = window.setTimeout(() => {
          for (let i = 0; i < 2; i++) ta.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
        }, 200);
        return () => window.clearTimeout(timer);
      }
    }
    if (kind === "long") { ta.scrollTop = ta.scrollHeight; }
    if (kind === "sending") {
      const timer = window.setTimeout(() => ta.closest(".basalt-composer")?.querySelector<HTMLButtonElement>(".basalt-composer-send")?.click(), 50);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [kind, d]);
  return (
    <section style={{ display: "grid", gap: "var(--basalt-space-3)", minWidth: 0 }}>
      <Text size="sm" weight="medium">{d.title}</Text>
      {domain === "support" ? (
        <Text size="sm" tone="secondary">
          <Mention>Ben Okafor</Mention> checked the payment provider: the refund was issued at 09:12. <Mention you>Ana Ruiz</Mention>, can you confirm the card it went to?
        </Text>
      ) : (
        <Text size="sm" tone="secondary">
          <Mention>Mira Sato</Mention> retried once with the same runner and it failed at the same step. <Mention you>Lee Park</Mention>, is the 32 GB pool free tonight?
        </Text>
      )}
      <Composer
        label={d.label}
        placeholder={d.placeholder}
        value={text}
        onValueChange={setText}
        inputRef={field}
        sendKey={d.sendKey}
        actions={d.actions}
        status={typingStatus(kind === "default" ? [] : d.typing)}
        // The review holds a send out, so the ring can be seen; it never settles.
        onSend={() => (kind === "sending" ? new Promise(() => {}) : undefined)}
        mentions={{ options: d.options, label: "Mention someone" }}
      />
    </section>
  );
}

function Composers({ state }: { state: string }) {
  const at = state.includes("-foot") ? "foot" : "top";
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", display: "grid", gap: "var(--basalt-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", alignContent: at === "foot" ? "end" : "start", minHeight: at === "foot" ? 700 : undefined }}>
      <Thread domain="support" state={state} />
      <Thread domain="pipeline" state={state} />
    </div>
  );
}

// An app's own list, drawn with the public plate: the active row is `var(--basalt-plate)` at whatever level the list sits on.
function OwnList({ title, rows, active }: { title: string; rows: string[]; active: number }) {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-1)", minWidth: 0 }}>
      <Text size="xs" tone="tertiary" weight="medium">{title}</Text>
      <div role="listbox" aria-label={title} aria-activedescendant={`${title}-${active}`} tabIndex={0} style={{ display: "grid", gap: "var(--basalt-space-0-5)" }}>
        {rows.map((r, i) => (
          <div key={r} id={`${title}-${i}`} role="option" aria-selected={i === active} style={{ padding: "var(--basalt-space-2) var(--basalt-space-3)", borderRadius: "var(--basalt-radius-md)", background: i === active ? "var(--basalt-plate)" : undefined, color: i === active ? "var(--basalt-text-primary)" : "var(--basalt-text-secondary)", fontSize: "var(--basalt-text-base-size)", lineHeight: "var(--basalt-text-base-line-height)" }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

function Plates() {
  const inbox = ["Unassigned", "Mine", "Waiting on customer", "Closed"];
  const runs = ["main · #2291", "release/4.2 · #2290", "main · #2289"];
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", display: "grid", gap: "var(--basalt-space-6)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
      <OwnList title="Inbox views (the page)" rows={inbox} active={1} />
      <Card><CardContent><OwnList title="Recent runs (a card, level 1)" rows={runs} active={0} /></CardContent></Card>
      <Card><CardContent><Card><CardContent><OwnList title="Queues (level 2)" rows={inbox} active={2} /></CardContent></Card></CardContent></Card>
    </div>
  );
}

export const ROUND_56: Round = {
  id: "56",
  title: "The composer, the mention, the mention picker and the public plate (cimip-gaps-2, B3)",
  reviewed: false,
  summary:
    "Four parts any app that lets people write to each other needs: a composer (a message field with no visible label, its actions and Send, and a line for who is typing), a mention (a name that calls on someone, marked by its @ and a weight), a mention picker (Combobox's rows in a popup over the field, focus left in the field), and the lit row's plate as public tokens, so an app's own list draws its active row as Basalt does. Decided and built by Opus on the no-council path (DECISIONS 226 and 265); Astra's code review and the lead's pixel check have not happened yet, and no design panel reviewed it. Shown in a support inbox and a build pipeline, synthetic names only, at 1440 and at 390 on touch, in both themes, with forced colours and reduced motion. No space step at 160 was added: the 160 that was asked for is a label column, and `size-description-label` is that.",
  steps: [
    {
      id: "composer",
      name: "The composer",
      intro: "Where a person writes a message: the field (its name is its label, and there is no visible one), the app's actions and Send under it, and one line for who is typing.",
      decisions: [
        "Built from parts that are already decided: Basalt's Textarea, a primary Button for Send at the row's end, the app's own ghost buttons at its start, and the status line in text-xs tertiary ink. No new look.",
        "The status line is one line tall even when empty, so nothing moves when someone starts typing; it is a polite live region. `typingStatus` writes \"Ana is typing\", \"Ana and Ben are typing\", \"Ana, Ben, and Cy are typing\" and \"4 people are typing\"; an app can write its own words.",
        "The field starts at two lines (the Textarea's own least) and grows a line at a time to eight, then scrolls; both are props (`rows`, `maxRows`). No resize handle: its height is its text's. Where the browser cannot size a field to its content it is measured instead, within the same bounds.",
        "Enter sends and Shift+Enter is a new line, and the soft keyboard's key says Send. With `sendKey=\"Mod+Enter\"` (the build pipeline) Enter is a new line and ⌘↵ or Ctrl Enter sends, shown as chips beside Send (ActionShortcut, hidden on touch until a hardware key is pressed). A key presses Send, so a key and a press are one send, guarded by the button's own wait: while a send is out, a second Enter sends nothing.",
        "On success the field is cleared, unless the person changed the text while it was out; a refusal keeps the words. A press on Send keeps focus (and a phone's keyboard) in the field.",
        "Not reviewed: no design panel, and Astra and the lead have not looked yet.",
      ],
      tryIt: [
        "Type a reply and press Enter in the support thread; in the build thread press Enter for a new line and ⌘↵ (Ctrl Enter) to send.",
        "Paste ten lines: the field grows to eight and then scrolls.",
        "Type @ and a letter: the picker opens over the field's line (the next step).",
      ],
      states: ["typing", "long", "sending", "typing-forced-colours", "sending-reduced-motion"],
      widths: [1440, 390],
      scales: [2],
      height: 560,
      touch: true,
      demo: ({ state }) => <Composers state={state} />,
    },
    {
      id: "picker",
      name: "The mention picker",
      intro: "Typing @ at the start of a word offers who can be named: people, teams and roles, two lines a row, under the trigger's line, with focus left in the field.",
      decisions: [
        "Combobox's popup and rows, reused: the popup's level, rim, shadow and radius 12, the 58px two-line rows (54 plate), group labels, the plate and its glide, and the lift from secondary to primary. `Listbox` is a list in the page that holds focus, so it is not the picker.",
        "Focus stays in the field, which carries `aria-activedescendant` to the active row, `aria-controls` to the list while it is open, and `aria-autocomplete=\"list\"`. ↑ and ↓ move the plate and pass over a row that cannot be picked; Enter or Tab writes \"@Name \" (the browser's own undo takes it back); a press on a row picks it; Esc closes it until another @ is typed, and a dialog round the field stays open.",
        "It sits under the trigger's line, 6px from it, and above the line when there is more room there (a composer at a page's foot), inside the window at 390.",
        "A name may hold a space (\"@ana r\") while something matches; once nothing does it closes, so a sentence is never held. An @ inside a word (an address) opens nothing. A query that matches nothing opens nothing, and the app still hears it (`onQueryChange`) to look names up on its server.",
        "Rows are cut, never wrapped, as every popup row is today. Whether described rows may wrap is another batch's question (B6).",
      ],
      tryIt: [
        "Type @an in the support thread, ↓ twice, Enter.",
        "Type @an and press Esc; type more: it stays closed until the next @.",
      ],
      states: ["picker", "picker-keys", "picker-foot", "picker-forced-colours", "picker-reduced-motion"],
      widths: [1440, 390],
      scales: [2],
      height: 640,
      touch: true,
      demo: ({ state }) => <Composers state={state} />,
    },
    {
      id: "mention",
      name: "The mention, and the public plate",
      intro: "A name in running text that calls on someone, and the plate an app's own list can draw its active row with.",
      decisions: [
        "A mention is the trigger and the name at 500 in primary ink: a glyph and a weight mark it, never a colour, and it wraps with its text. The trigger is a prop (\"#billing\").",
        "A mention of the reader (`you`) sits on its level's plate as well, radius 4 and 2px each side of its own, drawn on every line it wraps to (given back by a margin, the plate ate half the space before it); in forced colours it is Mark with MarkText.",
        "The plate is public: tokens plate-0 to plate-3 (the selected wash over each level as one opaque colour, in both themes and in Swift), and `--basalt-plate`, which follows the level a part sits in. Basalt's pressed toggle, chosen card and chosen peek now read it; a test proves they paint the same pixel the private recipe did.",
        "No space step above 128: the 160 that was asked for is a label column, which `size-description-label` already names. Space steps are gaps; past 64 the scale has only the section gaps (96 and 128).",
      ],
      tryIt: ["Look at the three lists: each active row is `var(--basalt-plate)`, a step lighter at each level in dark and one grey in light. These are an app's own markup with inline styles, so in forced colours their fill goes: an app gives its own active row `Highlight` there, as Basalt's rows do."],
      states: ["forced-colours"],
      widths: [1440, 390],
      scales: [2],
      height: 520,
      touch: true,
      demo: () => <><Composers state="default" /><Plates /></>,
    },
  ],
};
