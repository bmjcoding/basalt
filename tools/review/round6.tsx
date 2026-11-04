import * as React from "react";
import { CubeIcon } from "@phosphor-icons/react";
import { CompositionExample, NavigationExample, TypographyExample } from "../../packages/react/examples/completion";
import { Avatar, Button, EmptyState, Field, Input, Separator, Text } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 };

export const ROUND_6: Round = {
  id: "6",
  reviewed: false,
  title: "Navigation and composition",
  summary: "Shared typography, navigation and empty-state building blocks keep product screens from inventing their own versions. These additions await your review.",
  steps: [
    {
      id: "typography", name: "Text, Heading and InlineCode",
      intro: "Use the shared Geist scale without coupling a heading's visual size to its place in the document.",
      decisions: ["Heading level is semantic; size is visual. A small h1 is still the page heading.", "Text covers the ten type steps, three weights, readable neutral tones and monospace identifiers.", "InlineCode is for a short command or identifier. Longer examples use CodeBlock."],
      tryIt: ["Compare the hierarchy in both themes.", "The large heading in this example is structurally an h3; its visual role is 3xl."],
      demo: () => <TypographyExample />,
    },
    {
      id: "navigation", name: "Breadcrumbs, Pagination and Link",
      intro: "Show the current location and move through a result set using familiar link and button semantics.",
      decisions: ["Breadcrumbs label the path and mark the current page with aria-current.", "Pagination renders a bounded window even for very large totals. Current-page outline, disabled ends and gaps are explicit.", "Use hrefForPage for URL navigation or onPageChange for local results. Link keeps native anchor behaviour and protects new-window links."],
      tryIt: ["Move to the next page and watch the page window change.", "Tab through the links. The sample destination hashes keep the walkthrough offline."],
      demo: () => <NavigationExample />,
    },
    {
      id: "avatar", name: "Avatar and Separator",
      intro: "An image with a named initials fallback, and a semantic division between groups.",
      decisions: ["Avatars use a neutral surface and a full radius, at 24, 32, 40 or 48px.", "The accessible name is the person's name; initials are visual fallback content, not a second announcement.", "Separator uses the divider token. Vertical separators need a surrounding layout with an explicit height."],
      tryIt: ["Compare the four sizes and the failed-image fallback.", "Check both themes: the divider stays quieter than a control boundary."],
      demo: () => <div style={col}><div style={{ display: "flex", gap: 16, alignItems: "center" }}>{([24, 32, 40, 48] as const).map((size) => <Avatar key={size} name="Bailey Jones" size={size} />)}<Avatar name="Alex Chen" src="data:image/png;base64,invalid" /></div><Separator /><Text size="sm" tone="secondary">Two separate groups of content.</Text></div>,
    },
    {
      id: "empty", name: "EmptyState",
      intro: "Explain why a view is empty and provide the next useful action.",
      decisions: ["A heading and description carry the meaning; the optional icon is decorative.", "Initial empty content is a named section, without an unsolicited alert announcement.", "Keep the surface neutral. The main action can be primary when it is the view's next step."],
      tryIt: ["Create the first sandbox in the example; the empty state gives way to content.", "Compare with an empty search result, which should explain how to broaden the search."],
      demo: () => <CompositionExample />,
    },
    {
      id: "no-results", name: "Empty results",
      intro: "A search with no matches needs different guidance from a new account with no content.",
      decisions: ["Name the condition and offer a relevant recovery action.", "Avoid treating an empty result as an application error or adding an error-coloured illustration."],
      tryIt: ["Clear the example search to recover results."],
      demo: () => <EmptyResults />,
    },
  ],
};

function EmptyResults() {
  const [query, setQuery] = React.useState("agent-runner-99");
  return <div style={col}><Field label="Search sandboxes"><Input value={query} onValueChange={setQuery} /></Field>{query ? <EmptyState icon={CubeIcon} title="No sandboxes match" description={`There are no results for “${query}”. Try a shorter name or clear the search.`} actions={<Button onClick={() => setQuery("")}>Clear search</Button>} /> : <Text>blacksand-api · Ready</Text>}</div>;
}
