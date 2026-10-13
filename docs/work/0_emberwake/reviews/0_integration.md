# Review 0: integration

## Target

Emberwake product revision 497a3ce27c200cccc839ccdf5c75e16b9448f0aa. This integrates core 75d2dcd, renderer 13baf63, app 03e2426, and jump repair c6a02f2. The earlier diagnostic target is recoverable revision 738c7fe85147955847ad4359743bf688505bb6b6.

## Reviewers and coverage

Independent read-only reviewer `/root/review`, running the fleet's pinned Codex review model and effort. One independent lane; no multi-CLI quorum. Coordinator owns separate browser, visual, local-gate and remote-CI acceptance.

## Reports

### Independent Codex reviewer

Independent read-only review of 497a3ce27c200cccc839ccdf5c75e16b9448f0aa, in the assigned review worktree.

No unresolved material findings within the reviewed scope.

EW-R1 — P2, resolved: A jump released before its landing buffer or hit-stop expired previously launched at full height. On 738c7fe85147955847ad4359743bf688505bb6b6, my bounded Node diagnostic measured both delayed taps at 74.71px, identical to holding jump; an ordinary tap reached 18.70px. The repair at src/game.js:249 applies release handling when the queued jump starts. Repeating the original diagnostic on the final revision measured both delayed taps at 16.08px, versus 74.71px held; ordinary taps remained 18.70px. All sampled arcs landed. The regressions at tests/game.test.js:138 cover both delayed paths, single execution, full landing, and held-versus-released height.

I read the complete core, world generation, renderer, app, input, audio, HTML/CSS, simulation and input tests, server/build/check scripts, package manifest and lockfile, CI workflow, README, repository instructions, and plan/design. Coverage included collision and jump semantics, attack contact and immunity, enemy timing, deterministic routes, upgrade/resource carry, floor completion, bounded rendering effects, menu transitions, fixed-step input consumption, lifecycle cleanup, audio activation, and static delivery.

Code inspected beyond the repair diff includes src/world.js:17 (generated room topology and guaranteed ground route), src/main.js:229 (accumulator, input sampling, event draining, and mode transitions), src/input.js:39 (keyboard edges, held state, and hotkeys), and scripts/serve.mjs:25 (request resolution and root containment).

Limits: I examined the simulation and input gates but did not rerun shared gates, launch browsers/servers, inspect rendered screenshots, or verify remote CI. My execution was limited to the bounded jump diagnostics using Node 24.12.0. Real-control browser behavior, visual quality, viewport fit, and audible output remain integration-owner acceptance work. I flagged the 320px title layout for visual checking as an unverified concern, not a finding.

This is one independent reviewer lane, not a multi-CLI quorum. I changed no files, created no output artifacts, and left no processes running. The reviewed worktree reported no local changes.

Report retained with temporary absolute worktree links normalized to repository file/line references; substantive content unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 (EW-R1) | Delayed taps launch full-height jumps. | Accepted; a precision-control requirement. | c6a02f2, two red/green regressions and independent repeat diagnostic pass. |
| F1 (EW-R2) | 320px title may clip menu actions. | Reviewer recorded a concern, not a finding. Coordinator subsequently verified How to play clipped: frame bottom 296px, button top 295.72px and bottom 323.72px. | App worker assigned a narrow CSS repair; round 1 will review it. |

## Verification

Coordinator ran Node 24.12.0 npm check (11 JavaScript files, imports, entry point), npm test (24 passing), static build, npm ci with scripts disabled, and dependency audit (zero vulnerabilities, zero dependencies). Real browser keyboard smoke checked title start, movement, jump, double jump, roll immunity, pause/resume, help, mute, death/retry, and 720px layout. Title/game/jump/roll/help states inspected at 1280×800 and 720×560. Browser full-run, final small-layout repair, remote CI and final cleanup remained in progress at this round.

## Round outcome

F0 resolved on the reviewed revision. F1 was confirmed during subsequent visual acceptance and requires repair and focused review. This round does not certify uncompleted browser or remote checks.
