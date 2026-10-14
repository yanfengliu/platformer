# Stronger pixel art presentation

Status: complete
Owner: Codex coordinator
Created: 2026-10-13
Updated: 2026-10-13

## Problem and outcome

The owner wants a more distinctly pixel-art game. Make the world, characters, effects and interface share a crisp, intentionally pixel-drawn style while retaining precise controls and readable sword combos.

## Scope

Renderer presentation and accessible DOM interface, with local authored font/assets where needed. Preserve 640×360 native coordinates, simulation, collision, input, audio, all physical weapon motion, sword stage/finisher feedback and reduced-motion support. No runtime dependencies, copied art, unrelated mechanics or visible windows.

## Approach

Base f9039a61268acda2cbcba47c2d6a22f630376c5b. `/root/pixel_ui` owns CSS, semantic presentation and local bitmap font in `.worktrees/pixel-ui`; `/root/pixel_world` owns crisp renderer geometry, lighting/palette/tile detail and meaningful raster gates in `.worktrees/pixel-world`. Coordinator owns `.worktrees/pixel-acceptance`, integration, native visual/control/performance acceptance and independent review. Current serif title/UI, smooth CSS gradients and Canvas polygon antialiasing/lighting compete with the sprites. Retain game coordinates and weapon contracts; use discrete raster detail and stepped interface forms. Expensive gates have one owner at a time.

## Acceptance criteria

- [x] Title, controls, HUD and menus use coherent pixel-style typography/icons/borders, remain readable and keyboard accessible, and both narrow title actions are visible/clickable.
- [x] Actual world/sprites/effects have crisp pixel edges and discrete lighting/detail; native rendering of each affected actor/theme is individually inspected.
- [x] Real-key movement, sword tap/hold1→2→3, roll, combat, pause/help/mute and responsive layouts remain correct at 1280×800,720×560,320×640.
- [x] Existing meaningful weapon/input/game regressions remain green; new raster/asset checks cover concrete style constraints with a valid baseline discriminator. Performance remains playable within measured headless bounds.
- [x] Check/tests/build, integrated independent review, main merge/push, remote CI and task-resource cleanup complete.

## Implementation steps

- [x] Read rules, prior defects and clean main/worktree state; allocate unit and dispatch separate UI/world owners.
- [x] Capture baseline; settle contracts and integrate checked worker commits.
- [x] Run final gates, real headless controls, native visual/viewport and performance checks; retain independent report.
- [x] Update lasting defect/design/devlog records; merge/push and follow CI.
- [x] Clean task output, processes, worktrees and branches; close goal.

## Outcome

Final product b1e320e7af9ad9a14638af9eed64d02d477762a7 passes check,59tests, build, actual controls, native actors/themes and menus, desktop frame timing and strict12width title acceptance. Independent rounds0/1/2 close F0 with no material finding left. Raster/font source remains unchanged across the two title-only repairs. Earlier invalid baseline return-context/initial outer-box measurements were corrected and their claims bounded; four substantive repairs were used (two raster refinements, two title fixes). Review2 retains asset/render digests and limits. Delivery eb824a38a10371e84478f3a4f58ee22725c6fb75 is merged/pushed on main; [CI run38514290829](https://github.com/yanfengliu/platformer/actions/runs/38514290829) and every job step succeeded. Every browser/daemon/server/child tree closed and verified gone; all four clean task worktrees, their merged branches, compiled output and raw evidence were removed. The guarded cleanup rejected a malformed path array before any deletion, then explicit absolute targets passed and were removed. Only primary main remains. This closure changes documentation only, so runtime/remote gates are not repeated. Model calls/compute were not separately measured.
