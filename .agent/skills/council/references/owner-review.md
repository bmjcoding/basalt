# The owner's review page, and merging

Read this when a stream of work is built and its PRs are ready for the owner's thumbs up or down, or when he asks to review. He reviews
everything on one page, and he wants to use the components, not look at pictures of them.

## Build the page
1. **Read `MAIN/.agent/skills/basalt-html/SKILL.md`** and write the page with it: the body goes in a file, and
   `node MAIN/.agent/skills/basalt-html/compose.mjs <body.html> --out MAIN/.review/approvals/<nn>-review-<date>.html` builds it.
2. **For each design PR, copy its live walkthrough** next to the page:
   `<PR worktree>/.review/basalt-round-<n>-walkthrough.html` → `MAIN/.review/approvals/live/round-<n>.html`. If sample data changed after
   the round was built, run `npm run review -- <n>` in that worktree first.
3. **Embed each walkthrough** in its PR's section, opening on the right step:
   ```html
   <div class="panel live-wrap"><iframe class="live" data-live="live/round-<n>.html?step=<step-id>" title="<what it shows>, live"></iframe></div>
   ```
   ```css
   .live-wrap { padding: 0; overflow: hidden; }
   .live { display: block; width: 100%; height: 82vh; border: 0; }
   ```
   The step ids are the `id:` values in `tools/review/round<n>.tsx`.
4. **Make the frames follow the page's theme switch.** Put this after `</main>`:
   ```html
   <script>
     (function () {
       function sync() {
         var theme = document.documentElement.getAttribute("data-theme") || "dark";
         document.querySelectorAll("iframe[data-live]").forEach(function (f) {
           var src = f.getAttribute("data-live") + "&theme=" + theme;
           if (f.getAttribute("src") !== src) f.setAttribute("src", src);
         });
       }
       new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
       sync();
     })();
   </script>
   ```
5. **Open points:**
   - For each PR, list the points left open while building, with IDs (N1, T2…).
   - Mark each one `<span class="badge">Your call</span>` or `<span class="badge">FYI</span>`.
   - Give each a one-line recommendation.
   - Mark the one or two to look at first.
6. **At the top,** add:
   - a table of the PRs, with what each is, the owner's part (review or merge) and its checks;
   - the merge order;
   - one line on how to answer ("Reply with the IDs you want changed, or approve").
   - For a PR that isn't a React component (the HTML skill, process, tooling), use before-and-after screenshots or a short paragraph
     instead of a frame.
7. **Check it before showing it.** Open it in Playwright at 1440 and 390, in both themes, with no sideways scroll. Then check that:
   - every frame loads;
   - hovering inside a frame works;
   - the theme switch reaches the frames.

   Give the owner the file path. Keep `live/` next to the page: the frames load from it.

## Merge after the thumbs up
"Approve" covers what was built. A recommendation he didn't name stays open in `BACKLOG.md`.

1. **Order:** first the PRs that touch no shared file, then the design PRs, oldest decision first.
2. **For each PR in turn:**
   - `git merge origin/main` in its worktree;
   - resolve conflicts by keeping both sides, and reword any sentence one side made false;
   - `npm run build && npm run ci:local`, and post the result on the PR;
   - `gh pr ready <n> && gh pr merge <n> --merge`.
3. **After the last merge,** pull main and run `npm run ci:local` on it. Record the merges in `DECISIONS.md`.
