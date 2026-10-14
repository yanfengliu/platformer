# Review 2: integration

## Target

Final product b1e320e7af9ad9a14638af9eed64d02d477762a7 against round-one 5597c73b4f4d4e06b5b743971328f585c64f86b9. Repair handoff 654b11d extends optional-copy hiding through 560px; renderer/font/controls are unchanged from the accepted integrated product.

## Reviewers and coverage

Independent `/root/pixel_review` used the fleet pin for focused static CSS/cascade review. Coordinator owns actual browser, raster, control, build and performance evidence. One lane; no multi-CLI quorum. Worktree links are normalized to repository paths; the substantive authored report is preserved.

## Reports

### Independent reviewer

Reviewed `b1e320e7af9ad9a14638af9eed64d02d477762a7` against round-one revision `5597c73b4f4d4e06b5b743971328f585c64f86b9`.

**F0 is resolved. No new material findings.**

The 560px breakpoint (`src/style.css:198`) keeps the optional description hidden through the previously cropped range. Static inspection confirms that the existing compact rules remain intact and the description returns at 561px without other cascade changes.

The integration owner reports successful inner-clipping bounds, center hit tests, and actual Help/Start clicks at **320, 420, 421, 480, 481, 500, 560, 561, 700, 701, 720, and 1280px**. Key “How to play” measurements confirm clearance on both sides of the repaired boundary:

| Width | Button bottom | Frame’s inner bottom |
|---|---:|---:|
| 421px | 312 | 320.125 |
| 481px | 326.8125 | 357.625 |
| 560px | 351.5 | 407 |
| 561px | 375.8125 | 407.625 |

I also inspected unchanged adjacent construction at `src/main.js:161`, including the optional description and both actions. The updated AGENTS gate explicitly requires inner bounds excluding borders and checks adjacent breakpoint widths.

This was a focused static re-review. I did not independently rerun check/tests/build, browser controls, visual inspection, or performance gates; the browser measurements above are attributed to the integration owner. Earlier raster/font review remains applicable because those files did not change.

Final status and staged/unstaged diffs were clean. Repository access succeeded with only the previously noted nonblocking user-level Git ignore warning. I made no edits, created no artifacts, and launched no browser, server, or persistent process.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Compact title clipping at421px, then a residual481px crop. | Resolved. Optional copy remains hidden until the frame has enough height; both sides of the new boundary fit the inner clipping box and receive actual clicks. | 654b11d integrated in b1e320e; strict12width headless gate and focused re-review pass. |

## Verification

Coordinator final check covers18 JavaScript files; all59 tests, static build and staged/unstaged diff checks pass. Original55 simulation/input/weapon/combo checks stay green. Three new raster checks reject sloped/fractional primitives, continuous gradients and unbounded spans in24 production scenes, compare a literal stepped triangle mask, and clip/merge giant mirrored geometry to one visible rectangle. A fourth new test verifies the original font's integrity, checksum, source consistency and all English UI glyphs. The asset's retained SHA-256 is `5aa907fb583647c12f646a44e36410912285920f2ce53fe3ee771a077efbc163`; source/built copies and actual HTTP200 font/ttf body of23,684bytes agree. Dependencies are unchanged, so the local dependency audit is not repeated.

Native world/actor rendering was inspected on10a6618 and those source bytes remain unchanged in the final title-only revisions:16 actor/facing strips, each containing ready/contact/return, plus all3 floor themes. Real-key controls, early/held sword combos, normal/reduced feedback, real enemy combat, mute/pause and gameplay/title/help/relic/death layouts at the3 required viewports passed. The sampled90-frame median/p95 of16.70ms and maximum16.80ms match the baseline, bounded to desktop Chromium/this scene. No other browser/hardware or exhaustive stress claim is made.

Additional actual Tab navigation showed all3 compact relic cards fully inside and hit-testable; each was individually inspected, then actual mouse selection chose Honed ember. Actual wheel scrolling exposed the compact help Back and death Rekindle controls, both clicked successfully. A real relic route selected a blessing after5kills and13.77–13.88simulationseconds; actual retry restored100health/floor1/zero kills. Production gameplay state was never set by these probes. Renderer fixture mutation stayed on fresh isolated canvases and is explicitly supplemental.

Final built title checks used the inner padding box, excluding4px borders, at320/420/421/480/481/500/560/561/700/701px with640px height,720×560 and1280×800. Both actions were fully inside, center hit-tested, and actually clicked at every width. Each final title capture was inspected. The first outer-box proof was superseded by the stricter measurement, and the partial repair's481px failure remains recorded in round1.

The sorted retained PNG manifest (filename and SHA-256, PowerShell UTF-8 lines) has SHA-256 `78880C39E1C118AE393830F1422605AEA6AAFFB541FCCCD88C45B1B0CFB35CBB`, binding baseline, integrated native/control/menu evidence, final boundary captures and earlier diagnostic captures. Source revisions and bounds above identify what each measurement establishes. Raw files are disposable after accepted closure. All named headless browser/daemon/server trees closed in finally; exact PID/name/command-line comparisons confirmed zero leftovers after every lifecycle.

## Round outcome

F0 is closed; no material findings or local acceptance gaps remain. Review rounds0/1 are preserved. Main push, remote CI and clean worktree/output closure remain integration-owner delivery steps in the plan.
