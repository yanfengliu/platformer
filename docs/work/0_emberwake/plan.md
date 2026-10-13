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

- [ ] Movement includes acceleration, variable jump, double jump, coyote time, jump buffering, and collision without tunneling.
- [ ] Combat includes a sword combo, roll immunity, telegraphed enemies, hit flashes, knockback, sparks, damage numbers, hit-stop, camera shake, and sound.
- [ ] Reproducible generated rooms support three floors, relic choices, healing, a boss, victory, and death/retry.
- [ ] Title, pause, controls, upgrade choice, HUD, mute, and responsive nearest-neighbor rendering work through actual input.
- [ ] Simulation gates, syntax/build, dependency audit, browser controls, representative rendered states and viewports, and independent integrated review pass within their documented bounds.
- [ ] Checked code is on main and pushed; task-owned worktrees, servers, browsers, and disposable evidence are cleaned.

## Implementation steps

- Core worker reports 15 simulation checks passing, including an input-only three-floor victory; handoff commit and independent acceptance pending.
- Active: visual worker owns authored pixel-art renderer in .worktrees/visual.
- Active: app worker owns shell, input, audio, tooling, CI and repo instructions in .worktrees/app.
- Pending: integration, headless acceptance, independent review, fixes, main delivery, resource cleanup.

## Outcome

Pending. Fleet work-document shape check passed after placing module contracts in design.md. Core found an unreachable optional platform branch, added an approach step, and reports a 120-floor reachability gate passing after observing the old geometry fail. Worker claims remain pending integrated acceptance.
