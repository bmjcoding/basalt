// Beryl: Basalt's shipped palette (cimip-gaps-3 T9, DECISIONS 403, section 11). It proves the hooks in Basalt's own voice: a blue-green link,
// chosen ink and line, checked controls and primary Button on Basalt's neutral surfaces, with corners 4 and 6 for Buttons and fields and the
// .98 press. It sets no chosen fill, no outline ink and no secondary or ghost hook (a brand outline ink at 0.72 measured 3.73:1 in light), and no
// icon set. Every value is opaque #rrggbb with a light and a dark value; the build verifies it, with the status distance as a failure (it is Basalt's).
export default {
  id: "beryl",
  link: {
    ink: { light: "#094f5c", dark: "#5ccfdd" },
    underline: { light: "#386b7b", dark: "#3f8e98" },
  },
  chosen: {
    line: { light: "#0e5b69", dark: "#47c5d3" },
    ink: { light: "#094f5c", dark: "#5ccfdd" },
  },
  checked: {
    fill: { light: "#074b57", dark: "#47c5d3" },
    ink: { light: "#ffffff", dark: "#010508" },
  },
  mark: { light: "#0e6170", dark: "#4acad9" },
  button: {
    primary: {
      fill: { light: "#074b57", dark: "#47c5d3" },
      fillHover: { light: "#043c47", dark: "#6cd7e4" },
      fillPress: { light: "#033039", dark: "#2fb0be" },
      ink: { light: "#ffffff", dark: "#010508" },
    },
    radius: [4, 6],
    press: "scale",
  },
  field: {
    edgeHover: { light: "#386b7b", dark: "#3f8e98" },
    edgeActive: { light: "#074b57", dark: "#47c5d3" },
    radius: [4, 6],
  },
};
