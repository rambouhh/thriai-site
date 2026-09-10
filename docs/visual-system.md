# Homepage visual system

The homepage follows the senior-builder argument: delivery model, AI-enabled reach,
operating experience, business benefits, connected finance scope and an ongoing
operating relationship. The illustrative cash model supports that argument; it
does not define the service or establish a client result.

## Artwork and interaction

- `public/finance-material.png` is original generated decorative artwork. It
  contains no company numbers and is not a screenshot of an operating system.
  It was made with the built-in image generation tool as a material concept,
  then selected for the hero. The generation prompt and design evidence remain
  in the private Gauntlet run directory outside this application.
- `src/scripts/finance-scene.ts` moves the same glass artwork through the opening,
  reveals native record labels and projects a live SVG trace onto its central
  surface. The glass artwork introduces the connected-finance visual language.
  Scroll position and validated synthetic assumptions determine each state;
  reversing the scroll must restore the same placement. Reduced motion keeps
  the opening artwork stable. This renderer does not require WebGL.
  On mobile, the artwork occupies a bounded slot in the hero's document flow.
  It must not remain behind scrolling copy. Responsive changes return it to
  the desktop stage when appropriate.
- `src/scripts/home.ts` owns the independent arithmetic and native fallback.
  Visual loading failure must not prevent calculation or navigation.
  Every displayed result and chart must clear when assumptions are invalid.
- The working demo keeps one H–01 hiring record and one cash graph mounted.
  The record docks into the sheet while the hiring line reveals, then that
  same sheet resolves into a decision brief. The initial sheet shows the
  explicitly labeled baseline; docking applies the hiring record and draws
  its changed forecast, then reveals the tradeoff. Financial values are never
  interpolated. Editing inputs or choosing Show hiring result resolves the
  answer immediately; forward navigation preserves it and deliberate reverse
  scrolling replays the sequence. Mobile gives the fully connected forecast
  a stable middle beat before the brief, within a700px sticky interval so the
  operation is visible while the sheet is in view; reduced motion shows the
  stable resolved sheet. Reverse scrolling must restore placement and reveal.
- The same working sheet remains mounted and visible as the benefit copy enters.
  Desktop keeps it beside the copy; mobile compacts the same record, graph and
  essential values into a178px dock above the benefits. It slides out after
  the first benefit so later copy can use the full viewport; reverse scrolling
  restores the same dock and sheet. The duplicate cash landscape is removed.
  Reduced motion shows the complete sheet in normal flow before the benefits.
- The main model and later decision brief share the same assumptions.
  Charts stop at zero; the month-12 numeric result may be negative. Text explains
  that the example is simple arithmetic, not an AI recommendation.

The scene renders on scroll, resize and value changes. Keep the bitmap's material
identity intact through the handoff; avoid dissolving it into unrelated object
outlines. HTML labels remain separate from the decorative image. If the artwork
fails, hide every material slot and retain native content, the calculator and
the independent canvas fallback. Three.js was removed with the former renderer.

The working record and sheet share upper-left illumination, a blue-black face
and restrained copper/blue bevels. A projected shadow follows the existing
docking state, softening at altitude and tightening at contact beneath the text.
The final pale reading surface retains the same dark structural perimeter.

## Proof boundaries

Founder operating experience is separate from Thriai client engagements. A future
founder-led example can follow cash versus plan through expense improvement,
payment timing and supporting records. That requires a rehearsed, reconciled
synthetic recording of the actual system. The current hiring calculator is a
standalone illustration and must not be described as a verified Datarails cash
preview or as completed client work.

## Verification

Build the static output and inspect actual desktop/mobile pages, including slow,
fast and reverse scrolling. Check changed assumptions, invalid inputs, keyboard
use, reduced motion, canvas unavailable and artwork loading failure. Inspect
all supporting routes and published prices. Private Gauntlet evidence, critic
reports and source revision records live outside this repository.
