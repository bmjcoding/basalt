# The Basalt reference

`build.mjs` builds the browsable Basalt reference (a Design System artifact on
claude.ai) from this repository, so the reference always matches the code:

- tokens come from `packages/tokens/dist`, converted to the reference's list format, with a
  usage note on every token;
- the components are bundled from `packages/react/src`, as one browser script with React 19
  (built here, since React no longer publishes browser builds);
- the Geist fonts come from the `geist` package;
- the brand book, component guides, previews and cover are in `content.mjs`.

```sh
npm run build                 # tokens and components
node tools/artifact/build.mjs # writes .artifact/project/
```

Then publish `.artifact/project/` to the reference's artifact with Claude Code: the files
under `project/`, with `project/design-system.json` (the index) written last and merged
with the one the artifact already holds, so names, sections and asset records set on the
page are kept.

Keep `content.mjs` in step with `docs/foundations.md`: the values come from the tokens,
the words don't.
