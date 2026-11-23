---
name: release-words
description: Write, edit or review a changelog entry, a release's summary, release notes or a version's page for Basalt or one of the owner's products. Use when a pull request changes something a person using the release will notice (it needs an entry), when a release is cut, when a release is announced, and when reviewing any of those before it is published.
---

# Release words

The rules for the words of a release: one line per change (an entry), a release's summary, and release notes. They come from the
owner's standard of 23 Nov 2026 (`MAIN/.review/council/versioning/owner-handoff/versioning-and-changelog-standard.md`, section 5 for the
rules and 8 for the audit) and his answers in DECISIONS 308, 315 and 318, with the corrections the council's check found. Rule ids
(R1 to R20) are stable: cite them. For release notes, read `.agent/skills/site-words/SKILL.md` too: its rules hold in full.

## Who decides

- An agent drafts. **A person reads the rendered release before it is published** and says so on the release's pull request (R16). An
  agent never records that for him.
- The owner's words are rulings. A fact nobody can find in the repository (a removal date, who the author is, what is public) is asked
  for, never written.
- **Author is the person who wrote an entry's words, or who has said they take authorship of them.** An agent writes `author` only
  when that person has said so for that pull request. Asking for a change, approving it or merging it makes nobody its author, and
  an entry with no author is complete: its page shows no Author row.

## Three kinds of text

| | An entry | A summary | Release notes |
|---|---|---|---|
| What | One line for one change | One to three sentences over a release's list | A headline, then a short paragraph for each group of people it changes something for |
| Where | Every release, in the list | Every release of more than three changes. Optional where release notes lead, and then it goes with the list | A release with something new for the people using it; never a release of fixes alone |
| Voice | Past tense, no "we", no period | Plain sentences, present tense | Plain sentences, present tense; "we" is allowed and rarely needed |
| Rules | R1 to R15, R17, R19, R20 | R10, R11, R13, R15, R17, R18 | site-words, and R10, R11, R13, R15, R17, R18 |

A product's page leads with the release notes and keeps the summary and the entries behind one fold. A reference changelog
(Basalt's) shows the summary and the entries.

## An entry

**R1. Start with one verb from the set, in past tense:** Added, Changed, Improved, Deprecated, Removed, Fixed, Reverted. A product's
entries too ("Home: Improved the open incident list so …", never "Home: The list now keeps your place").
**R2. One change.** "And also", or two names that do two things, is two entries. Each thing a person can newly use is its own entry
(R20).
**R3. One sentence of at most 30 words, with no period at the end.** Under 12 words, check that the condition is there (R5); it is a
prompt to look, not a failure ("Fixed `/hooks` losing your place when going back" is right at 8).
**R4. Name the thing as its users write it.** A component, prop, token, class, export or command is in code formatting, spelled as it is
exported. A product's own words are not code: a button's label is in quotation marks, a rule ("touch targets") is plain. An entry with
no identifier to name needs none.
**R5. Fixed: the symptom a person saw, and when.** Never the cause, never "an issue". If nobody could have seen it, it has no entry (R8).
**R6. Changed: the old behavior and the new, in any wording** ("instead of", "from 1200ms to 1600ms", "where only the window's width
mattered before"). **Improved: a number or something a person can observe.** An old value comes from the code before the change, never
from memory.
**R7. An entry that needs action says what changed, what to do and by when,** and is marked `action`. One sentence if the fix fits in
it; otherwise it links its migration note. A deprecation names the replacement, the version that removes it and the earliest date, and
those two are the owner's decision: with no decision, the entry is "Added" for the new name and says nothing of removal.
`action` says where the entry stands on the page. It does not set the version: the entry's `bump` does. A type has a floor (Removed
is major, Added and Deprecated are minor, Fixed and Security are patch), a Changed entry always states `major`, `minor` or `patch`,
and `bump` may raise an entry and never lower it. What breaks on upgrading a package is `major` and `action`. A package's deprecation
breaks nothing on upgrading: it is a minor, under Deprecated. A product's notice with a date is `action` at whatever bump it needs.
**R8. For the person using the release.** No refactor, test, CI, dependency bump or internal rename unless they can see it. No fix for
something that was added and repaired between the same two releases: it never shipped broken.
**R9. Never "bug fixes and performance improvements".** If the fixes are too small to list, say how many and link the diff.
**R10. No marketing words** ("seamless", "powerful", "robust") and no exclamation marks.
**R11. "Now" once, for the new behavior. No future tense** except a dated removal.
**R12. It reads alone.** The sentence parses after the verb, and it does not lean on its neighbors ("both calls", "the same as above").
It does not name its own release's version: that is not known when the entry is written, and the page says it.
**R13. Numerals with units, exact.** A measured number keeps its conditions ("about 860px with 20 rows") or is left out.
**R14. Sources go in the entry's file, not its sentence:** the pull request, tickets, bump and author are fields (see the file format in
`tools/changelog/README.md`). Never a ticket id, a pull request number or a name in the words.
**R15. No em dashes, no semicolons, no emoji, US spelling** ("color", "multicolor", "canceled").
**R16. A person reads the final text** (see Who decides).
**R17. Every fact is in the repository or was given by the owner.** Never invent a date, a version, a commit, a deploy, a ticket, an
author, a removal promise or a rollout ("everyone is on this version"). Never name someone as author because they asked for the
change or approved it (see Who decides).
**R18. Nothing in a headline, a summary or a paragraph that the list does not hold.** Each paragraph names the entries it covers; a
claim with no entry gets an entry or goes.
**R19. Classify against the last published release.** Something that release did not have is Added, however many pull requests it took.
Fixed is only for behavior a published release had.
**R20. One entry for each thing a person can newly use:** a component, a prop, a hook, a token, a command, a page. A public addition
with no entry is a missing entry.

