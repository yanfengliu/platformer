# Keep declined gear on the ground

Status: complete
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

Delivered product commit 043224fc386fbaf71f2d544d74d5addf6faea261 and reviewed browser-gate correction 405318e8c260153a58a561f2ae4cb34088d8feec to main and origin/main. Both independent review rounds have no material findings. Final main passes all 108 tests, the 32-file check, build and source/build byte comparison. GitHub Actions 38687705892 passed the product revision and 38687901839 passed the final browser-gate revision. Original four-seed completion thresholds remain unchanged and green. The original core fails the new catalog-wide preservation gate on collected=true. Prior review formatting was corrected rather than bypassing the allocator; all seven work units pass its structural gate.

Actual seed-0 controls reached Iron coat at 10.32 seconds and passed three leave/away/return cycles: mouse click at1280×800, Escape at720×560, keyboard Leave at320×640. Each retained the same descriptor, coordinates and pickup identity; eventual equip consumed it. The same run reached a merchant at27.91 seconds. Required initial card and keyboard-scroll states in loot, shop, talents and equipment were inspected; both title actions fit and clicked at all nine required/surrounding widths. No page errors occurred. Named-session finally cleanup and recorded process/port audit found zero leftovers. Review round0 retains independent source/test coverage and owner control/visual evidence.

One final main repeat failed the browser gate's fixed 550ms travel assumption. The gate now waits for observed distance with 50 bounded polls, keeping the same strict >52px interaction-radius assertion. Focused independent round1 accepted the correction. The corrected final main run passed all three closes/returns and equip, reaching loot at10.38 seconds and the merchant at29.42 seconds; the complete title/menu matrix passed again. No product repair beyond the requested preservation change was needed.

All acceptance criteria are met. Both browser runs and the invalid timing probe used finally cleanup. The final audit found zero task-owned browser/daemon/server/console processes and zero port4194 listeners. The merged worktree, branch and disposable task output were removed; authored reports retain inspected-byte digests. The primary dist build is intentionally retained as the verified static artifact. No required check is failed, skipped or unavailable. Expected negative controls and the corrected timing probe are recorded separately from accepted verification. Ground gear remains tied to the current floor; leaving that floor or starting a new life still replaces its world.
