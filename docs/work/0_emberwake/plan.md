# Emberwake playable roguelike platformer

Status: active
Owner: Codex coordinator
Created: 2026-10-13
Updated: 2026-10-13

## Problem and outcome

The empty repository becomes a complete playable pixel-art roguelike platformer with precise controls, readable combat, and a three-floor run ending in a boss. The user requested orchestration and goal mode until completion.

## Scope

Original art, generated sound, keyboard/mouse controls, procedural rooms, melee enemies and ranged attacks, upgrades, healing, death/retry, pause, and victory. No copied Dead Cells assets, multiplayer, persistence, or external services. Base revision: e64c3b46524c1d440b6dfe233243f59c9964787f. Main was clean; no active attached worktrees existed.

## Approach

Use dependency-free ES modules and Canvas at 640×360 with fixed simulation steps. Shared interfaces and file ownership are in [design.md](design.md). Three workers implement core, rendering, and app/tooling in isolated worktrees; integration owner merges checked commits, exercises the real control path headlessly, obtains independent review, then merges and pushes main. The new repo has no debugging instrument; simulation exports and read-only browser state provide the first diagnostic probes.

## Acceptance criteria

- [x] Movement includes acceleration, variable jump, double jump, coyote time, jump buffering, and collision without tunneling.
- [x] Combat includes a sword combo, roll immunity, telegraphed enemies, hit flashes, knockback, sparks, damage numbers, hit-stop, camera shake, and sound.
- [x] Reproducible generated rooms support three floors, relic choices, healing, a boss, victory, and death/retry.
- [x] Title, pause, controls, upgrade choice, HUD, mute, and responsive nearest-neighbor rendering work through actual input.
- [x] Simulation gates, syntax/build, dependency audit, browser controls, representative rendered states and viewports, and independent integrated review pass within their documented bounds.
- [ ] Checked code is on main and pushed; task-owned worktrees, servers, browsers, and disposable evidence are cleaned.

## Implementation steps

- Integrated: core 75d2dcd, visual 13baf63, app 03e2426, precision-jump repair c6a02f2; product revision 497a3ce.
- Passing: npm check, 24 simulation/input tests, build, install/audit with zero dependencies, real-control browser smoke and 720px layout.
- Reviewed and accepted: [round 0](reviews/0_integration.md) resolves precision jumps; [round 1](reviews/1_integration.md) accepts final product 03198de and the compact-menu repair with browser bounds and clicks.
- Passing: actual-key three-floor victory (61.80s, 20 kills, three upgrades), death/victory retries, keyboard/mouse/healing, source and built entry, audio signal/mute and reduced motion, inspected desktop/720px/320px renders.
- Browser/server/daemon and child cleanup verified. Pending: main delivery, remote CI, worktree/evidence cleanup and closure.

## Outcome

Product acceptance passes at 03198de1bb032ea65b19850f653102ba68145540. Fleet work-document shape check passed. Core found an unreachable optional platform branch, added an approach step, and observed the same 120-floor gate pass after the old geometry failed. Both independent-review findings are resolved. Main push, remote CI, and worktree/evidence cleanup remain before complete status. No physical-speaker listening, other browser engines, gamepad/touch, or exhaustive seed/performance checks are claimed.
