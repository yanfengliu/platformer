# Roguelike integration review, round 0

## Target

Recoverable Git tree21454efd8a16ed62825e9f808d566f82c3ebe861 versus baseline52f8ec32f2a7326f7837f7e2e215a25810f39cb1. Core3298fb6, art46cb06f, appbf313c7; UI prerequisite608eb6f reproduces the core commit. Date2026-10-14.

## Reviewers and coverage

Independent read-only Codex reviewer followed the fleet reviewer pin. The integration owner supplied automated checks and real menu evidence; full-run and native visual evidence arrived after this authored round and must be included in the focused final review.

## Reports

### Independent reviewer, verbatim

Review target: Git tree `21454efd8a16ed62825e9f808d566f82c3ebe861`, compared with baseline `52f8ec32f2a7326f7837f7e2e215a25810f39cb1`, in `C:/Users/38909/Documents/github/platformer/.worktrees/roguelike-acceptance`.

No new material finding was substantiated in this read-only code review. No F1+ findings are raised.

**F0 — owner-reported compact panel hierarchy — remains open.** At compact sizes, the initial talents/inventory view reportedly exposes no cards. Relevant construction is `src/main.js:209–251` and `src/main.js:261–270`; shared panel/card layout is `src/style.css:121–140`. I inspected the code but did not independently reproduce the visual symptom. The isolated presentation repair and its final integrated bytes require focused re-review.

Reviewed coverage:

- Enemy behavior: committed heavy/elite/lancer attacks, shield facing and recovery, immutable windup duration, charge contact, vial flight, delayed bomb damage, and finite projectile lifetime.
- Rendering: seven role silhouettes, attached mace/spear/vial poses, facing transforms, telegraph clocks, actual bomb radius, pause/reduced-motion handling, bounded raster work, gear silhouettes, and merchant stock presentation.
- Run systems: independently seeded world/loot/shop streams, gear validation and replacement, talent/relic recomputation, capacity limits, finite stock, reject-before-mutate transactions, floor retention, and new-run reset.
- Persistence: strict known talent ranks and prerequisites; bounded IDs/history; frozen validated copies; once-only settlement within the retained ID window; unsupported-version preservation; storage-error session fallback; fresh-read transactions inside exclusive Web Locks; pending UI state; and next-run-only talent application.
- App integration: actual input enable/clear boundaries, overlay priority, Escape behavior, focus retention/trapping, storage refresh, death/retry ordering, and read-only diagnostics. Outside the diff, I inspected `src/input.js:30–45` and `src/input.js:95–114` to confirm input clearing and enable/disable behavior.

Independently executed bounded probes passed:

- 57 same-slot gear replacement pairs matched freshly equipped stats and maximum health.
- 32 duplicate/invalid merchant refusals preserved the complete game snapshot.
- Four stores sharing a serialized lock mock awarded one duplicate run only once, respected the three-rank purchase cap, and produced the expected balance of 14 embers.
- A newly unsupported saved version remained byte-for-byte unchanged after a session transaction.
- The executable files and tests had no diff against the specified tree after review.

Supplied by the integration owner, not independently rerun: syntax/static checks covering 26 JavaScript files; 98 tests; build; diff check; title fit/hit/click checks at 11 widths; and inventory pause/input-clear checks at the three required viewports.

Limits: I launched no browser/server, reran no full gate, and inspected no rendered captures during this round. Native visual inspection, actual full-run controls, end-state/reload flows, and F0’s repair evidence are pending owner delivery. The no-Web-Locks fallback protects sequential stale writers; simultaneous cross-tab writes remain outside its stated guarantee. This is a bounded code-review result, not final release acceptance.

Read-only audit: no files, Git state, servers, browser sessions, or persistent artifacts were created or changed by this reviewer.

## Findings and disposition

F0 is the owner's visual finding: required320×640 talents/inventory and new loot/shop panels initially devoted the clipped frame to large headings and duplicated copy, with no visible item/node;720×560 talent cards also started below the visible area. Controls could scroll and worked in the real full run, so this is a hierarchy/readability defect rather than a transaction failure. A focused app repair is pending; title bounds must remain green. No F1+ finding in this round.

## Verification

Owner combined gates pass26JS/98tests/build/diff. Built real controls checked both title actions inside the border-excluded frame with hit tests and actual Help/Start clicks at320/420/421/480/481/560/561/701/720/1000/1280. Inventory pauses and clears attack edges at1280×800,720×560,320×640. Finally cleanup confirmed every recorded owned process gone and port4191 stopped after each browser probe. These bounds do not accept F0 or native new content yet.

## Round outcome

Code/persistence review has no new material findings; release acceptance remains open for F0, remaining rendered states, death/storage controls and focused final re-review. Reports remain authored history; later success does not replace this round.
