# Review 0: implementation

## Target

Repository platformer, base 044f8b2ed4fb91cec1829218ae6fa95e52f6b853 plus the initial uncommitted gear icon and swap implementation. Reviewer gear_review independently read the actual source and reproduced the finding through public simulation functions. Reviewed game.js SHA256 b0edb7f45ecfadb58e0103066214d0619bb4c9769fb8500eb615c99751a6a184 identifies the superseded initial implementation; final review will bind the repaired implementation to its commit.

## Authored report — gear_review

Review round 1 — material finding F0 [P2]

At src/game.js:599, displaced gear is placed at the player's center. Buying while centered on a merchant therefore puts it at the merchant's exact interaction position. The unchanged updatePickupsAndExit path (src/game.js:532–561) handles gear before merchants, making the dropped item cover the merchant's entire interaction range.

Reproduction: seed 0; equip Iron edge; stand at merchant center x=2101; buy the blade; close the shop. Pressing E at center offsets −51, −40, 0, 40 and 51 always opens swap-1-1 loot. Recovering it drops the purchased blade at that same position. Ordinary repeated interaction cannot reopen remaining stock without consuming gear or deliberately relocating it.

Requested fix: place displaced gear beside the player and choose the nearest eligible interaction target. Preserve existing reach bounds and make clamped placement choose the other side when necessary. Add a regression proving the merchant can reopen while its displaced gear remains, then prove that gear can still be recovered.

No other material finding in the reviewed changes. Gear conservation, copied item data, three independent occupied slots, recomputed stats, rejected transaction atomicity, unique drop IDs, catalog icon coverage, cached pixel data and static build inclusion appear coherent.

Verification: reviewed base plus the current dirty source/test changes; ran both new test files, 7/7 passed. The merchant test currently asserts gear priority but does not test reopening the merchant while preserving the drop. Independently reproduced F0 through public simulation functions. Read unchanged world generation, stat recomputation, pickup/merchant interaction, shop closure, menu focus restoration, keyboard handling and build-copy paths. No edits, browser/server launches or full gates. Visual appearance and real keyboard/DOM behavior remain for the parent's browser gate.

## Owner disposition

F0 accepted and repaired. Displaced gear now appears 26 world pixels beside the player on a supporting surface, using the other side if a platform edge would put it back at the player's center. E chooses the nearest eligible gear, relic or merchant using the existing reach bounds. The revised merchant gate proves re-entry while the drop survives and recovery after moving toward it. A center-drop mutation fails that exact merchant re-entry assertion, reporting loot instead of shop. The real-control seed-0 probe passed shop purchase, shop re-entry and ground recovery. Focused re-review is required before acceptance.
