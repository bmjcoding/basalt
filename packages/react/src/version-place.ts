import * as React from "react";

import type { TooltipProps } from "./display";

// Where a `VersionLink` is drawn, set by the part that holds it (DECISIONS 320, 1.2): the sidebar's foot ("foot"), the rail from 720 to 1023
// ("rail"), the last row of More's sheet ("more") and a site's footer ("footer"). Anywhere else (an account page) it is the plain line.
// `AppShell` also hands the version itself to `TabBarMore` through `VersionContext`, as it hands the rail to `Nav`. Nothing runs when it loads.

export type VersionPlace = "foot" | "rail" | "more" | "footer";

/** Where the `VersionLink`s inside are drawn, for a part of an app's own that holds a version node (a `VersionLink`'s `place` wins over it). */
export const VersionPlaceContext = /* @__PURE__ */ React.createContext<VersionPlace | null>(null);

/** The app shell's `version`, for More's sheet to draw as its last row. */
export const VersionContext = /* @__PURE__ */ React.createContext<React.ReactNode>(null);

/** The app shell's `footnote` (an `AppFootnote`), for More's sheet to draw as a row above the version row. */
export const FootnoteContext = /* @__PURE__ */ React.createContext<React.ReactNode>(null);

/**
 * The rail's tooltip, handed down by `AppShell`, which already carries it for `Nav`. So a `VersionLink` in a site's footer or on an account page
 * loads no tooltip at all. An app's own rail (G160) provides it itself: `<RailTooltipContext.Provider value={Tooltip}>`, with `place="rail"` on the link.
 */
export const RailTooltipContext = /* @__PURE__ */ React.createContext<React.ComponentType<TooltipProps> | null>(null);
