# Review 0: integration

## Target

Integrated product 10a6618fbc415a06cad9e32f53de8c7df0bf1cd9 against f9039a61268acda2cbcba47c2d6a22f630376c5b, including world 9fc83db, UI 7137585 and coordinator font MIME integration.

## Reviewers and coverage

Independent read-only `/root/pixel_review` used the fleet review pin and inspected the integrated renderer/raster, UI/font generator and asset, MIME config and test adaptations. Coordinator owns separate native raster, controls, viewport and frame-timing evidence. One independent lane; no multi-CLI quorum. Temporary worktree links in the authored report are normalized to repository paths; substantive text is retained.

## Reports

### Independent reviewer

Reviewed `10a6618fbc415a06cad9e32f53de8c7df0bf1cd9` against `f9039a61268acda2cbcba47c2d6a22f630376c5b`. **One finding remains.**

- **F0 — [P2] Extend the compact title layout above 420px.** `src/style.css:198` limits the compact title rules to 420px, while the wider layout retains its description, larger controls, and visible overflow. At **421×640**, the integration owner confirmed that “How to play” occupies **y=324–360**, beyond the clipped game frame’s bottom at **324.125**; its hit test fails. “Enter the keep” remains usable at y=248–288. The 480px layout passes narrowly, so the required 320px check misses this breakpoint gap. Adjust the responsive title sizing/spacing and verify both actions are completely inside the frame and clickable across the breakpoint. This finding requires repair before acceptance.

No additional concrete findings in the raster implementation, renderer accents, font generator/asset, MIME mapping, or adapted weapon/combo tests.

I independently checked raster clipping, coalescing, and mirroring against all production transform uses. A read-only probe compared **800 deterministic convex/concave cases** against independent pixel-center containment logic, under both horizontal facings and varied translations: coverage, clipping, and nonoverlapping spans passed. This bounds algorithmic geometry at a 32×24 test viewport; it does not establish browser raster quality or frame performance.

The retained font is 23,684 bytes, SHA-256 `5aa907fb583647c12f646a44e36410912285920f2ce53fe3ee771a077efbc163`. I reviewed its glyph repertoire, metrics, table construction, and binary-consistency checks. The revised recorders retain actual filled geometry, and the weapon tests continue checking motion, mirroring, attachment, return, timing, cancellation, and release behavior.

Outside the diff, I read `scripts/build.mjs:16`, confirming recursive inclusion of the new source module and font, and `src/game.js:11`, checking the complete relic text repertoire.

I did **not** rerun the full check/test/build suite, browser controls, visual inspection, or performance gates; those remain the integration owner’s evidence. Repository access succeeded after using a per-command Git ownership exception. Final tracked/untracked status and unstaged/staged diffs were clean. I made no edits, retained no artifacts, and launched no browser, server, or persistent process.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Help action clipped and not hit-testable at 421px. | Accepted. Main viewport gates missed the gap just above 420px. | UI repair a463802 extends optional title-description hiding through 480px; coordinator expands boundary checks and obtains focused re-review. |

## Verification

Coordinator check, all 59 tests, build and staged/unstaged diff checks passed on 10a6618. Real controls and font loading passed at 1280×800,720×560,320×640: a second J tap after 70ms produced two swings, held attacks showed the finisher, roll/mute/pause worked, actual combat killed an enemy with player health 100, and reduced motion retained essential feedback. The sampled 90-frame median/p95 was 16.70ms (maximum 16.80ms), matching the baseline sample. This measures one desktop headless scene, not every device or stress case.

Six title/gameplay viewport renders, help/pause/relic/death at three sizes, and 19 native fixtures were captured. Each of the 16 actor/facing strips was inspected across ready, contact and return: three swords, walker blade, archer bow/string/nocked release, brute hammer, Warden axe melee and ranged volley. Three floor palettes and richer tile/lighting detail were separately inspected at native resolution. Renderer fixtures are supplemental; they do not mutate production state or substitute for actual controls.

An actual seed-0 input route reached relic choice at 13.8833 simulation seconds with five kills, selected Blood bloom with Digit1, and returned to play. A separate actual enemy death showed the new stats/retry menu and actual mouse retry restored floor1/100health/zero kills. Compact menus scroll; additional focused scroll/navigation verification remains with the repair acceptance. Built font HTTP status200, Content-Type font/ttf and 23,684-byte body passed. The 421px probe failed bounds/hit testing as reported; 480/560/640 passed.

Worker red proofs were inspected: f9039a renderer fails the production-scene pixel gate on continuous gradient/sloped edges (one of three cases fails; the two new helper-unit cases remain green), and c956015 still fails 15 of the 19 adapted weapon gates, including all seven frozen attack paths and four windups. Existing thresholds and all actors remain covered. The old recorders used vector vertex order; the new recorder captures every raster span and measures actual shape distance, grip boundaries, leading-tip alignment and filled finisher thickness.

All sessions used headless Chromium and hidden child/server launches, with explicit owned-process inventory and finally cleanup confirming zero browser/daemon/server/child leftovers. No shared application was stopped. Raw evidence remains ignored until closure.

## Round outcome

Raster/font/art and original main viewport checks pass; F0 requires responsive repair, expanded boundary acceptance and focused independent review. This historical round remains intact after the fix. Final revision, digest provenance, main/CI delivery and cleanup are recorded in the next round and plan.
