---
id: TASK-2
title: Replace the deck hero scrim gradient with a PNG alpha ramp
status: To Do
assignee: []
created_date: '2026-09-05 02:04'
updated_date: '2026-09-05 02:04'
labels:
  - deck
  - pdf
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `.hero` scrim in styles/deck.css is a varying-alpha CSS gradient. Chrome writes such a gradient as a ShadingType-1 colour layer behind a luminosity soft mask, and Ghostscript can neither render nor rewrite that construct: pdfwrite converts the colour layer into a form XObject with an empty content stream, leaving the mask nothing to reveal. Exported decks lose the scrim and print white titles on undimmed artwork.

Measured across three renderers on a synthetic hero slide: the raw Chrome PDF already renders scrim-less under Ghostscript (poppler and MuPDF draw it), and after gs compression the scrim is gone in all three. So the construct is viewer-dependent before compression even starts; astromotion v0.24.2's pdftocairo flattening masks the symptom rather than removing the cause.

A stretched alpha-ramp PNG is an ordinary image SMask -- the same construct as any transparent PNG -- and every renderer draws it. Measured: scrim intact under Ghostscript, poppler and MuPDF after gs alone with no flattening; smooth (max 1.86 grey levels per row at 3x, mean 0.22); output size within noise (152,084 vs 151,852 bytes).

Deck-only. The website hero in styles/components.css keeps its CSS gradient -- it renders correctly in browsers and is not PDF-exported.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A hero slide's scrim survives an astromotion-pdf export compressed with Ghostscript alone, with no pdftocairo flattening stage
- [ ] #2 The exported scrim renders with the same tonal profile under Ghostscript, poppler and MuPDF
- [ ] #3 The scrim shows no visible banding at 3x export resolution (per-row step under 2 grey levels)
- [ ] #4 On screen the hero slide is visually unchanged from the current gradient
- [ ] #5 Consumers can retint or restrength the scrim through a documented custom property, with the varying-alpha-gradient constraint stated
- [ ] #6 The ramp PNG is reproducible from a committed generator script rather than an unexplained base64 constant
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add scripts/gen-hero-scrim.mjs: emit a 2x256 RGBA PNG, black with alpha ramping 20% (top) to 80% (bottom), and print it as a base64 data URI. Commit the script -- it is the only way to regenerate the constant, and without it the blob in deck.css is unmaintainable.
2. In styles/deck.css, replace the .hero::after linear-gradient with url(<data URI>) 0 0 / 100% 100% no-repeat, wrapped in var(--at-deck-hero-scrim, ...). Comment says why it is not a gradient and warns that an override must not be a varying-alpha gradient -- the escape hatch silently reintroduces the bug.
3. Document --at-deck-hero-scrim and that constraint wherever deck theming tokens are listed.
4. Verify on a real deck, not the synthetic one: export with astromotion-pdf, rasterise a hero page under gs, pdftoppm and mutool draw, and compare tonal profiles against a browser screenshot of the same slide.
5. Release a tag, then propagate the pin to consumers via the anu-theme-sync workflow.

Known costs, accepted: the scrim stops being CSS-tweakable (retinting needs a new asset, since mask-image would reintroduce the soft mask); deck.css carries ~450 chars of base64 in place of a self-documenting one-liner.

Residual, owned by astromotion, not this task: theme/print.css:50 quotes the gradient value in a comment and should point at deck.css instead; and once decks carry no varying-alpha gradient, the pdftocairo stage and the poppler-utils dependency in scripts/deck-pdf.mjs are worth re-examining -- remaining deck transparency is constant-alpha (verified to survive gs) plus backdrop-filters on chrome that is hidden during export.
<!-- SECTION:PLAN:END -->
