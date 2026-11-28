import * as React from "react";

import { IconProvider } from "./icon-set";
import type { IconSet } from "./icon-set";
import { paletteMetas } from "./palette-bootstrap";
import type { PaletteConfig, PaletteOption } from "./palette-bootstrap";
import { paletteScopeContext } from "./palette-scope";

// The palette's state for a React app (cimip-gaps-3 T9, DECISIONS 403), on theme.ts's pattern: one attribute on the root (`data-palette`, and
// `data-palette-source`) that the palette CSS reads, a saved id in `localStorage["basalt-palette"]` (the default is nothing saved, as System is for the
// theme), a link's palette for this tab in `sessionStorage["basalt-palette-url"]`, and a hook. The store belongs to the provider (it holds the config);
// its listeners are installed by the first subscriber and removed with the last, and nothing runs at import. Nothing is announced on a change: the
// control says its own state.


const KEY = "basalt-palette";
const URL_KEY = "basalt-palette-url";
const PARAM = "palette";

declare const process: { env: { NODE_ENV?: string } };

/** Where the palette shown came from: a link (`?palette=`, for this tab), a saved choice, or the config's default. */
export type PaletteSource = "url" | "stored" | "default";

interface Store {
  subscribe(notify: () => void): () => void;
  snapshot(): string;
  set(id: string): void;
}

const read = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};

let warnedConfig = false;

/** In development, once: the root's palette or the head's metas disagree with the config (the head was written from another config, or by hand). */
function checkHead(config: PaletteConfig) {
  if (process.env.NODE_ENV === "production" || warnedConfig) return;
  const root = document.documentElement.getAttribute("data-palette");
  const problems: string[] = [];
  if (root && !config.ids.includes(root)) problems.push(`the root's data-palette="${root}" is not in the config`);
  const wanted = paletteMetas(config);
  const names = ["basalt-palettes", "basalt-palette-default", "basalt-palette-url"];
  if (names.some((name) => document.querySelector(`meta[name="${name}"]`))) {
    for (const name of names) {
      const meta = document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? undefined;
      const want = wanted.find((m) => m.name === name)?.content;
      if (meta !== want) problems.push(`<meta name="${name}"> is ${meta === undefined ? "missing" : `"${meta}"`}, the config says ${want === undefined ? "none" : `"${want}"`}`);
    }
  }
  if (problems.length) {
    warnedConfig = true;
    console.warn(`PaletteProvider: the head disagrees with the config: ${problems.join("; ")}. Write the head from the same config (paletteBootstrap, paletteMetas).`);
  }
}

function createStore(config: PaletteConfig, onChange?: (id: string) => void): Store {
  const listeners = new Set<() => void>();
  // The choice made on this page, for when localStorage is blocked and cannot hold it.
  let session: string | undefined;
  const valid = (id: string | null | undefined): id is string => Boolean(id && config.ids.includes(id));

  const resolve = (): [string, PaletteSource] => {
    if (config.url) {
      let fromParam: string | null = null;
      try {
        fromParam = new URLSearchParams(location.search).get(PARAM);
      } catch { /* no location */ }
      if (valid(fromParam)) {
        try { sessionStorage.setItem(URL_KEY, fromParam); } catch { /* blocked: it lasts while the parameter is in the address */ }
        return [fromParam, "url"];
      }
      const left = read(() => sessionStorage, URL_KEY);
      if (valid(left)) return [left, "url"];
    } else if (read(() => sessionStorage, URL_KEY) !== null) {
      // With the URL policy off, a value an earlier load left is neither read nor kept.
      try { sessionStorage.removeItem(URL_KEY); } catch { /* blocked */ }
    }
    let saved: string | null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      saved = session ?? null;
    }
    if (valid(saved)) return [saved, "stored"];
    return [config.default, "default"];
  };

  const write = () => {
    const [palette, source] = resolve();
    const root = document.documentElement;
    if (root.getAttribute("data-palette") !== palette) root.setAttribute("data-palette", palette);
    if (root.getAttribute("data-palette-source") !== source) root.setAttribute("data-palette-source", source);
  };
  const notify = () => {
    write();
    for (const listener of listeners) listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) notify();
  };

  return {
    subscribe(listener) {
      if (typeof document === "undefined") return () => {};
      if (listeners.size === 0) {
        checkHead(config);
        write();
        window.addEventListener("storage", onStorage);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    snapshot() {
      return resolve().join(":");
    },
    set(id) {
      if (typeof document === "undefined" || !valid(id)) return;
      session = id === config.default ? undefined : id;
      try {
        if (id === config.default) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, id);
      } catch { /* storage can be blocked; the choice then lasts for this page */ }
      // A choice saves: the link's palette is cleared for the tab, and the parameter leaves the address (every other parameter and the hash stay).
      try { sessionStorage.removeItem(URL_KEY); } catch { /* blocked */ }
      try {
        const url = new URL(location.href);
        if (url.searchParams.has(PARAM)) {
          url.searchParams.delete(PARAM);
          history.replaceState(history.state, "", url.pathname + url.search + url.hash);
        }
      } catch { /* no history */ }
      notify();
      onChange?.(id);
    },
  };
}

