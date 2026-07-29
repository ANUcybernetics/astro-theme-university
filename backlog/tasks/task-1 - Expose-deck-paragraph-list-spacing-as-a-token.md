---
id: TASK-1
title: Expose deck paragraph/list spacing as a token
status: To Do
assignee: []
created_date: '2026-07-29 08:03'
labels: []
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
styles/deck.css hardcodes the inter-paragraph/list-item spacing as `margin: 0 0 1rem` on `:is(p, li)` inside `:where(.reveal .slides) section` — there's no custom property a consumer can override, unlike the rest of the palette/sizing surface which goes through `--at-*` tokens. A comp4020 course deck wanted to nudge this up slightly (denser prose reads a touch cramped at the current value) and had no token to hook, only a same-specificity override in the consuming repo's theme.css. Add something like `--r-paragraph-spacing` (mirroring the `--r-heading*-size` naming already used for deck heading sizes) so consumers can bump it without fighting specificity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A CSS custom property controls the bottom margin of `:is(p, li)` in the deck theme
- [ ] #2 The property has a default matching the current 1rem behaviour, so no consuming deck changes visually without opting in
- [ ] #3 The token is documented alongside the existing --r-heading*-size tokens
<!-- AC:END -->
