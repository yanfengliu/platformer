# Review 0: integration

## Target

Integrated weapon repair 89ea0956e17390a13b250e827467635eb8305a26 against c956015. Implementation handoff is 8381d8e176d8eaf84bc628273f9343df0f6b3f4f.

## Reviewers and coverage

Independent read-only Codex reviewer `/root/weapon_review`, using the fleet review pin. Focused renderer/geometry/timing review, not a multi-CLI quorum. Coordinator owns native raster and actual-control acceptance.

## Reports

### Independent reviewer

Reviewed revision 89ea0956e17390a13b250e827467635eb8305a26 against c956015. One material finding:

WR-1 [P2] — Preserve the Warden's original windup duration. src/render.js:338 recomputes the duration from current HP each frame. Crossing half health during windup therefore rewinds the weapon pose, although simulation timing remains unchanged. Reproduction: melee windup remaining 0.6, HP 180/340; a 19-damage hit reduces HP to 161. Evaluating the production pose/transform helpers before and after produces 12.74 native pixels of maximum axe-head displacement backwards at the same remaining time. src/game.js:141–147 preserves boss windup after damage, while src/game.js:343 chooses its duration only when starting that windup. Preserve that initial duration for rendering, and add a regression covering crossing half health during both melee and volley windups. The existing test at tests/render-weapons.test.js:150–153 covers attacks starting below half health only.

I found no additional material defects in facing transforms, grip attachment, combo differentiation, arrow removal on release, volley slash suppression, cancellation, or renderer immutability.

Reviewed changed paths: src/render.js, tests/render-weapons.test.js, AGENTS.md, docs/policies/local-rules.md, docs/learning/defect-register.md, both changed devlog files, docs/work/1_weapon-motion/plan.md, and docs/work/registry.json. Outside the diff, I read simulation attack/cancellation paths at src/game.js:123–192, enemy release/contact/windup at 282–354, hit-stop at 444–461, and surrounding renderer composition.

This was an independent read-only code review plus a focused numerical diagnostic of the production helpers. I did not run shared gates, browser checks, or visual inspection; the reported 17/41 passing checks and red proof remain worker evidence. No files, servers, browsers, or persistent processes were created.

Temporary worktree links normalized to repository paths; substantive report retained.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 (WR-1) | Warden HP threshold changes the denominator of an already-started windup. | Accepted; a visible rewind contradicts the requested coherent weapon motion. | Worker assigned frozen per-windup duration metadata and actual-damage regressions for melee and volley. |

## Verification

Coordinator reran check (12 JavaScript files), all 41 tests and build. Actual J input on the old renderer showed physical blade centroid excursions below 0.009px horizontally and 0.037px vertically across all three combos. Repaired physical blade movement was roughly 35–39px horizontally, in both directions. Native phase renders and a real walker encounter were inspected separately. These checks do not close F0.

## Round outcome

Original fixed-weapon defect repaired, but F0 remains open at this revision and requires a repair plus focused review. Preserve this report as the historical initial-review result.
