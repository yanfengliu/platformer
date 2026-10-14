# Independent sword combo review — round 0

## Target

Author: `/root/combo_review` (fleet-pinned reviewer)
Reviewed product revision: d95feb2f4a9c3926551d7221d4f7878fd77a3055
Base revision: d65af01123c3e50462366ab5a059e145b8ba4037

## Reviewers and coverage

Independent read-only `/root/combo_review` used the fleet reviewer pin and inspected all seven changed files plus adjacent core, input, renderer, audio, app, world and test paths. Coordinator owns separate gates, real browser controls and raster inspection. One independent lane; no multi-CLI quorum.

## Reports

Independent read-only review of `d95feb2f4a9c3926551d7221d4f7878fd77a3055` against baseline `d65af01123c3e50462366ab5a059e145b8ba4037`.

**Findings: none.** I found no concrete correctness regression or required code change in the seven changed files.

Reviewed behavior:

- Released attack taps occupy one slot that survives the remaining recovery. Consuming that slot clears it, while held attacks retain the existing recovery timing (`src/game.js:221`, `src/game.js:244`).
- Roll and damage cancel queued attacks and combo continuation. Pause/help transitions, blur, and hidden-document handling reach `clearActionBuffers`, including queued hit-stop edges. Clearing continuation preserves an active swing’s stage until that swing ends (`src/game.js:86`, `src/game.js:185`, `src/game.js:226`, `src/main.js:145`, `src/main.js:280`).
- Explicit event stages preserve the existing meanings of attack `amount` and hit damage `amount`. Sword damage, contact windows, recovery durations, and kill-chain accounting remain unchanged (`src/game.js:134`, `src/game.js:159`, `src/game.js:194`).
- Stage colors, numbered feedback, the wider amber finisher, and finisher sparks apply without requiring contact. The indicator is clamped inside the canvas. Added effects use the existing 230-particle and 24-label limits; reduced motion suppresses added radial marks and reduces sparks (`src/render.js:385`, `src/render.js:417`, `src/render.js:835`, `src/render.js:846`).
- Stage-specific attack audio retains gesture-unlock, mute, pause, and context-state guards. Enemy physical weapon poses remain unchanged (`src/audio.js:16`, `src/audio.js:33`, `src/audio.js:85`, `src/render.js:344`).

Adjacent unchanged code was read beyond the diff, including hit-stop input merging and update ordering, overlay transitions, camera transforms, weapon geometry, and existing input/game tests. One exact unchanged-file citation is `src/world.js:73`, which defines the production player spawn; world geometry and bounds were also inspected.

**Verification limits:** This was source review, not an independent gate run. I did not run `npm run check`, `npm test`, `npm run build`, browser checks, raster inspection, or audio playback. I inspected the new regression tests and relevant existing tests. Real-control behavior, native-resolution readability, viewport layout, and perceptual sound quality remain the coordinator’s acceptance responsibility; reported gate results were not counted as my own observations.

The review worktree remained clean at the pinned revision. No repository files were edited, and no browser, server, persistent process, or task artifact was created.

## Findings and disposition

No material findings. The authored report above and owner verification below preserve separate sources of evidence.

## Verification

No material findings remain. Coordinator independently ran check, all 55 tests, build and diff check on the exact product bytes. The dependency audit was not repeated because manifests and dependencies are unchanged.

Production real-key seed-0 acceptance at 1280×800 reproduced the original lost second tap at a 70ms interval, then proved exactly two swings after repair. Held J produced 1,2,3,1 in both facings, with zero kills and 100 health. Six native 200×160 crops were inspected individually: numbered progression, distinct rising teal stroke and broad amber FINISH stroke remained attached to the moving blade. Actual pause during a queued follow-up prevented any extra strike after resume. The actual unlocked AudioContext scheduled 220Hz, 280Hz and 145Hz stage tones with an additional 440Hz finisher accent. Actual mute scheduled zero new tones while four swings proceeded. Audio scheduling and generated output guards were tested; subjective listening was not performed.

Real movement and attacks hit a seed-0 walker with stage two (42→19 health) and stage three (19→0) in both normal and reduced motion. Captured damage text remained 34 on the finisher; player health remained 100 and the separate kill chain was one. The first impact probe killed the 42-health walker with stages one and two, so it was rejected as a third-stage test; the valid probe primed the first two strokes at range and closed with real movement. No gameplay state was set.

Title and third-stage gameplay renders were inspected at 1280×800, 720×560 and 320×640. At every size, both title actions were inside the clipped frame and clicked successfully. At 320px Start spans y183.015625–217.015625 and How to play y247.015625–275.015625. Stage feedback stays inside the game view without crowding the DOM HUD. Evidence was captured from d95feb2 product bytes; the sorted PNG digest manifest (filename plus SHA-256, PowerShell UTF-8 lines) has SHA-256 `95037ABB4C956F8BE310A0FF8AC6619D2C63EBAFD0F67E81CA441898E3D2FF98`, covering six native strike crops, six viewport captures, two impacts and the baseline image. Disposable evidence is removed after closure; this record preserves provenance and bounds.

All launches used the task-local hidden-child preload and headless Chromium. The named browser, daemon, hidden server and all recorded children closed in `finally`; exact PID/name/command-line inventory then confirmed zero leftovers. The worker also launched no browser/server and verified no worker-owned processes.

## Round outcome

No material findings or local acceptance gaps remain. Product source and controls/raster gates pass on the exact reviewed revision. Main push, remote CI and disposal of worktrees/output are tracked in the plan. The first review-document check rejected missing template headings; the complete existing fleet schema was then applied without changing the authored report or product bytes.
