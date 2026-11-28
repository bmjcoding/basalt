// What an app can still pass to Basalt's wrappers, though their declarations are Basalt's own and name no
// Base UI type. Compiled as an installed consumer would (scripts/verify-packages.mjs) and against dist
// (test/types.test.mjs). Each `@ts-expect-error` is something that must stay refused.
import * as React from "react";
import {
  Accordion, AlertDialog, Badge, BadgePair, Button, Checkbox, ChoiceCard, ChoiceCardGroup, IconButton, Link, Combobox, Dialog, DialogContent, Field, Form, HomeGlyph, Menu, MenuContent, MenuRadioGroup, MenuRadioItem,
  MenuSeparator, MenuSubmenu, Nav, NavGroup, NavItem, NumberField, Popover, Radio, RadioGroup, SegmentedControl, Segment, Select, Sheet, Slider, Switch, Tab, Tabs,
  TabsList, TabsPanel, GlidePlate, Reserve, SkipLink, MenuTrigger, PopoverContent, PopoverTrigger, StatusLine, VisuallyHidden, createPopoverHandle, themeBootstrap, useMediaQuery, useTheme,
} from "@srasyndicate/basalt";
import { AccordionItem, CardTitle, FramedArt, PairedArt, Stepper, ToastProvider, Toolbar, ToolbarButton, ToolbarGroup, ToolbarIconButton, ToolbarInput, ToolbarLink, ToolbarSeparator } from "@srasyndicate/basalt";
import type { CollisionAvoidance, ImageFetchPriority, PlacementAnchor, PlacementData, PopoverHandle, ThemeChoice, ToastAction } from "@srasyndicate/basalt";

const focus = React.createRef<HTMLButtonElement>();
const popupActions = React.createRef<{ unmount(): void; close(): void }>();
const validation = React.createRef<{ validate(fieldName?: string): void }>();

// Menu: where focus goes on close, imperative actions, highlight callback, holding the popup for an outside animation.
export const menu = (
  <Menu
    actionsRef={popupActions}
    triggerId="first"
    onItemHighlighted={(item, details) => `${item?.id}${details.label}${details.reason}`}
    onOpenChange={(open, details) => { if (!open) details.preventUnmountOnClose(); }}
  >
    <MenuContent finalFocus={focus} />
    <MenuSeparator orientation="vertical" />
    <MenuRadioGroup value={2} onValueChange={(value) => value.toFixed()} onChange={(event) => event.type}>
      <MenuRadioItem value={2}>Two</MenuRadioItem>
    </MenuRadioGroup>
    <MenuSubmenu actionsRef={popupActions} onItemHighlighted={(item) => item?.id} />
  </Menu>
);

// Dialog, alert dialog, sheet and popover: an animation the app runs itself.
const closing = (open: boolean, details: { preventUnmountOnClose(): void }) => { if (!open) details.preventUnmountOnClose(); };
export const popups = (
  <>
    <Dialog actionsRef={popupActions} onOpenChange={closing} triggerId="a" defaultTriggerId="a" />
    <AlertDialog actionsRef={popupActions} onOpenChange={closing} />
    <Sheet actionsRef={popupActions} onOpenChange={closing} />
    <Popover actionsRef={popupActions} onOpenChange={closing} triggerId={null} />
    <DialogContent finalFocus={focus} initialFocus={false} />
  </>
);

// Form and Field: validate on demand. A submit is not cancellable, and says only why and with what event.
export const form = (
  <Form
    actionsRef={validation}
    onFormSubmit={(_values, details) => {
      const why: string = details.reason;
      const event: Event = details.event;
      // @ts-expect-error a submit has nothing to cancel
      details.cancel();
      // @ts-expect-error nor a trigger
      details.trigger;
      return why + event.type;
    }}
  >
    <Field label="Email" actionsRef={validation}><input /></Field>
  </Form>
);

