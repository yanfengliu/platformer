# Stronger pixel art presentation

Status: active
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

- [ ] Title, controls, HUD and menus use coherent pixel-style typography/icons/borders, remain readable and keyboard accessible, and both narrow title actions are visible/clickable.
- [ ] Actual world/sprites/effects have crisp pixel edges and discrete lighting/detail; native rendering of each affected actor/theme is individually inspected.
- [ ] Real-key movement, sword tap/hold1→2→3, roll, combat, pause/help/mute and responsive layouts remain correct at 1280×800,720×560,320×640.
- [ ] Existing meaningful weapon/input/game regressions remain green; new raster/asset checks cover concrete style constraints with a valid baseline discriminator. Performance remains playable within measured headless bounds.
- [ ] Check/tests/build, integrated independent review, main merge/push, remote CI and task-resource cleanup complete.

## Implementation steps

- [x] Read rules, prior defects and clean main/worktree state; allocate unit and dispatch separate UI/world owners.
- [ ] Capture baseline; settle contracts and integrate checked worker commits.
- [ ] Run final gates, real headless controls, native visual/viewport and performance checks; retain independent report.
- [ ] Update lasting defect/design/devlog records; merge/push and follow CI.
- [ ] Clean task output, processes, worktrees and branches; close goal.

## Outcome

Pending. Production flow probes use real input and read-only debug snapshots; supplemental renderer fixtures are labelled separately. Headless browser and hidden server use identified sessions/processes and finally cleanup. Static raster quality is assessed visually, not inferred from a filename or worker summary.
