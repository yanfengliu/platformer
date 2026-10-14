# Animate every character weapon through attacks

Status: active
Owner: Codex coordinator
Created: 2026-10-14
Updated: 2026-10-14

## Problem and outcome

The user reports that the sword does not move when striking. Animate the physical weapon and connected arm throughout attacks for the player and every enemy type; an animated slash alone does not satisfy the requirement.

## Scope

Player sword and all three combo strikes; walker blade, archer bow/draw/release, brute hammer, boss axe and ranged volley, both facing directions. Keep gameplay timing, collision and damage unchanged. Base is c956015 on clean main. One implementation worker owns the renderer, supporting animation helper if useful, regression tests, defect register and devlog in an isolated worktree. Coordinator owns acceptance and review records.

## Approach

Existing drawSlash reads continuous attack progress, but character weapon geometry only switches to a fixed attacking/windup pose. Drive physical weapon and arm geometry from attack progress, with coherent anticipation, contact and return poses. Verify actual weapon movement independently of slash/effect changes. Use headless browser control checks plus focused native render fixtures for all enemies and directions.

## Acceptance criteria

- [x] Physical player sword visibly moves through all combo strikes; all enemy weapons move through their attacks/draw/release, in both directions.
- [x] Pose matches the attack phase, stays attached to the hand, and returns cleanly on completion or interruption; boss volley has an appropriate ranged pose.
- [x] A durable regression fails against the reported frozen geometry and passes the repair for the whole character/weapon class.
- [ ] Check/test/build, native visual inspection, actual-key gameplay and required viewports, independent focused review, main push and remote CI pass; task-owned processes/worktrees/output are cleaned.

## Implementation steps

- Integrated handoffs 8381d8 and 66286ce; final product 05cdaca. Check, 43 tests, build, actual controls and native phase inspection pass. [Round 0](reviews/0_integration.md) found a Warden HP-crossing pose rewind; [round 1](reviews/1_integration.md) verifies the duration metadata repair.
- Owner's headless/no-terminal requirement is retained in local rules. Hidden helper/server finally cleanup and recorded process/port checks pass. Pending: main delivery, remote CI and worktree/evidence cleanup.

## Outcome

Product accepted at 05cdacafc1fff0fe9da30e8aee50637e782ff4af. Physical weapons and connected arms animate through anticipation, contact and return for all actors, combos and directions; bow release and boss volley match actual attack phases. Gameplay timing, damage and hitboxes remain unchanged; chosen windup duration is added as render metadata. Whole-class regressions catch the reported frozen geometry and HP-crossing rewind. Independent focused review has no unresolved findings. Main push, remote CI and worktree/evidence cleanup remain before complete status.
