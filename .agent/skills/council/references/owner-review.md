# The owner's review page

Paths follow SKILL.md's Names and paths. Read this when built work is ready for the owner: at the end of a stream, after a one-question handoff is built, or when he asks to
review. He judges everything on one page, and he wants to use the components, not look at pictures of them.

## Build it
1. **The file.** Read `MAIN/.agent/skills/basalt-html/SKILL.md`; it says how to write a page body and build it with its `compose.mjs`.
   Name the page `MAIN/.review/approvals/<nn>-review-<mmmdd>.html`, where `<nn>` is the next number in that folder and `<mmmdd>` is
   the date, like `nov10`.
2. **At the top:**
   - a table of the PRs: what each one is, his part, and its CI result. His part is "try it" for a design PR, and "approve the merge"
     for any other;
   - the merge order (`references/merge.md`);
   - one line on how to answer: "Reply thumbs up or thumbs down for each PR, or the T-numbers you want changed. For a deadlock, reply
     with its item and letter ('date picker trigger: B')."
3. **Deadlocks** come first, above the PRs: one section each, written with `assets/deadlock.md`.
4. **A design PR gets its live walkthrough.** Copy `<PR worktree>/.review/basalt-round-<n>-walkthrough.html` to
   `MAIN/.review/approvals/live/round-<n>.html`. If its sample data changed after the round was built, run `npm run review -- <n>` in
   that worktree first. Then embed it, opening on the round's first step:
   ```html
   <div class="panel live-wrap"><iframe class="live" data-live="live/round-<n>.html?step=<step id>" title="<what it shows>, live"></iframe></div>
   ```
   ```css
   .live-wrap { padding: 0; overflow: hidden; }
   .live { display: block; width: 100%; height: 82vh; border: 0; }
   ```
   The step id is the `id` of each entry in the round's `steps` array in `tools/review/round<n>.tsx`.
5. **Any other PR** (the HTML skill, tooling, process) gets before-and-after screenshots, or a short paragraph instead of a frame.
6. **The frames follow the page's theme switch.** Put this after `</main>`:
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
7. **Notes under each PR,** numbered across the page T1, T2 and so on. Only FYI items: engineering facts and the choices the council made that he may want to know about. Open
   visual questions don't belong here: a council round settles them first, and the ones it can't settle are deadlocks.

## Check it before showing it
Open it with Playwright at 1440 and 390, in both themes. It passes when:
- there's no sideways scroll;
- every frame loads;
- hovering inside a frame works;
- the theme switch reaches the frames.

Give the owner the file's path, and keep `live/` beside the page: the frames load from it.