An area comes before the sentence when the package or product has more than one surface: the component (`Button:`), `Tokens:`, a
product's page (`Home:`). It is a field, not typed into the sentence.

## A summary

One to three sentences: what the release adds or changes, in the order a reader would care. No list of everything, no count that the
page already shows, no adjective.

## Release notes

- **The headline is a subject and what it does now** ("A monitor can open an incident room"). Not "X's first release", not
  "Introducing", no adjective.
- **Lead with what a person can do, then a paragraph for each group it differs for,** headed by the product's own word for them
  ("For admins", "For responders"). Only groups the release changes something for: one paragraph with no heading when it is the same
  for everyone, never a paragraph for each role to fill a row.
- **A paragraph is one to three sentences and says where to find it** ("On Home, open an incident marked …"). An instruction is an
  instruction: "In Settings, open Integrations and add a webhook."
- **Something a person must do, or lose something, is "Action needed",** above the paragraphs, with who and by when. A step that only
  turns a new thing on is not: it goes in that group's paragraph.
- **Say what the product does, in the reader's words,** not how it is built ("the agent's checks", not "the agent's first look already
  running"; no "a second model that only reads the record"). Don't reassure about what did not change unless the release put it in doubt.
- Literal commands a person types (`@agent`) are code. Don't promise "anything".
- **A summary, when release notes lead, goes with the list**, inside the fold, and is optional there: the paragraphs have already
  said what the release does.

## The page's own words

Fixed in Basalt's parts, in every product: "Release notes" (a product's page), "Changelog" (a package's), "Version", "Unreleased",
"Action needed", "Security", "Deprecated", "Removed", "Added", "Changed", "Fixed", "All changes", "Other changes" (the same fold when action entries stand above it), "Build
details", "Versions",
"Sources", "Pull request", "Ticket" and "Tickets", "Commit", "Author" and "Authors", "Your version", "Pre-release", "Linked",
"Copy link", "Copy link to this change", "Copy build details", "How to migrate", "3 more", "12 changes", "1 change", "4 need action",
"1 needs action". A package's action list opens "Before upgrading from 0.1.0, check these 4 changes." (the numbers computed).

## The audit, before a release is published

Log each failure as `rule id, quoted line, rewrite`. `node tools/changelog/audit.mjs` runs the lines marked (m); the rest are read.

**Version**
- [ ] (m) The version is at least the highest `bump` among the entries, from the last release in its line (one place right in 0.x)
- [ ] (m) Every Changed entry states its bump; no bump is below its type's floor; every major entry is `action`
- [ ] The bump of each Changed entry is right: major if it can break someone's code or take something away, patch only for an
      improvement with nothing to learn
- [ ] Every `action` and Deprecated entry says what to do, in its sentence or its migration note (R7)
- [ ] A deprecation's version and date are the owner's (R7, R17)
- [ ] (m) A pre-release is `-canary`, `-beta` or `-rc`
- [ ] (m) A stable release holds every entry its candidates held, under the same ids
- [ ] (m) No published release's record changed

**Structure**
- [ ] (m) Sections in the order Action needed, Security, Deprecated, Removed, Added, Changed, Fixed; none empty
- [ ] (m) An area on every entry of a package or product with more than one surface
- [ ] (m) `CHANGELOG.md`, the page and the GitHub Release are generated from the one record

**Each entry**
- [ ] (m) Starts with a verb of R1
- [ ] One change, one sentence, (m) at most 30 words, (m) no period at the end (R2, R3)
- [ ] Names what it changed as its users write it (R4)
- [ ] Fixed: symptom and condition (R5). Changed: old and new. Improved: a number or an observable result (R6)
- [ ] Reads alone, and does not name its own version (R12)
- [ ] Nothing internal, nothing that never shipped broken (R8)
- [ ] (m) No stock phrase, banned word, exclamation mark, em dash, semicolon, emoji or British spelling (R9, R10, R15)
- [ ] (m) No future tense outside a dated removal (R11)
- [ ] (m) No ticket id, pull request number or person's name in the words (R14)
- [ ] (m) Every ticket matches one tracker, and an author, where there is one, is in the config
- [ ] An author wrote the words or said they take authorship of them; nobody is named for asking or approving (R17)
- [ ] Classified against the last published release (R19); every public addition has an entry (R20)

**Summary and release notes**
- [ ] site-words, every rule
- [ ] The headline is a subject and what it does now
- [ ] (m) Every paragraph covers at least one entry; every claim is in the list (R18)
- [ ] Only the groups it changes something for
- [ ] Every fact is in the repository or was given by the owner (R17)
- [ ] A person read the rendered release and said so on the pull request (R16)
