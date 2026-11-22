// Round 56: engineering inside the decided design (DECISIONS 265, batch B0). Nothing here is a new look: the one pixel change restores a documented rule (a cut
// link in a still table's pinned row head now ends in an ellipsis, as one in a data cell always has); the command menu's search is an API; the content-policy
// provider draws what Base UI's inline style drew. Each part in two unlike domains, with synthetic data only. Built by Opus; Astra reviews the code and the lead
// the pixels. States: `open` (the docs domain) and `open-inbox` for the menu; `open` for each Select under the provider, with forced colours and reduced motion.

import * as React from "react";

import {
  Button,
  CommandMenu,
  CSPProvider,
  Link,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Text,
} from "../../packages/react/src/index";
import type { CommandGroup } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");

// ---- A still table with a pinned row head that holds a link, in two domains ----

const JOBS: Array<[string, string, string, string]> = [
  ["integration-tests-linux-arm64-large", "release-engineering", "Waiting for a runner", "4m 12s"],
  ["lint", "web-platform", "Passed", "38s"],
  ["package-signing-and-notarisation", "release-engineering", "Passed", "2m 05s"],
  ["docs-preview", "docs", "Failed", "1m 47s"],
];
const DOCUMENTS: Array<[string, string, string, string]> = [
  ["Quarterly planning notes and budget draft", "finance-and-operations", "Shared with 4 people", "Nov 20, 2026"],
  ["Readme", "docs", "Only you", "Nov 19, 2026"],
  ["Onboarding checklist for new contributors", "people-team", "Anyone with the link", "Nov 14, 2026"],
  ["Roadmap", "product", "Shared with 12 people", "Nov 2, 2026"],
];

function PinnedTable({ label, heads, rows, newTab = false }: { label: string; heads: [string, string, string, string]; rows: Array<[string, string, string, string]>; newTab?: boolean }) {
  return (
    <TableContainer label={label}>
      <Table columns={[{ width: 180 }, { width: 160 }, {}, { width: 120 }]} minWidth={640} pinned={1}>
        <TableHeader>
          <TableRow>
            {heads.map((head) => <TableHead key={head}>{head}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([name, owner, note, last]) => (
            <TableRow key={name}>
              <TableRowHead><Link href="#" target={newTab ? "_blank" : undefined}>{name}</Link></TableRowHead>
              <TableCell><Link href="#">{owner}</Link></TableCell>
              <TableCell>{note}</TableCell>
              <TableCell>{last}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function Tables() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PinnedTable label="Jobs" heads={["Job", "Owner", "Status", "Took"]} rows={JOBS} />
      <PinnedTable label="Documents" heads={["Document", "Folder", "Sharing", "Edited"]} rows={DOCUMENTS} newTab />
    </div>
  );
}

// ---- CommandMenu's search, carried by a row, in two domains ----

const DOMAINS = {
  docs: {
    button: "Document commands",
    word: "budget",
    group: { label: "Document", commands: [{ id: "share", label: "Share document" }, { id: "export", label: "Export as PDF" }, { id: "history", label: "Version history" }] },
    find: (search: string) => `Search this document for “${search}”`,
  },
  inbox: {
    button: "Inbox commands",
    word: "refund",
    group: { label: "Inbox", commands: [{ id: "assign", label: "Assign to me" }, { id: "close", label: "Close ticket" }, { id: "refund-policy", label: "Open the refund policy" }] },
    find: (search: string) => `Search all tickets for “${search}”`,
  },
};

function Commands({ state }: { state: string }) {
  const kind = kindOf(state);
  const domain = kind === "open-inbox" ? DOMAINS.inbox : DOMAINS.docs;
  const shown = kind.startsWith("open");
  const [open, setOpen] = React.useState(shown);
  const [search, setSearch] = React.useState(shown ? domain.word : "");
  const groups: CommandGroup[] = [domain.group, ...(search ? [{ label: "Search", commands: [{ id: "find", label: domain.find(search), keywords: [search] }] }] : [])];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button onClick={() => setOpen(true)}>{domain.button}</Button>
      <CommandMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
        groups={groups}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}

// ---- Select under CSPProvider disableStyleElements, in two domains ----

function Selects({ state }: { state: string }) {
  const open = kindOf(state) === "open";
  return (
    <CSPProvider disableStyleElements>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 220 }}>
          <Text size="sm" tone="secondary">A build pipeline</Text>
          <Select aria-label="Runner" defaultOpen={open} defaultValue="arm" options={[{ value: "linux", label: "Linux x64" }, { value: "arm", label: "Linux arm64" }, { value: "mac", label: "macOS" }, { value: "win", label: "Windows" }]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 220 }}>
          <Text size="sm" tone="secondary">A shared folder</Text>
          <Select aria-label="Sort documents" defaultValue="edited" options={[{ value: "edited", label: "Last edited" }, { value: "name", label: "Name" }, { value: "owner", label: "Owner" }]} />
        </div>
      </div>
    </CSPProvider>
  );
}

