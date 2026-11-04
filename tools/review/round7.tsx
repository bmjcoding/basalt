import * as React from "react";
import { DialogCompositionExample } from "../../packages/react/examples/completion";
import { Button, Text } from "../../packages/react/src/index";
import renderDark from "./assets/round-7/swiftui-components-dark.png";
import renderLight from "./assets/round-7/swiftui-components-light.png";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 };

function NativeRenders({ initialAppearance = "dark" }: { initialAppearance?: "dark" | "light" }) {
  const [appearance, setAppearance] = React.useState(initialAppearance);
  return <div style={col}><div style={{ display: "flex", gap: 8 }}><Button aria-pressed={appearance === "dark"} onClick={() => setAppearance("dark")}>Dark native view</Button><Button aria-pressed={appearance === "light"} onClick={() => setAppearance("light")}>Light native view</Button></div><img src={appearance === "dark" ? renderDark : renderLight} alt={`${appearance} macOS SwiftUI render: buttons, validated fields, text editor, toggles, status, progress and empty state.`} style={{ width: "100%", height: "auto", borderRadius: 12 }} /><Text size="sm" tone="secondary">An actual NSHostingView render. This image is a reference; the native controls are interactive in a SwiftUI application.</Text></div>;
}

export const ROUND_7: Round = {
  id: "7",
  reviewed: false,
  title: "Native components and package readiness",
  summary: "A SwiftUI component layer now joins the token package. Standalone npm archives, strict consumer types and overlay integration checks make the library ready for local adoption after review.",
  steps: [
    {
      id: "native", name: "BasaltUI for SwiftUI",
      intro: "Shared native controls use the same tokens, Geist fonts and monochrome roles while retaining platform text entry and accessibility.",
      decisions: ["BasaltUI supplies buttons and icon buttons, labelled text fields and editors, toggles, cards, badges, callouts, progress, empty states and dividers.", "BasaltButtonStyle and BasaltToggleStyle can also style existing native controls. iOS and visionOS keep a 44-point target floor.", "Both macOS appearances are rendered by AppKit-backed SwiftUI and checked by tests. iOS and visionOS runtime review is still separate."],
      tryIt: ["Switch between the two actual native renders.", "Compare the fields and status shapes with the web rounds."],
      states: ["light-native"],
      demo: ({ state }) => <NativeRenders initialAppearance={state === "light-native" ? "light" : "dark"} />,
    },
    {
      id: "integration", name: "Overlays within a task",
      intro: "Controls must keep working when composed inside a modal task, rather than only on an isolated preview page.",
      decisions: ["Shared portal layers place a floating control above its current dialog and nested confirmations above their parent task.", "Tooltips use their intended layer, an explicit tooltip role and a linked trigger description; the pinned primitive omitted those accessible attributes.", "Forced colours retain real boundaries and selection cues. Reduced motion removes sheet translation. These combinations are exercised in browser tests."],
      tryIt: ["Open Route settings, change Transport, then run Duplicate route from the menu.", "Inspect the policy, close it with Escape, then focus Check route for its tooltip. Done returns to the original trigger."],
      states: ["open"],
      demo: ({ state }) => <DialogCompositionExample open={state === "open"} />,
    },
    {
      id: "packages", name: "Consume the packed library",
      intro: "The distributable files are tested from a temporary app outside this repository, using the actual npm archives.",
      decisions: ["The check installs both local tarballs and compiles a strict TypeScript consumer, including generic forms and exact token keys.", "Server rendering, Shiki highlighting, styles, fonts and export paths are checked independently of workspace resolution.", "The React entry declares its client boundary. Packages remain private and unpublished; focused PRs propose these changes for review."],
      tryIt: ["Review the morning checklist for exact validation commands and local archive locations.", "Review the focused PR stack before merging its stages in order."],
      demo: () => <div style={col}><Text weight="medium">Pre-PR review package</Text><Text tone="secondary">Three walkthroughs, live reference previews, native renders, installable npm archives and the original unsigned backup.</Text><Text size="sm" mono>.review/basalt-morning-review.zip</Text><Text size="sm">Source changes are proposed in three focused PRs. The bundle preserves the pre-PR snapshot.</Text></div>,
    },
  ],
};