// Combobox, NumberField, Slider and Select.
export const controls = (
  <>
    <Combobox
      options={[]}
      autoComplete="email"
      actionsRef={popupActions}
      filter={(value, query) => value.includes(query)}
      onItemHighlighted={(value, details) => `${value}${details.reason}`}
      onOpenChange={closing}
    />
    <NumberField render={<section />} />
    <Slider label="Range" render={<section />} thumbAlignment="edge" thumbCollisionBehavior="swap" onChange={(event) => event.type} />
    <Select options={[]} actionsRef={popupActions} onOpenChange={closing} onValueChange={(value, details) => `${value}${details.reason}`} />
  </>
);

// Selections that are not strings: null and numbers, and the type to name them.
export const selections = (
  <>
    <Tabs value={null}>
      <TabsList><Tab value={0}>Zero</Tab></TabsList>
      <TabsPanel value={0}>Panel</TabsPanel>
    </Tabs>
    <Tabs<number> value={0} onValueChange={(value, details) => { if (value === null) details.cancel(); else value.toFixed(); }} />
    <Tabs defaultValue="a" onValueChange={(value: string | null) => value} />
    <RadioGroup value={7} onValueChange={(value) => value.toFixed()} onChange={(event) => event.type}>
      <Radio value={7} nativeButton>Seven</Radio>
    </RadioGroup>
    <RadioGroup<string> value={null}><Radio value="a">A</Radio></RadioGroup>
    <Checkbox nativeButton={false}>Agree</Checkbox>
    <Switch nativeButton={false}>On</Switch>
  </>
);

// Native change events still bubble from the elements that hold inputs.
export const bubbling = (
  <>
    <Accordion onChange={(event) => event.type} />
    <SegmentedControl aria-label="View" onChange={(event) => event.type}><Segment value="a">A</Segment></SegmentedControl>
  </>
);

// Navigation: a named landmark, groups, and links that keep an anchor's own props. A nav without a name stays refused.
export const navigation = (
  <>
    <Nav aria-label="Primary" collapsed={false} onPointerEnter={(event) => event.type}>
      <NavGroup label="Workspace">
        <NavItem href="/" icon={HomeGlyph} current count={3} dot="New activity" target="_self" onClick={(event) => event.preventDefault()}>Home</NavItem>
      </NavGroup>
    </Nav>
    {/* @ts-expect-error a navigation landmark needs a name */}
    <Nav />
  </>
);

// The display states: a toggle is secondary or ghost, and a text toggle carries its glyph (DECISIONS 326); a link or Button that opens a new tab needs no prop for its arrow.
export const displayStates = (
  <>
    <Button icon={HomeGlyph} pressed>Mute</Button>
    <Button variant="ghost" icon={HomeGlyph} pressed={false}>Pin</Button>
    {/* @ts-expect-error a text toggle carries its glyph, so its seat is never empty */}
    <Button pressed>Mute</Button>
    <IconButton icon={HomeGlyph} label="Home" variant="secondary" pressed />
    {/* @ts-expect-error a latched primary would read as the primary action */}
    <Button variant="primary" pressed>Deploy</Button>
    {/* @ts-expect-error a latched danger would read as an error */}
    <IconButton icon={HomeGlyph} label="Delete" variant="danger" pressed />
    <Link href="https://example.test" target="_blank" newTabLabel="(opens in a new tab)">Docs</Link>
    <Badge status="pending">In review</Badge>
    <BadgePair name="billing-worker" status={<Badge status="pending">In review</Badge>} fact={<Badge>Demo</Badge>} />
    <ChoiceCardGroup aria-label="Plan"><ChoiceCard name="plan" value="a" title="Starter" onCheckedChange={(checked) => checked} /></ChoiceCardGroup>
  </>
);

