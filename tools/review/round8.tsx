import { CaretDownIcon, CopyIcon, PencilSimpleIcon, PlayIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import * as React from "react";

import { FormExample } from "../../packages/react/examples/completion";
import {
  BrandSurface,
  Button,
  ChartGrammar,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Eyebrow,
  Field,
  Input,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  NumberTicker,
  Spinner,
  Text,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" };
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

function TickerDemo() {
  const [value, setValue] = React.useState(1284);
  return (
    <div style={row}>
      <Text size="2xl" tabular>
        <NumberTicker value={value} />
      </Text>
      <Button size="sm" onClick={() => setValue((n) => n + 1)}>
        Add a run
      </Button>
    </div>
  );
}

export const ROUND_8: Round = {
  id: "8",
  title: "Mineral core and product accents",
  summary:
    "The neutral foundation is warm stone, in light and dark. Each product adds one accent through data-brand. Primary stays the neutral action. This round is the redesign for owner review; the two-reviewer panel was not convened.",
  steps: [
    {
      id: "buttons",
      name: "Buttons",
      intro: "Primary is still the high-contrast neutral action. Accent is the brand hue. A press goes darker, in 80ms, and does not scale.",
      decisions: [
        "No press-shrink and no glow. The press is a darker step than rest.",
        "Focus follows the brand accent and stays at least 3:1.",
        "Blacksand's backlight is a flat panel, not a treatment on the button.",
      ],
      tryIt: ["Switch brand and theme.", "Hold a button down.", "Tab to the focus ring."],
      demo: () => (
        <div style={col}>
          <Eyebrow>Actions</Eyebrow>
          <div style={row}>
            <Button variant="primary" icon={PlayIcon}>Deploy</Button>
            <Button variant="accent">Mark</Button>
            <Button>Cancel</Button>
            <Button variant="ghost">Preview</Button>
            <Button variant="danger" icon={TrashIcon}>Delete</Button>
          </div>
          <BrandSurface style={{ padding: 16 }}>
            <Eyebrow>Brand ground</Eyebrow>
            <Text size="sm" tone="secondary">Controls stay on the normal surfaces. This panel is the only backlight.</Text>
          </BrandSurface>
        </div>
      ),
    },
    {
      id: "forms",
      name: "Forms",
      intro: "The same fields, on the mineral surfaces. Labels stay sentence case; the eyebrow is the instrument label.",
      decisions: ["Field labels are not restyled into uppercase. The eyebrow is a separate style at 12px.", "Input boundaries still clear 3:1 on every surface."],
      tryIt: ["Submit empty, then fill the name.", "Compare the eyebrow with the field label."],
      demo: () => (
        <div style={col}>
          <Eyebrow>New sandbox</Eyebrow>
          <FormExample />
          <Field label="Region">
            <Input defaultValue="us-central" />
          </Field>
        </div>
      ),
    },
    {
      id: "dialog",
      name: "Dialog",
      intro: "A modal on the mineral overlay. Danger stays text and a hairline, never a fill, and it is not the ember accent.",
      decisions: ["Danger moved to rose so it does not sit on SRA's ember.", "Focus still starts on Cancel."],
      tryIt: ["Open it and press Tab.", "Switch to SRA and compare Delete with the ember accent."],
      states: ["open"],
      demo: ({ state }) => (
        <Dialog defaultOpen={state === "open"}>
          <DialogTrigger render={<Button variant="danger">Delete sandbox</Button>} />
          <DialogContent>
            <DialogTitle>Delete blacksand-api?</DialogTitle>
            <DialogDescription>Its runs and records stay. The sandbox and its routes are removed, and this can't be undone.</DialogDescription>
            <DialogActions>
              <DialogClose render={<Button>Cancel</Button>} />
              <DialogClose render={<Button variant="danger">Delete sandbox</Button>} />
            </DialogActions>
          </DialogContent>
        </Dialog>
      ),
    },
    {
      id: "menu",
      name: "Menu",
      intro: "The menu surface is its own step above the page, in both themes.",
      decisions: ["Overlay, raised and top no longer share one colour.", "Destructive items stay last, in the danger colour."],
      tryIt: ["Open the menu.", "Compare light and dark elevation."],
      states: ["open"],
      demo: ({ state }) => (
        <div style={{ minHeight: state === "open" ? 260 : undefined }}>
          <Menu defaultOpen={state === "open"} modal={false}>
            <MenuTrigger render={<Button iconEnd={CaretDownIcon}>Actions</Button>} />
            <MenuContent>
              <MenuGroup>
                <MenuGroupLabel>Sandbox</MenuGroupLabel>
                <MenuItem icon={PlusIcon} shortcut="N">New sandbox</MenuItem>
                <MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem>
                <MenuItem icon={PencilSimpleIcon} shortcut="R">Rename</MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem icon={TrashIcon} danger>Delete</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      ),
    },
    {
      id: "type",
      name: "Type",
      intro: "Geist stays the UI face. A view should use the eyebrow, the UI size, one title, and at most one display size. Three OFL serifs are candidates for editorial moments only; none is the default.",
      decisions: [
        "No new size under 12px. The eyebrow reuses that size with mono, uppercase and wider tracking.",
        "12 and 13 stay: captions and compact controls are different jobs, one pixel apart.",
        "Instrument Serif, Newsreader and Fraunces are specimens. Bailey chooses.",
      ],
      tryIt: ["Read the three specimens.", "Check the eyebrow against the body."],
      demo: () => (
        <div className="wt-specimen">
          <Eyebrow>Label · Geist Mono · 12</Eyebrow>
          <Text>Body and controls stay in Geist at 14.</Text>
          <Text size="2xl" weight="semibold">A section title at 24.</Text>
          <h3 className="wt-specimen-instrument">Instrument Serif</h3>
          <p className="wt-specimen-instrument" style={{ fontStyle: "italic" }}>For a case study, set in the sharp editorial serif.</p>
          <h3 className="wt-specimen-newsreader">Newsreader</h3>
          <p className="wt-specimen-newsreader">For a long note, the literary text face.</p>
          <h3 className="wt-specimen-fraunces">Fraunces</h3>
          <p className="wt-specimen-fraunces">For the one expressive moment on the portfolio.</p>
        </div>
      ),
    },
    {
      id: "spinners",
      name: "Spinners and ticker",
      intro: "Three loading marks: a fast ring, three dots, and a braille frame for mono contexts. Digits roll. Reduced motion fades or holds still, and the value is always announced.",
      decisions: [
        "The ring turns in 640ms. The braille frame steps every 70ms.",
        "Nothing bounces, and nothing glows.",
        "Each one exposes a status name when it is the thing that says work is happening.",
      ],
      tryIt: ["Watch the braille frame.", "Add a run and see the digit roll.", "Turn on reduced motion: the ring fades and the digits snap."],
      demo: () => (
        <div style={col}>
          <div style={row}>
            <Spinner label="Loading" />
            <Spinner variant="dots" label="Loading marks" />
            <Spinner variant="braille" label="Loading runs" />
            <Text size="sm" tone="secondary">Loading runs</Text>
          </div>
          <TickerDemo />
          <ChartGrammar />
        </div>
      ),
    },
  ],
};
