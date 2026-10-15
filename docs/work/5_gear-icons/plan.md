# Item icons and visible gear slot limits

Status: active
Owner: Codex
Created: 2026-10-14
Updated: 2026-10-14

## Problem and outcome

Items lack icons in menus and the equipment limit is not obvious. The owner also requires replaced gear to drop on the ground instead of disappearing. Show recognizable pixel icons, exactly one blade, armor and charm slot, and recoverable displaced gear after loot and merchant swaps.

## Scope

Equipment, shop and loot cards; shared original pixel icons; run-only swap behavior and regression checks. Preserve talent storage, combat balance, keyboard access, compact layouts and the dependency-free runtime. Base revision 044f8b2. Work is isolated in .worktrees/gear-icons on codex/gear-icons; no other worktrees were present.

## Approach

Retain the existing single-item inventory object and centralize its three slot names. Share a DOM-free icon atlas between SVG menu icons and Canvas ground gear. Centralize gear equip so loot and merchant purchases both drop a copied prior item at the player's feet. Use existing read-only snapshots plus real controls as the first browser diagnostic; there is no writable production debug interface.

## Acceptance criteria

- Every gear item and merchant consumable has an original pixel icon; empty gear slots show a subdued type icon.
- Equipment visibly shows one slot per type with occupied counts, including at compact sizes.
- Loot and shop replacement drop exactly one prior item, preserve other slots and recompute effects without stacking or healing. Repeated swaps conserve items and ground gear can be recovered with E.
- Rejected purchases and leaving loot cause no equipment drop; no duplicate input action or automatic pickup occurs.
- Check, tests and build pass. Headless real controls and inspected title/talent/equipment/shop/loot states pass required viewports and title breakpoints. Independent review has no open material finding.
- Changes reach main, remote CI is checked, and owned processes, temporary artifacts and worktree are removed.

## Implementation steps

- Implement icons, shared slots and swap drops, then cover the reported defect classes with red/green controls.
- Exercise real controls headlessly and inspect rendered states at required viewports, including keyboard scrolling and replacement recovery.
- Obtain independent read-only review, resolve findings, integrate and clean up.

## Outcome

Implementation and local acceptance complete; final commit review, main delivery, CI and cleanup pending. Check covers 31 JavaScript files; all 107 tests and build pass. Existing lessons file is absent. Baseline gear already uses one object value per type, but direct assignments discarded the previous value and menu cards contained only text.

The old core fails four of the initial five transaction tests; old renderer fails the catalog ground-icon gate; old real-control UI fails the three-icon assertion. The F0 center-drop mutation fails merchant re-entry. Final simulation gates cover all three types, every catalog replacement, 12 recovery cycles, atomic rejection and supporting ledges/pits. There was one substantive repair, F0. A test's strict comparison to decimal 1.14 was corrected for floating-point addition before accepting the gate; two browser harness errors (an accessible-name locator and URL absent from the CLI sandbox) were corrected without product changes.

Built seed-0 real controls made four loot choices, three loot swaps and one purchase, reopened the merchant while the old item survived, and recovered it with E at 36.82 simulation seconds. All 15 item icons were inspected individually at their rendered 48px size. Empty and occupied equipment, talent, shop and loot menus were inspected at 1280×800, 720×560 and 320×640, including first named cards, keyboard scrolling and purchase feedback. Both title actions fit the strict inner frame and accepted real clicks at 320,420,421,480,481,560,561,720,1280px widths. No page errors occurred. Raw evidence remains under ignored output until final review accepts it.

The pure callback scripts/browser/gear-menus.mjs is the retained headless menu gate; use Playwright CLI run-code from an ignored output folder against a fresh built-game session. It checks named cards, icons, capacity and actual clicks/keyboard scrolling. Full swap controls remain separate acceptance evidence. No dependency or persistent-profile format changed; production debug remains read-only. Ground gear belongs to the current floor and is removed with that world on floor transition, as before.