// Placement: an element, a ref, a virtual anchor or a function; offsets as numbers or functions; collision rules in Base UI's own shapes. Only Basalt's types name them.
const anchorRef = React.createRef<HTMLDivElement>();
const virtual: PlacementAnchor = { getBoundingClientRect: () => ({ x: 0, y: 0, width: 10, height: 10, top: 0, right: 10, bottom: 10, left: 0 }) };
const offset = (data: PlacementData) => (data.side === "top" || data.side === "bottom" ? data.anchor.height : data.anchor.width) + data.positioner.width;
const avoid: CollisionAvoidance = { side: "shift", align: "shift", fallbackAxisSide: "none" };
export const placement = (
  <>
    <PopoverContent anchor={anchorRef} alignOffset={offset} sideOffset={({ side }) => (side === "top" ? 4 : 8)} collisionAvoidance={avoid} collisionBoundary={{ x: 0, y: 0, width: 100, height: 100 }} collisionPadding={{ top: 8, left: 4 }} sticky />
    <PopoverContent anchor={virtual} alignOffset={3} collisionBoundary="clipping-ancestors" collisionPadding={12} />
    <PopoverContent anchor={() => document.body} collisionAvoidance={{ side: "flip", align: "flip" }} />
    <MenuContent anchor={anchorRef} alignOffset={-4} sideOffset={offset} collisionAvoidance={{ side: "none", align: "none" }} />
    {/* @ts-expect-error shifting the side axis cannot also flip the alignment axis */}
    <PopoverContent collisionAvoidance={{ side: "shift", align: "flip" }} />
  </>
);

// One popover for many triggers: a handle made by Basalt, a payload on each trigger, content as a function of it.
const handle: PopoverHandle<{ name: string }> = createPopoverHandle<{ name: string }>();
export const detached = (
  <>
    <PopoverTrigger handle={handle} payload={{ name: "a" }} id="a">A</PopoverTrigger>
    <Popover handle={handle}>{({ payload }) => <PopoverContent>{payload?.name.toUpperCase()}</PopoverContent>}</Popover>
    {/* @ts-expect-error the payload is the handle's */}
    <PopoverTrigger handle={handle} payload={{ title: "b" }}>B</PopoverTrigger>
    <MenuTrigger>Menu</MenuTrigger>
  </>
);

// Small parts: hidden text, the polite status line, the glide's plate, the media hook and the theme.
export const small = (
  <>
    <VisuallyHidden>to</VisuallyHidden>
    <VisuallyHidden as="div" id="x" />
    <StatusLine delay={100} sendId={2}>Saved</StatusLine>
    {/* @ts-expect-error a live region says words */}
    <StatusLine>{3}</StatusLine>
    <GlidePlate navigation />
  </>
);
export function Small() {
  const wide: boolean = useMediaQuery("(min-width: 40rem)");
  const { theme, choice, setChoice, ready } = useTheme();
  const next: ThemeChoice = choice === "system" ? "dark" : "system";
  setChoice(next);
  // @ts-expect-error a choice is light, dark or system
  setChoice("auto");
  return <span data-wide={wide} data-ready={ready} data-script={themeBootstrap.length}>{theme}</span>;
}

// A skip link and reserved room: the target is required; the words, anchor props and the reserved wordings are the app's.
export const skipAndReserve = (
  <>
    <SkipLink target="main" />
    <SkipLink target="#main" className="mine" data-x="1" onClick={(event) => event.currentTarget.href}>Passer au contenu</SkipLink>
    {/* @ts-expect-error the target is required */}
    <SkipLink />
    {/* href is the target's: it is built from it */}
    {/* @ts-expect-error */}
    <SkipLink target="main" href="#other" />
    <Reserve show="a" alternatives={{ a: "Save", b: <b>Saved</b> }} />
    <Reserve show="a" alternativeClassNames={{ a: "x" }} className="y" id="z" alternatives={{ a: 1, b: null }} />
    {/* @ts-expect-error the alternatives are listed by the caller */}
    <Reserve show="a" />
    {/* @ts-expect-error show names a wording: a string */}
    <Reserve show={1} alternatives={{ a: "x" }} />
  </>
);

