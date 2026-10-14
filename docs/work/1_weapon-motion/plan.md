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

- [ ] Physical player sword visibly moves through all combo strikes; all enemy weapons move through their attacks/draw/release, in both directions.
- [ ] Pose matches the attack phase, stays attached to the hand, and returns cleanly on completion or interruption; boss volley has an appropriate ranged pose.
- [ ] A durable regression fails against the reported frozen geometry and passes the repair for the whole character/weapon class.
- [ ] Check/test/build, native visual inspection, actual-key gameplay and required viewports, independent focused review, main push and remote CI pass; task-owned processes/worktrees/output are cleaned.

## Implementation steps

- Active: delegate renderer/pose/regression repair. Pending: acceptance, independent review, integration, main delivery and cleanup.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
