---
id: TASK-2
title: Blend the deck hero scrim with multiply so it survives Ghostscript
status: In Progress
assignee: []
created_date: '2026-09-05 02:04'
updated_date: '2026-09-05 02:32'
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

Fix: an opaque grey gradient blended onto the image with `mix-blend-mode: multiply`. Multiplying by grey g is the same arithmetic as compositing black at alpha 1 - g, so 204 -> 51 reproduces the 20% -> 80% scrim (on-screen diff against the gradient: max 2 grey levels, no pixel over 2). Chrome writes it as an axial shading under /BM /Multiply with no soft mask, and every renderer draws it. Measured after gs alone with no flattening: bottom-row luminance 43 under Ghostscript, poppler and MuPDF against a screen reference of 44 (the old gradient reads 191, scrim gone); max per-row step under 2 grey levels; PDF size within noise. A tinted override and `isolation: isolate` on the section were measured too and hold.

A stretched alpha-ramp PNG also fixes it (measured equally clean) but costs a base64 constant, a generator script, and CSS tweakability; the multiply scrim keeps retinting as a two-colour edit.

Deck-only. The website hero in styles/components.css keeps its translucent gradient: it renders correctly in browsers and is not PDF-exported.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A hero slide's scrim survives an astromotion-pdf export compressed with Ghostscript alone, with no pdftocairo flattening stage
- [ ] #2 The exported scrim renders with the same tonal profile under Ghostscript, poppler and MuPDF
- [ ] #3 The scrim shows no visible banding at 3x export resolution (per-row step under 2 grey levels)
- [ ] #4 On screen the hero slide is visually unchanged from the current gradient
- [ ] #5 Consumers can retint or restrength the scrim through a documented custom property, with the opaque-colours-only constraint stated
- [ ] #6 The scrim stays a plain CSS gradient: no embedded image asset or generator script
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In styles/deck.css, replace the .hero::after translucent gradient with an opaque grey gradient (rgb(51 51 51) bottom to rgb(204 204 204) top) under mix-blend-mode: multiply, wrapped in var(--at-deck-hero-scrim, ...). Add isolation: isolate to .hero so the blend cannot reach past the slide onto whatever Reveal paints beneath. The comment explains the arithmetic, why alpha is fatal for export, and that an override must keep to opaque colours (any alpha or a mask-image reintroduces the soft mask).
2. Document --at-deck-hero-scrim and the opaque-only constraint in the lecture-decks guide, beside the impact background token.
3. Verify on a real deck: export with astromotion-pdf --no-compress, compress the raw PDF with the same gs invocation deck-pdf.mjs uses and no pdftocairo stage, rasterise a hero page under gs, pdftoppm and mutool draw, and compare tonal profiles against a browser screenshot of the same slide.
4. Release a patch tag (adds a custom property, removes nothing), then propagate the pin to benswift-me, llms-unplugged, comp4020 and the Ass2 template via the anu-theme-sync workflow; eyeball a deck in llms-unplugged since it layers its own deck CSS.

Residual, owned by astromotion, not this task: theme/print.css quotes the old gradient value in a comment and should point at deck.css instead; and once no deck carries a varying-alpha gradient, the pdftocairo stage and the poppler-utils dependency in scripts/deck-pdf.mjs are worth re-examining. Remaining deck transparency is constant-alpha (verified to survive gs) plus backdrop-filters on chrome that is hidden during export.

Measured on the docs deck (SVG hero art) through every stage: raw decktape PDF, gs alone, pdftocairo alone, pdftocairo then gs, each rasterised under gs, poppler and MuPDF against a browser screenshot. The old gradient loses the scrim under gs (bottom row 144 against 33 on screen); the multiply scrim holds at 33 everywhere gs or MuPDF draws. A stretched alpha-ramp PNG measured the same, so the two constructs are interchangeable on export and multiply wins on tweakability.

One pre-existing poppler quirk surfaced on the way and is NOT the scrim: poppler ignores the constant alpha on shading-pattern fills, so an SVG background's translucent gradient shapes render brighter under poppler than under gs, MuPDF or the browser, before and after either scrim, old or new. pdftocairo bakes that reading into the flattened file, so astromotion's current pipeline ships the brighter waves for SVG-backed slides regardless. One more reason the flattening stage should go now that no scrim needs it.
<!-- SECTION:PLAN:END -->