// Heading levels: Card and Accordion keep h3 unless the page's outline says otherwise; a page title's h1 is not theirs.
export const levels = (
  <>
    <CardTitle>Runs</CardTitle>
    <CardTitle level={2} className="mine" id="t">Runs</CardTitle>
    {/* @ts-expect-error a card is never the page's h1 */}
    <CardTitle level={1}>Runs</CardTitle>
    <AccordionItem title="Details" headingLevel={4}>Text</AccordionItem>
    {/* @ts-expect-error the level is 2 to 6 */}
    <AccordionItem title="Details" headingLevel={7}>Text</AccordionItem>
  </>
);

// The Stepper's name and position words, and a toast's action sentence, are the app's to translate.
export const spokenWords = (
  <ToastProvider actionWords={(label) => `${label} est disponible. Appuyez sur F6.`}>
    <Stepper steps={[{ id: "a", label: "Details" }]} value="a" onValueChange={(id) => id.length} label="Étapes" positionLabel={(step, total) => `Étape ${step} sur ${total}`} />
    {/* @ts-expect-error the position words are a function of the two numbers */}
    <Stepper steps={[]} value="a" onValueChange={() => {}} positionLabel="Step" />
  </ToastProvider>
);

// A toolbar draws nothing; Basalt's own controls are its items, with the props they have outside it.
export const toolbar = (
  <Toolbar aria-label="Format" orientation="vertical" loopFocus={false} className="mine" onKeyDown={(event) => event.key}>
    <ToolbarButton variant="primary" size="sm" icon={HomeGlyph} onClick={(event) => event.currentTarget.value}>Bold</ToolbarButton>
    <ToolbarButton disabled focusableWhenDisabled={false}>Off</ToolbarButton>
    <ToolbarIconButton icon={HomeGlyph} label="Home" pressed />
    <ToolbarGroup aria-label="Links" disabled><ToolbarLink href="#a" target="_blank">Docs</ToolbarLink></ToolbarGroup>
    <ToolbarSeparator className="rule" />
    <ToolbarInput aria-label="Find" controlSize="sm" onValueChange={(value) => value.length} />
    <Menu><MenuTrigger render={<ToolbarButton>More</ToolbarButton>} /></Menu>
    <Popover><PopoverTrigger render={<ToolbarIconButton icon={HomeGlyph} label="Info" />} /></Popover>
    {/* @ts-expect-error the item is the toolbar's: it takes no render of its own */}
    <ToolbarButton render={<a href="#a" />}>Link</ToolbarButton>
    {/* @ts-expect-error a toolbar button has a label to show */}
    <ToolbarButton />
  </Toolbar>
);

// A picture's fetch priority (micro-details m8, X8): on the picture form of FramedArt and on PairedArt, Basalt's own ImageFetchPriority; never on a drawing.
const firstScreen: ImageFetchPriority = "high";
export const fetchPriority = (
  <>
    <FramedArt src="/a.jpg" alt="A field at dusk" loading="eager" fetchPriority={firstScreen} />
    <FramedArt src="/b.jpg" alt="" fetchPriority="low" />
    <PairedArt dark="/d.jpg" light="/l.jpg" loading="eager" fetchPriority="high" />
    {/* @ts-expect-error a drawing is inline, so there is nothing to fetch */}
    <FramedArt art={<svg />} alt="" fetchPriority="high" />
    {/* @ts-expect-error the three values are the attribute's own */}
    <FramedArt src="/c.jpg" alt="" fetchPriority="urgent" />
  </>
);

// A toast's action (micro-details m5, fix 1): a handler may return anything. A promise back makes the action wait; any other value (a sync handler written as an
// arrow that returns what it calls) is ignored, as before m5 widened the type.
const undoEvents: string[] = [];
const syncAction: ToastAction = { label: "Undo", onClick: () => undoEvents.push("undo") };
const asyncAction: ToastAction = { label: "Undo", keys: "Mod+Z", onClick: () => Promise.resolve(undoEvents.length) };
export const toastActions = [syncAction, asyncAction];
