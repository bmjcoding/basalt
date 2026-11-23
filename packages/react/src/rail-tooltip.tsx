// The rail's tooltip for the version at the foot (DECISIONS 320, 1.2), loaded by AppShell only when the rail shows a version: the shell's own import
// stays as it was, and a page with no version, or out of the rail, loads no tooltip for it. Nothing runs when the module loads.
export { Tooltip as RailTooltip } from "./display";
