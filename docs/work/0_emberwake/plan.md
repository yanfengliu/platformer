# Emberwake playable roguelike platformer

Status: complete
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
- [x] Checked code is on main and pushed; task-owned worktrees, servers, browsers, and disposable evidence are cleaned.

## Implementation steps

- Integrated: core 75d2dcd, visual 13baf63, app 03e2426, precision-jump repair c6a02f2; product revision 497a3ce.
- Passing: npm check, 24 simulation/input tests, build, install/audit with zero dependencies, real-control browser smoke and 720px layout.
- Reviewed and accepted: [round 0](reviews/0_integration.md) resolves precision jumps; [round 1](reviews/1_integration.md) accepts final product 03198de and the compact-menu repair with browser bounds and clicks.
- Passing: actual-key three-floor victory (61.80s, 20 kills, three upgrades), death/victory retries, keyboard/mouse/healing, source and built entry, audio signal/mute and reduced motion, inspected desktop/720px/320px renders.
- Delivered main revision 899056b48997099259a91064f25e82dbaa0f0f77 and pushed to origin. [Remote CI](https://github.com/yanfengliu/platformer/actions/runs/38431821038) completed successfully with install, audit, check, test and build. Five task-owned worktrees and merged branches were removed; owned browser/server/daemon children and port cleanup were verified. Disposable acceptance output was deleted at closure.

## Outcome

Complete. Product acceptance passes at 03198de1bb032ea65b19850f653102ba68145540; delivered main 899056b48997099259a91064f25e82dbaa0f0f77 has the same product bytes plus retained reviews and devlog. Local check/test/build/audit, actual-key three-floor victory, visual and audio-signal acceptance, independent review, fleet document-shape gate and remote CI pass. Both findings are resolved; no required check is open. Initial remote push was rejected by automatic review; the exact recorded fleet R14 grant and matching signed-in account/repository owner were verified, and retry of the same ordinary push was approved. Task-owned processes, worktrees, branches and temporary evidence were cleaned without touching unrelated resources. No physical-speaker listening, other browser engines, gamepad/touch, or exhaustive seed/performance checks are claimed. The final closure commit changes only this document.
