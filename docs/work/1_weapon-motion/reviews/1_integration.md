# Review 1: integration

## Target

Final product 05cdacafc1fff0fe9da30e8aee50637e782ff4af, compared with round 0 revision 89ea0956e17390a13b250e827467635eb8305a26. Repair handoff 66286ce793b9d9fbe6170e28384704678e3e0966.

## Reviewers and coverage

Independent read-only Codex reviewer `/root/weapon_review`, using the fleet review pin, reviewed the metadata repair and new regressions. Coordinator owns final gates, native raster, actual controls, build artifact and process cleanup. One independent lane; no multi-CLI quorum.

## Reports

### Independent reviewer

WR-1 is resolved. No new material findings.

Focused read-only re-review of exact revision 05cdacafc1fff0fe9da30e8aee50637e782ff4af, against round-zero revision 89ea0956e17390a13b250e827467635eb8305a26, covered src/game.js, src/render.js, and tests/render-weapons.test.js.

game.js:343 records the selected duration using the unchanged combat formula and assigns that same value to the countdown. render.js:341 prefers this recorded duration, preventing HP changes from rewinding an active windup. The fallback supports fixtures lacking metadata; every production windup start records it. render-weapons.test.js:158 covers actual first-combo damage crossing 180→161 HP during both melee and volley windups, compares rendered geometry against an unhit control at the same countdown, and verifies that the next attack selects the existing faster duration.

Outside the repair diff, I checked src/game.js:85–88, confirming the recorded duration is not decremented, and 135–149 plus 323–332, confirming damage and attack transitions remain compatible.

This round involved code inspection only. I did not rerun gates or perform browser/visual checks; the integration owner's reported 43 tests/check/build results remain separate evidence. No files or persistent resources were created. The round-zero finding remains valid historical evidence and should be retained.

Temporary worktree links normalized to repository paths; substantive report retained.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 (WR-1) | HP threshold rewound an in-progress Warden windup. | Resolved. Combat selects and records one duration at start; the renderer uses that duration throughout the attack. | 66286ce; two actual-hit red/green regressions, independent re-review, and four native raster threshold checks pass. |

## Verification

Coordinator ran check, all 43 tests and build on the final product. Nineteen renderer checks cover physical weapon geometry separately from slash effects, all actor/combo paths and both facings, grip attachment, windup/contact/return, distinct combos, bow release on the actual shot step, volley, faster clocks, freeze, cancellation and threshold crossing. The worker's retained red evidence was inspected: the original c956015 renderer failed 15 of the initial 17 checks; both threshold regressions failed against the first repair before duration metadata landed.

Actual keyboard J strikes in both directions measured sword-pixel centroid horizontal excursions of 39.00px, 36.33px and 35.34px for combos 1, 2 and 3. The old sword remained below 0.009px horizontal and 0.037px vertical excursion. Small old edge-pixel differences were antialiasing, not meaningful motion. Actual walker combat captured 20 frames across early/middle/late swing phases and dealt 13 damage. Roll canceled a real strike after the key edge reached a simulation frame. Reduced-motion and title bounds passed at 1280×800, 720×560 and 320×640; native frames and each row/phase of both weapon sheets were inspected at original resolution.

Native fixture sheets cover eight weapon paths (three swords, walker blade, archer bow, brute hammer, Warden melee and volley), seven stages, both facings. These are renderer fixtures, not control-path evidence. Final native axe masks remained byte-identical when HP alone changed 180→161 at windup=0.6 and chosen duration=0.88, for melee/volley in both directions. The final built dist entry starts and carries the expected initial duration metadata. Console checks reported zero errors and warnings.

| Inspected image | SHA-256 |
|---|---|
| native-right | 9755b7dba77d3fb494772c03b13800ae1d0fca0570997a7e20d707610f136975 |
| native-left | dc0e404e525402b436016d7b11e26f5ee6abf89471feef1d589b2c1f39553c26 |
| real-enemy-early | 84220da8d90dcd40fc80ac63bcf5cb4861ff21392a306cbf999c93426f3abe73 |
| real-enemy-middle | 2e2c81065a745894565bba72153b8aaebaee1d42f2789c3be54fd5a8fdc3c6e3 |
| real-enemy-late | 3631a26b7c7de9207e4310679fd92aaed6ab6a43320a0596f13e314107d5970c |
| viewport-1280 | e772aff5488b796327c127517ad23379a88e2059b87b35d66e0e5234c67e7bdb |
| viewport-720 | 3799a3507e3d4d40b4418ffd80b56ce4dab0605e1c8e2b8567bdafd2f86dc21a |
| viewport-320 | de1019d38abd04c8f9e7409d7d7d79210ac8906c1cf8fe15914910838139b91b |

The phase sheets and control frames preceded the narrow duration repair; normal poses and unannotated fixtures render the same bytes afterward. Final HP-crossing raster and built-entry checks ran against 05cdaca. Two browser diagnostic mistakes were corrected without changing product code: run-code lacks the URL global, and roll state was initially read before its pending input edge reached a simulation frame. Neither was treated as a product failure or passing measurement.

The first cached CLI helper could launch a Windows console despite a headless browser. It was closed; a task-local preload then forced child_process.spawn windowsHide=true in all helper children, and server launches used Start-Process -WindowStyle Hidden. The flag was checked, and the shared installed CLI was not changed. All named sessions and hidden servers closed in finally, including the bounded keeper's timeout cleanup. Recorded PID/name/command-line checks found no surviving task browser, daemon, GPU/renderer child, server or port 4187 listener. No user process was stopped. This requirement is retained in docs/policies/local-rules.md.

## Round outcome

Requested weapon motion and F0 repair pass local runtime, visual, input, build and focused independent acceptance. Remote CI and main/worktree delivery are recorded in plan.md at closure. Evidence remains ignored only while the task is active and is deleted after accepted closure. No other browser engines, gamepad/touch, or exhaustive animation/performance coverage is claimed.
