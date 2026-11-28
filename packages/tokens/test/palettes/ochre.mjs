// Ochre: a test and review fixture only, never exported (cimip-gaps-3 T9, DECISIONS 403, section 11). An app's palette from an unlike domain that
// sets every hook, warm, with capsule Buttons, fields at 8 and 12 and no press scale. As an app's palette its warm lines sit near warning (the
// underline at about ΔEok 0.057 in light): the status-distance advisory fires on it and it still passes.
// The decision lists no outline hover edge; the fixture uses the secondary hover edge's pair (#865b1c / #deb45b), so every hook is set.
export default {
  id: "ochre",
  link: {
    ink: { light: "#6e4613", dark: "#e6be6b" },
    underline: { light: "#9a7436", dark: "#a8843e" },
  },
  chosen: {
    line: { light: "#865b1c", dark: "#deb45b" },
    fill: { light: "#f3e3c5", dark: "#3b2e18" },
    ink: { light: "#3d2a0c", dark: "#f6e9cf" },
    edge: { light: "#b9914a", dark: "#8a6c33" },
  },
  checked: {
    fill: { light: "#5d3b10", dark: "#deb45b" },
    ink: { light: "#ffffff", dark: "#0f0904" },
    edge: { light: "#5d3b10", dark: "#deb45b" },
  },
  mark: { light: "#8a5d1b", dark: "#e2b75e" },
  button: {
    primary: {
      fill: { light: "#e3b960", dark: "#deb45b" },
      fillHover: { light: "#d5a84e", dark: "#eac675" },
      fillPress: { light: "#cfa24a", dark: "#ca9f48" },
      ink: { light: "#181008", dark: "#0f0904" },
      edge: { light: "#5d3b10", dark: "#deb45b" },
      fillDisabled: { light: "#efe6d3", dark: "#2a2114" },
      inkDisabled: { light: "#a39a86", dark: "#7a6f5a" },
    },
    secondary: {
      fill: { light: "#f7efe0", dark: "#2a2114" },
      fillPress: { light: "#eddfc4", dark: "#3b2e18" },
      ink: { light: "#3d2a0c", dark: "#f6e9cf" },
      edge: { light: "#b9914a", dark: "#8a6c33" },
      edgeHover: { light: "#865b1c", dark: "#deb45b" },
    },
    outline: {
      ink: { light: "#452e0b", dark: "#e6be6b" },
      edge: { light: "#9a7436", dark: "#a8843e" },
      edgeHover: { light: "#865b1c", dark: "#deb45b" },
    },
    ghost: {
      ink: { light: "#6e4613", dark: "#e6be6b" },
      inkHover: { light: "#54330c", dark: "#f3d289" },
    },
    radius: "full",
    press: "none",
  },
  field: {
    edge: { light: "#8f7a58", dark: "#8f7d5c" },
    edgeHover: { light: "#9a7436", dark: "#a8843e" },
    edgeActive: { light: "#6e4613", dark: "#deb45b" },
    radius: [8, 12],
  },
};
