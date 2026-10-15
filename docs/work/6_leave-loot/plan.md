# Keep declined gear on the ground

Status: active
Owner: Codex
Created: 2026-10-14
Updated: 2026-10-14

## Problem and outcome

The owner reports that Leave it destroys gear and wants to return for it later. Closing loot by button or Escape must preserve the exact pickup on the current floor, without equipping it or creating a duplicate.

## Scope

Change loot resolution and its explanation, cover repeated leave/return/equip for the full catalog, and adapt the simulation policy to walk past gear it does not want. Preserve all slot/swap behavior and floor/run lifecycle. Base 4997bb5, isolated worktree .worktrees/leave-loot, owner Codex. No dependency or persistence changes.

## Approach

Mark a pickup collected only when equipped. Keep shared close/buffer clearing for both Leave it and Escape. Use the read-only snapshot as the first browser diagnostic and actual controls for leaving, walking away, returning and equipping. Reuse the retained headless menu gate. The work allocator found missing structural headings in work 5's authored reviews; explicitly labelled corrections retain the original reports and acknowledge missing historical initial-patch provenance.

## Acceptance criteria

- Leave it and Escape preserve the same ground pickup, position and descriptor, leave inventory/stats unchanged, and close without auto-reopening.
- A fresh E opens the item again after walking away and returning; eventual equip consumes it exactly once and still drops prior gear.
- UI copy explains preservation on this floor; keyboard close/scroll/equip flows and initial cards work at 1280×800,720×560,320×640; required title breakpoint gates pass.
- The regression fails on the original core; full check/tests/build and work-document structure pass, review has no open finding, main is pushed and CI passes.
- Owned browsers, helpers, server, temporary output and merged worktree are removed.

## Implementation steps

- Implement and test preservation, UI copy and the simulation policy adjustment.
- Verify real-control leave/return behavior and compact menus; review, integrate and clean up.

## Outcome

Pending. The original core sets collected=true for both take values. The added catalog-wide preservation check fails on that exact flag against the original source; focused changed tests and four-seed completion checks pass after repair. Prior review formatting has been corrected rather than bypassing the allocator.
