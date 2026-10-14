# Readable sword combo feedback

Status: active
Owner: Codex coordinator
Created: 2026-10-13
Updated: 2026-10-13

## Problem and outcome

The owner sees no combo effect when repeatedly attacking with the sword. Make each of the three strikes readable through effects, an explicit stage indicator, and sound, including attacks that miss.

## Scope

Player sword input and feedback and their regression gates. Preserve enemy weapon motion, damage values, the separate kill-chain counter, pixel rendering, reduced motion and pause/mute behavior. No dependencies or unrelated game systems.

## Approach

Implementation owner `/root/combo_fix` works from d65af01123c3e50462366ab5a059e145b8ba4037 in `.worktrees/combo-fix`. Coordinator owns `.worktrees/combo-acceptance`, contracts, headless acceptance, independent review, integration and cleanup. Current stages differ in pose and damage but share effects/sound, and the HUD chain counter measures kills. The short tap buffer also expires before recovery ends. Approved contract: explicit `stage` on attack/hit events while `amount` retains its meaning; a single pending strike can wait through current recovery and external input cancellation clears it. Actor-local three-stage cue, distinct teal/rising and amber finisher effects and sounds communicate the sequence without kills.

## Acceptance criteria

- [x] Real taps and held attacks show 1→2→3 and repeat; effects work without kills and the finisher differs clearly in slash, impact and sound.
- [x] Expiration, roll, damage and external input cancellation reset sequence/queued input without a phantom strike; mute/pause and reduced motion remain correct.
- [x] Existing weapon geometry, timing/damage and kill-chain semantics remain correct; meaningful tests fail with the defect and pass after repair.
- [x] Check, tests and build pass; headless real controls/rendering inspected at 1280×800, 720×560 and 320×640, including both narrow title actions.
- [ ] Exact integrated revision independently reviewed, findings resolved, main merged/pushed, remote CI green and owned resources cleaned.

## Implementation steps

- [x] Inspect instructions, main and prior defects; allocate record and isolated worker/acceptance trees; dispatch implementation.
- [x] Reproduce baseline through real controls and the read-only snapshot.
- [x] Integrate worker changes and run final automated, visual and control gates.
- [ ] Retain independent review, defect and devlog records; merge/push and follow CI.
- [ ] Clean output, browsers, server and worktrees; close the goal.

## Outcome

Product d95feb2f4a9c3926551d7221d4f7878fd77a3055 is verified and independently reviewed with no material findings. Check, 55 tests, build and diff check pass. Twelve new tests fail on the old modules and pass on the repair. Real controls, native stage inspection, finisher impacts, mute/pause/reduced motion and all three viewport/title gates pass; review round 0 retains bounds and digest provenance. Hidden/headless browser, daemon, server and their recorded children were verified gone. Main push, remote CI and worktree/output closure remain. First automated fixtures and first impact target setup were invalid measurements and were corrected before acceptance, without product changes or weakening gates. Model calls/compute were not separately measured.