export const ROUND_56: Round = {
  id: "56",
  title: "Engineering: a pinned link's ellipsis, the command menu's search, and a page under a content policy (DECISIONS 265, B0)",
  reviewed: false,
  summary:
    "Engineering inside the decided design. One pixel change, and it restores a documented rule: a cut link in a still table's pinned row head ends in an ellipsis, as one in a data cell always has. CommandMenu's search is now the app's to read or control, so a row can carry the words typed. Under a content policy, the head scripts ship as files, and CSPProvider turns off Base UI's one inline style while Basalt's sheet draws the same rule. Built by Opus; Astra reviews the code and the lead the pixels; no design panel, because nothing new is drawn. Synthetic data, in two unlike domains each.",
  steps: [
    {
      id: "pinned-links",
      name: "A cut link in a pinned row head",
      intro: "Two still tables, a build pipeline's jobs and a shared folder's documents, each with its name column pinned and every name a link; the documents open in a new tab, with the new-tab arrow.",
      decisions: [
        "Restores \"a cut cell keeps its ellipsis\" (foundations, the still table): the rule that makes a link its own truncating box was written for `td > a` only, so a long link in the pinned `th` was cut hard mid-letter. It is now `:is(td, th) > a`, in React and in the HTML skill's still table, with the same specificity. The hard cut showed on a new-tab link (its label and arrow are a row of their own, so the cell's own ellipsis cannot reach them): its label now truncates and the arrow stays whole, as in a data cell.",
        "Nothing else moves: column widths, the 40px row, the pinned edge and the link's own ring are as they were. A short name is whole.",
        "Not reviewed by the design panel: it restores documented behaviour (engineering, AGENTS.md). The cut link is not yet a cut cell with a plate: the cell's link is its one stop, as in a data cell (unchanged; noted for the owner in the report).",
      ],
      tryIt: ["At 390, scroll a table sideways: the pinned names keep their ellipsis.", "Tab through the names: each link takes its ring."],
      states: ["forced-colours", "reduced-motion"],
      widths: [1440, 390],
      height: 720,
      touch: true,
      demo: () => <Tables />,
    },
    {
      id: "command-search",
      name: "The command menu's search, carried by a row",
      intro: "A document's commands and a support inbox's, each with the app's own last row that searches for the words typed.",
      decisions: [
        "`search` and `onSearchChange` on `CommandMenu`: the app hears what is typed and may control it. Uncontrolled, the search starts empty at each opening, and the app hears `\"\"` once the menu has closed (after its closing transition, so the list does not change on its way out). Words typed while the panel loads are part of the search.",
        "No pixel change: the row is an ordinary command the app adds, with the words in its label and `keywords: [search]` so it stays found.",
      ],
      tryIt: ["Open either menu and type: the last row follows the words.", "Close and open again: the search starts empty."],
      states: ["open", "open-inbox", "open-forced-colours", "open-reduced-motion"],
      widths: [1440, 390],
      height: 640,
      touch: true,
      demo: ({ state }) => <Commands state={state} />,
    },
    {
      id: "policy-select",
      name: "A Select under a content policy",
      intro: "Two Selects inside `CSPProvider disableStyleElements`, a build pipeline's runner and a shared folder's sort.",
      decisions: [
        "Base UI writes one inline `<style>` when a Select opens; `style-src 'self'` refuses it. With the provider, Base UI writes none, and Basalt's sheet draws the same two declarations on `.base-ui-disable-scrollbar` in `@layer basalt`. Measured with Base UI's style and without it: the open popup's box, and its list's scrollbar width and client width, are the same; no style element is written (tested under a real policy).",
        "The head scripts (`themeBootstrap`, `loopsBootstrap`) ship as files too (`head/theme.js`, `head/loops.js`) for `script-src 'self'`; nothing to see.",
      ],
      tryIt: ["Open the runner Select and choose: it behaves as any Select."],
      states: ["open", "open-forced-colours", "open-reduced-motion"],
      widths: [1440, 390],
      height: 480,
      touch: true,
      demo: ({ state }) => <Selects state={state} />,
    },
  ],
};
