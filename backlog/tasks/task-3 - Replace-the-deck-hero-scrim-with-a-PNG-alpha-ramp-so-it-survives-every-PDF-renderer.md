---
id: TASK-3
title: >-
  Replace the deck hero scrim with a PNG alpha ramp so it survives every PDF
  renderer
status: Done
assignee: []
created_date: '2026-09-05 04:52'
updated_date: '2026-09-05 05:39'
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
- [x] #1 The .hero scrim is a data-URI PNG alpha ramp in styles/deck.css with no mix-blend-mode and no isolation; the PNG's generation (a few lines of Python or Node) is recorded in the comment, not shipped as a script
- [x] #2 A hero slide exported with astromotion-pdf renders with the same tonal profile under poppler, MuPDF, Ghostscript and macOS Quartz (sips on daysy), before and after Ghostscript compression
- [x] #3 On screen the hero slide is visually unchanged (max per-pixel difference under 3 grey levels against the multiply version)
- [x] #4 --at-deck-hero-scrim still works as an override and its documented constraint is updated (an image or an opaque gradient; translucent gradients and blend modes are called out as export hazards)
- [x] #5 astromotion's export drops both pdftocairo passes once no scrim needs them, with the Quartz check repeated on the simplified pipeline before release
- [x] #6 Released as a patch and propagated to every consumer via anu-theme-sync; llms-unplugged's NeurIPS deck re-exported and eyeballed in Preview
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Generate the ramp: 1x256 RGBA PNG, rgb(0 0 0) with alpha from 0.2 (row 0, top) to 0.8 (row 255, bottom); base64 it into styles/deck.css as background: url(data:image/png;base64,...) 0 0 / 100% 100% no-repeat on .hero::after, wrapped in var(--at-deck-hero-scrim, ...). Remove mix-blend-mode and isolation. Put the generator one-liner in the comment.
2. Update the lecture-decks guide's --at-deck-hero-scrim entry.
3. Verify on the docs deck and on llms-unplugged's language-model-by-show-of-hands: export raw (--no-compress) and compressed, split pages with qpdf, render with pdftoppm, mutool draw, gs and sips on daysy, compare brightness bands against an agent-browser screenshot of the same slide. sips and qlmanage draw only a PDF's first page, hence the split.
4. In astromotion, remove the pdftocairo passes from scripts/deck-pdf.mjs (keep gs and the ICC repair), re-run step 3 on the simplified pipeline, release. Note TASK-2's poppler quirk: pdftocairo bakes poppler's brighter reading of translucent SVG shading fills into the file, so dropping it also fixes SVG-backed slides.
5. Release the theme patch, then propagate both packages via anu-theme-sync.

6. Fix astromotion TASK-5 in the same astromotion release: pair deck-pdf's process-group kill with astro preview stop, as deck-check already does. Every export attempt in the Linux verification tripped over the leaked daemon.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Findings from the Linux session of 2026-09-05, for whoever picks this up on daysy.

**PNG ramp on the real docs deck (SVG hero art), Linux renderers.** Identical tonal profile under gs, poppler and MuPDF, raw and after gs alone (bottom row 32-33 against 32 on screen). After gs the scrim is still a plain 1x256 image with an SMask: no group, no blend mode. The multiply scrim after gs is a nested form XObject carrying /BM /Multiply inside an isolated group, which is the arrangement Quartz misdraws.

**SVG gradient scrim: evaluated and rejected.** An SVG data URI with a stop-opacity linearGradient survives gs in all three Linux renderers, but only by accident: Chrome emits it as a tiling pattern whose content is an axial shading under a luminosity soft mask whose group is another axial shading. It escapes the pdfwrite bug because the colour layer comes out as ShadingType 2 rather than the ShadingType 1 a CSS gradient produces. Same soft-mask family that failed, one more wrapper, and unmeasured on Quartz, PDFium and Acrobat. Don't pursue it.

**Poppler quirk, not ours to fix.** Poppler ignores the constant alpha (ExtGState ca) on shading-pattern fills, so an SVG background whose gradient shapes carry opacity renders brighter under poppler (Evince, Okular, pdftocairo) than under gs, MuPDF, Chrome or the browser. Confirmed by patching the PDF: forcing those fills to ca 1 makes gs match poppler; replacing them with flat colours makes poppler match gs. Each pdftocairo pass bakes that reading in for every viewer, so dropping both passes fixes SVG-backed slides everywhere except poppler-based viewers. Installed poppler is 24.02; current is 26.08; worth a check whether it is fixed upstream before caring further.

**Measurement method that worked here.** astromotion-pdf <slug> out.pdf --no-compress --port=4399, then gs by hand with the exact flags from scripts/deck-pdf.mjs. Find the hero page with pdftotext per page. Rasterise at 216 dpi with gs png16m, pdftoppm and mutool draw. Profile: mean luminance per row over the right 40% of the width (no title there), read at 5%, 50%, 95% height. Screen reference: headless Chrome screenshot of the deck's ?print-pdf view at 1280 x (720 x pages), cropped to the page.

**Pitfall.** astromotion-pdf's readiness check fails with 'Preview server never became ready' whenever Astro 7's preview daemon is already up from a previous export (astromotion TASK-5). Run astro preview stop in the site dir before each export. A server on the port can also belong to another site entirely.

**Pins.** Every astromotion consumer is on v0.24.4 (the Ass2 template was bumped 2026-09-05, with Ben's OK despite provisioning) and every theme consumer on v0.14.2.

Done on daysy 2026-09-05. Theme v0.14.3 (scrim = 1x256 RGBA PNG, 89 bytes, filter type 2; no mix-blend-mode, no isolation). astromotion v0.25.1 drops both pdftocairo passes and stops its preview daemon on exit (astromotion TASK-5).

Docs deck hero page, mid-slide luminance against 18.2 on screen (1280x720 screenshot), rendered at 216 dpi: raw poppler 23.0 (the known poppler quirk on the SVG artwork's translucent fills, not the scrim), raw gs 18.1, raw MuPDF 17.0, raw Quartz 18.7; after the released pipeline (gs + ICC repair) poppler 17.1, gs 18.1, MuPDF 17.0, Quartz 18.7. On screen, old multiply vs new ramp: max 1 grey level over the slide area (the only diff is Reveal's progress bar strip below the slide). llms-unplugged's language-model-by-show-of-hands re-exported with the new pipeline: both hero pages agree across gs, poppler and Quartz within 1 grey level and look right in Preview.

Propagated: benswift-me e7de7b3, llms-unplugged 7ae66b1, comp4020/website 94f2e6f, Ass2 template 757136b, astro-theme-anu pins 393aa5d (no release). slop-university skipped per the impact map (deck.css only).
<!-- SECTION:NOTES:END -->