interface PaletteContextValue {
  readonly config: PaletteConfig;
  readonly store: Store;
  readonly server: string;
}

const PaletteContext = /* @__PURE__ */ React.createContext<PaletteContextValue | null>(null);

export interface PaletteProviderProps {
  config: PaletteConfig;
  /** The palette the server drew (read from the app's own cookie), so the first client render and the icons match it. The config's default when omitted. */
  serverPalette?: string;
  /** Called with the id after a person chooses a palette: an app that renders on the server can write its cookie here. */
  onChange?: (id: string) => void;
  children?: React.ReactNode;
}

const hasIcons = (config: PaletteConfig) => config.palettes.some((option) => option.icons);
const iconsOf = (config: PaletteConfig, id: string): IconSet => config.palettes.find((option) => option.id === id)?.icons ?? {};

/**
 * The app's palettes, for `usePalette`, the controls and the icons. It gives the active palette's `icons` to an `IconProvider` when any palette in the
 * config has a set (Basalt's own drawings for one with none). Colours and corners are CSS and are right in the first frame; a server-rendered page
 * draws the saved palette's icon set at hydration unless the server knew it (`serverPalette`).
 */
export function PaletteProvider({ config, serverPalette, onChange, children }: PaletteProviderProps): React.JSX.Element {
  const change = React.useRef(onChange);
  change.current = onChange;
  const store = React.useMemo(() => createStore(config, (id) => change.current?.(id)), [config]);
  const server = serverPalette && config.ids.includes(serverPalette) ? serverPalette : config.default;
  const value = React.useMemo(() => ({ config, store, server }), [config, store, server]);
  return (
    <PaletteContext.Provider value={value}>
      {hasIcons(config) ? <ActiveIcons>{children}</ActiveIcons> : children}
    </PaletteContext.Provider>
  );
}

function ActiveIcons({ children }: { children?: React.ReactNode }) {
  const { palette, palettes } = usePalette();
  const icons = palettes.find((option) => option.id === palette)?.icons ?? {};
  return <IconProvider icons={icons}>{children}</IconProvider>;
}

export interface PaletteState {
  /** The palette in use. */
  palette: string;
  /** Where it came from: a link, a saved choice or the default. */
  source: PaletteSource;
  /** The palettes the app offers. */
  palettes: readonly PaletteOption[];
  /** Chooses a palette: saved for the origin (the default is nothing saved); a link's palette is cleared and its parameter leaves the address. */
  setPalette: (id: string) => void;
  /** False until the client has read the page: on the server and while it hydrates. */
  ready: boolean;
}

const NONE: PaletteState = { palette: "basalt", source: "default", palettes: [], setPalette: () => {}, ready: false };
const noSubscribe = () => () => {};

/**
 * The page's palette. On the server, and on the first client render of a hydrating page, it is the config's default (or `serverPalette`) with
 * `ready: false`, so the first frame matches; the real answer follows at once. Outside a `PaletteProvider` it is `basalt`, and `setPalette` does nothing.
 */
export function usePalette(): PaletteState {
  const context = React.useContext(PaletteContext);
  const server = context ? `${context.server}:default:server` : "basalt:default:server";
  const value = React.useSyncExternalStore(context?.store.subscribe ?? noSubscribe, context?.store.snapshot ?? (() => server), () => server);
  return React.useMemo(() => {
    if (!context) return NONE;
    const [palette, source, isServer] = value.split(":") as [string, PaletteSource, string | undefined];
    return { palette, source, palettes: context.config.palettes, setPalette: context.store.set, ready: isServer === undefined };
  }, [context, value]);
}

export interface PaletteScopeProps extends React.ComponentProps<"div"> {
  /** The palette this subtree is drawn in: another product's content in view. `basalt` is Basalt's own look inside any palette. */
  palette: string;
  /** The theme this subtree is drawn in, when it differs from the page's (a light card on a dark page). */
  theme?: "light" | "dark";
}

/**
 * A subtree in another palette (and, with `theme`, another theme): it writes `data-palette` (and `data-theme`) on its element. A scope is whole: every
 * palette block declares every hook, so nothing leaks in from the palette outside it. A popup opened from inside keeps the scope's palette and theme, and
 * the subtree takes the scope's palette's icons from the provider's config (Basalt's own for `basalt`, an id the config does not list, or no provider).
 */
export function PaletteScope({ palette, theme, children, ...props }: PaletteScopeProps): React.JSX.Element {
  const context = React.useContext(PaletteContext);
  const scope = React.useMemo(() => ({ palette, theme }), [palette, theme]);
  const icons = context ? iconsOf(context.config, palette) : {};
  const Scope = paletteScopeContext();
  return (
    <div {...props} data-palette={palette} data-theme={theme}>
      <Scope.Provider value={scope}>
        <IconProvider icons={icons}>{children}</IconProvider>
      </Scope.Provider>
    </div>
  );
}
