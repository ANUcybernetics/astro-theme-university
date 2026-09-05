---
id: TASK-3
title: >-
  Replace the deck hero scrim with a PNG alpha ramp so it survives every PDF
  renderer
status: To Do
assignee: []
created_date: '2026-09-05 04:52'
labels:
  - deck
  - pdf
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-2 moved the .hero scrim to an opaque grey gradient under mix-blend-mode: multiply and measured it under Ghostscript, poppler and MuPDF. It never measured macOS Quartz, and Quartz gets it wrong twice: Preview, Safari and Quick Look draw the raw Chrome PDF's multiply shading too bright (mid-slide 47.9 against 33.7 on screen), and after Ghostscript's rewrite (a shading form sharing the page transparency group) they draw the whole slide as a near-uniform ~75% darkening (mid-slide 13.5, 16.9 on the llms-unplugged NeurIPS deck against 37 on screen). Ben checks decks in Preview, so this is what he saw on 2026-09-05.

astromotion v0.24.4 papers over it with a second pdftocairo pass after Ghostscript, which re-emits a structure Quartz draws correctly. That makes four compensations for one gradient: the multiply trick here, cairo before gs, the ICC patch, cairo after gs.

Measured 2026-09-05 on a synthetic hero slide (Chrome via agent-browser pdf; gs with astromotion's exact /ebook invocation plus the ICC repair; poppler via pdftoppm; Quartz via sips on daysy), mid-slide brightness against 33.7 on screen:

| scrim | raw poppler | raw Quartz | gs poppler | gs Quartz |
| --- | --- | --- | --- | --- |
| PNG alpha ramp | 33.6 | 34.3 | 33.7 | 34.3 |
| translucent CSS gradient | 33.7 | 34.3 | 68.1 | 68.3 |
| multiply CSS gradient | 33.7 | 47.9 | 33.8 | 13.5 |

An image with an alpha soft mask is the one transparency primitive every writer and renderer handles, Ghostscript alone included. TASK-2 rejected the ramp on tweakability grounds (base64 constant, generator script); against Quartz that trade no longer holds. The ramp is a 1x256 RGBA PNG, black with alpha 20% to 80% top to bottom, 92 bytes, stretched with background-size: 100% 100%; on screen it is indistinguishable from the gradient (256 alpha steps over 720px).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The .hero scrim is a data-URI PNG alpha ramp in styles/deck.css with no mix-blend-mode and no isolation; the PNG's generation (a few lines of Python or Node) is recorded in the comment, not shipped as a script
- [ ] #2 A hero slide exported with astromotion-pdf renders with the same tonal profile under poppler, MuPDF, Ghostscript and macOS Quartz (sips on daysy), before and after Ghostscript compression
- [ ] #3 On screen the hero slide is visually unchanged (max per-pixel difference under 3 grey levels against the multiply version)
- [ ] #4 --at-deck-hero-scrim still works as an override and its documented constraint is updated (an image or an opaque gradient; translucent gradients and blend modes are called out as export hazards)
- [ ] #5 astromotion's export drops both pdftocairo passes once no scrim needs them, with the Quartz check repeated on the simplified pipeline before release
- [ ] #6 Released as a patch and propagated to every consumer via anu-theme-sync; llms-unplugged's NeurIPS deck re-exported and eyeballed in Preview
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Generate the ramp: 1x256 RGBA PNG, rgb(0 0 0) with alpha from 0.2 (row 0, top) to 0.8 (row 255, bottom); base64 it into styles/deck.css as background: url(data:image/png;base64,...) 0 0 / 100% 100% no-repeat on .hero::after, wrapped in var(--at-deck-hero-scrim, ...). Remove mix-blend-mode and isolation. Put the generator one-liner in the comment.
2. Update the lecture-decks guide's --at-deck-hero-scrim entry.
3. Verify on the docs deck and on llms-unplugged's language-model-by-show-of-hands: export raw (--no-compress) and compressed, split pages with qpdf, render with pdftoppm, mutool draw, gs and sips on daysy, compare brightness bands against an agent-browser screenshot of the same slide. sips and qlmanage draw only a PDF's first page, hence the split.
4. In astromotion, remove the pdftocairo passes from scripts/deck-pdf.mjs (keep gs and the ICC repair), re-run step 3 on the simplified pipeline, release. Note TASK-2's poppler quirk: pdftocairo bakes poppler's brighter reading of translucent SVG shading fills into the file, so dropping it also fixes SVG-backed slides.
5. Release the theme patch, then propagate both packages via anu-theme-sync.
<!-- SECTION:PLAN:END -->
