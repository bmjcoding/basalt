---
name: site-words
description: Write, edit or review any words a person outside the team will read on the owner's sites and products (SRA Syndicate, the personal site, Blacksand, N1, Castle Nutrition, CoachStakk, Basalt's own UI strings), from a headline to an empty state, a button, an alt text or a status line. Use before drafting copy, when a mockup or prototype needs words, and when reviewing a page's wording.
---

# Site words

The rules the owner set for the words on his sites, learned in the wording audit of November 2026 (the wording-audit entries of DECISIONS 174–196 in
`MAIN/.review/council/DECISIONS.md`, cited as "195 (wording)" where a number is shared with CIMIP's, see 197; the full record, with every ruling quoted and dated, is `MAIN/.review/words/RECORD.md`). Each site
keeps its own voice; these rules hold on all of them. When a rule here and the owner's newer word disagree, his word wins: log it and fix
this file.

A changelog entry, a release's summary or release notes also follows `.agent/skills/release-words/SKILL.md` (DECISIONS 320): its rules add to these.

## Who decides

- **His words are rulings; your words are proposals.** Draft from the record, never invent facts, and give delegated designers the exact
  words instead of letting them write marketing copy.
- **A rewrite of approved copy goes through the council** (`.agent/skills/council/SKILL.md`), each member alone first, then a convergence
  round on the splits, then the owner approves each site from **before-and-after pictures** (both themes, 1440 and 390), never from a list
  of strings. A rewrite that changes layout (a line wraps to a new row, a headline gains a line) is checked in the page, at every width.
- **Ask him only for facts nobody can find** (a price, a date, what is public). Mine the record first.

## The rules (his)

1. **Plain facts, no slogans.** Say what the thing is, where, when, and what you can do. No taglines written to sound good ("Frisco is
   getting a castle", "A local shop, not a warehouse": "gross AI slop"). Headings name their section.
2. **No counts that can change** ("17 brands"): a number computed from data in a working place (a filter count, a cart) is fine.
3. **Don't sell "AI".** "AI native" is overused; people are skeptical of AI coaching. Say what the AI does, and what the human does.
4. **Written, not spoken.** No run-ons, no repeated sentence openers, no conversational asides.
   Characters (DECISIONS 419): curly quotes “ ” ‘ ’ and the apostrophe `’`, never in a reader's input, code, identifiers or URLs; the
   ellipsis is one `…`; a menu item or button that asks for more before it acts ends in `…` ("Rename…", "Move to…"), one that acts or opens
   a view at once does not; no `…` on a status word, a busy button or an announcement.
5. **Don't over-explain the basics** of the reader's own field; it reads as if AI did the work.
6. **No process scaffolding in public text.** Present tense, what is; never "organized by review round", "to be confirmed",
   "placeholder", "preview", "draft", a build note or a file's internal title (brand SVGs carry `<title>` build notes: hide them).
7. **Never a closed list where the product works with any** ("but what about gemini?"): name examples with "such as".
8. **US spelling and US dates** ("color", "canceled", "Nov 4", "Sun, Nov 8, 6:42 PM", "Q1 2027" kept together). Basalt defaults to
   `en-US`. Glue with a no-break space (`&nbsp;`, U+00A0; DECISIONS 419) a value and its unit ("10&nbsp;MB"), a clock and its period or
   zone ("6:42&nbsp;PM"), a short month and day ("Nov&nbsp;4"), a quarter and year ("Q1&nbsp;2027"), shortcut text outside a key chip
   ("⌘&nbsp;K") and a two-word product name; never a phrase or a sentence, and never drop the space. A product's name or code in page
   words is marked `translate="no"`, so a page translator leaves it.
9. **Describe where a product is heading** (capability lines), and **re-check every claim against the shipped code before the site goes
   live** (BACKLOG). A line about **how something works** must be true now.
10. **Keep off the sites:** his employer's name and internal work (a project is named only once it is public), his coach, the shop owner,
    any phone number or address, a partnership before it is announced.
11. **No long empty scroll** to reach a point.

## What the research adds (`MAIN/.review/council/references/`)

- **The slop checklist** (`ai-slop-wording/findings.md`), most damning first: "X, not Y" and "it's not just X, it's Y"; a line that could
  sit on any site; stakes inflation; a brochure word where a fact should be ("seamless", "unlock", "actionable insights"); the question
  you ask and answer; the reveal hinge ("Here's the thing", "What it is for will not:"); paired fragments ("Built for X. Designed for
  Y."); an empty rule of three; "serves as" and "-ing" tails; "we believe" with no decision. One em dash is not a verdict. A factual scope
  line of the "X, not Y" shape ("N1 is not a healthcare provider, so HIPAA does not apply to it.") is fine.
- **Claims bind** (`copy-craft/findings.md`): security claims are promises (FTC v. Zoom); no invented "grade" of protection and nothing
  implying HIPAA status you don't have; one person's shown result implies it is typical, and "Illustration" does not cure it; the FDA
  supplement disclaimer is exact (21 CFR 101.93); shipping and pickup statements are regulated (FTC Mail Order Rule); age rules apply to
  some products (kratom in Texas; weight-loss and muscle-building supplements to minors in New York).

## How each site sounds (approved, Nov 2026)

- **SRA Syndicate:** a holding company's plain register; the motto "Built to Adapt. Engineered to Endure." stays (his); the name explained
  once ("a model of how the body responds to resistance training"), applied "to systems, in technology and in life".
- **Personal site:** his role in his words ("Vice President and Lead Software Engineer at a top US bank, leading AI Operations"), third
  person, the sandbox's playful mechanics kept; his public writing (`MAIN/.review/words/voice.md`) is the model for rhythm, not for its
  contrast pairs and slogan closers.
- **Blacksand:** exact and technical, every mechanism line checked against the repo; his headline "The secure ground your AI agents run on."
- **N1:** two sides, a consumer who connects devices and assistants, and coaching (with a coach, every change is the coach's to approve);
  never weekly (check-ins vary); no steroids, growth hormone or insulin; every source shown as supported.
- **Castle Nutrition:** a store's plain facts (what, where, how ordering works, when the shop opens); client work on his other sites.

## Before you hand words over

- Read the page's every string in every state (routes, empty states, errors, screen-reader names, titles), not just the first screen.
- Run each line through the checklist and the rules above; check the fit at 1440, 390 and 360.
- Show pictures.
