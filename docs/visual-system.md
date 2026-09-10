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
- `src/scripts/finance-scene.ts` supplies the live records-to-model sequence.
  One WebGL context paints visible page slots. Geometry follows scroll position
  and validated synthetic assumptions; reversing the scroll must restore the
  same state. Reduced motion uses stable geometry.
- `src/scripts/home.ts` owns the independent arithmetic and native fallback.
  Visual loading or context loss must not prevent calculation or navigation.
  Every displayed result and chart must clear when assumptions are invalid.
- The main model, later cash chart and decision brief share the same assumptions.
  Charts stop at zero; the month-12 numeric result may be negative. Text explains
  that the example is simple arithmetic, not an AI recommendation.

The renderer caps pixel density and update frequency and skips offscreen slots.
Keep the plotting surface and text readable; use curved shoulders, thickness and
reflections for depth. Three's RoundedBoxGeometry clamps a requested radius to
half the shortest dimension, so a thin front plate can hide a body's intended
rounded silhouette. The dependency's MIT notice is in `public/licenses/`.

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
use, reduced motion, WebGL unavailable and real graphics-context loss. Inspect
all supporting routes and published prices. Private Gauntlet evidence, critic
reports and source revision records live outside this repository.
