# Roguelike integration review, round 1

## Target

Product tree73fffdbd322157a51a241c3c045e71c58fece76f compared with round0 tree21454efd8a16ed62825e9f808d566f82c3ebe861. The focused product change is app commit351c21a; core3298fb6, renderer46cb06f and profilebf313c7 remain unchanged. Date2026-10-14. Subsequent devlog/review closure edits and the schema-preserving contracts.md-to-design.md rename change documentation only. Reviewed product bytes are retained by the final integration commit; earlier bytes can be reconstructed from baseline52f8ec3 plus the named worker commits, all retained as ancestors.

## Reviewers and coverage

Independent read-only Codex reviewer followed the fleet model pin, reviewed the actual focused main/style changes and inspected the supplied PNG bytes at original resolution. The coordinator independently ran controls, gates, red proofs and process cleanup. Their bounds remain distinct.

## Reports

### Independent reviewer, verbatim

Focused review target: Git tree `73fffdbd322157a51a241c3c045e71c58fece76f` in `C:/Users/38909/Documents/github/platformer/.worktrees/roguelike-acceptance`, compared with previously reviewed tree `21454efd8a16ed62825e9f808d566f82c3ebe861`.

**F0 is resolved. No new material findings; no F1+ findings raised.** The reviewed product tree is clear for integration. Commit, main delivery, remote CI, and final cleanup remain the integration owner’s acceptance steps.

The repair at `src/main.js:209`, `src/main.js:218`, and `src/style.css:303` gives compact panels a smaller header and combined currency/navigation row. I inspected talent, inventory, loot, and shop captures at all three required viewports. The initial views now expose named cards; the 320px empty talent view also exposes its full first purchase control.

Adjacent behavior remains coherent:

- `src/main.js:222` distinguishes ordinary storage notices from warnings. Compact CSS hides only ordinary notices and default instructional feedback. I inspected the unsupported-version, corrupt-profile, and successful-purchase captures; their warnings and feedback remain visible.
- `src/main.js:306` initially focuses the loot dialog, preserving the named item at the top. `src/main.js:517` handles Tab and Shift+Tab from that dialog as well as from its buttons. The leave action retains an accessible description explaining consumption.
- Full accessible Back/Leave names remain at `src/main.js:212` despite shorter compact labels.
- Pending purchase disabling and `aria-busy` remain intact at `src/main.js:236` and `src/main.js:428`. The repair changes no persistence or simulation code, so the prior review and bounded transaction probes still apply.
- Outside the changed hunks, I rechecked the input-clear boundary at `src/input.js:30` and `src/input.js:107`.

I inspected every ready/contact/return sample in the six native actor strips at original resolution. Shield, spear, and vial poses remain distinct and attached on both facings. The bomb capture distinguishes flight, warning radius, and blast. The drops/merchant capture distinguishes equipment slots, consumables, embers, and the trader. These are renderer fixtures, not independent evidence of live combat timing.

Independent checks in this round:

- Inspected 26 PNGs listed below.
- Verified all 11 executable/style/font files checked match their built `dist/src/` counterparts.
- Verified `main.js`, `style.css`, and `render.js` SHA-256 values match those supplied by the owner.
- Confirmed executable files and tests have no diff against the specified final tree.
- Read the retained 98-test log: 98 passed, zero failed/skipped/cancelled.
- Inspected the menu, full-run, storage, visual-fixture, and F0 regression scripts. Gameplay progression uses keyboard events and menu clicks with read-only snapshots; renderer fixture mutations are confined to the isolated fixture page.

Owner-executed, not independently rerun: the complete check/build gates; 11-width title clicks; keyboard scrolling and action execution; the 93.53-second victory with 29 kills, 16 loot decisions, four purchases and three shops/relics; once-only banking of 55 embers; talent purchase/retry/reload checks; death settlement; storage-negative cases; baseline-red challenge proof; RAF measurements; and exact process cleanup. I found no contradiction between those reported outcomes, the inspected scripts, and the inspected captures.

Visual evidence binding: files under `output/playwright/roguelike/`; SHA-256 of the sorted UTF-8 manifest formatted as `filename + space + lowercase file SHA-256 + LF` is `b89fe27eeda91c76e2db4105fab3b36723fbb214692f01b53e4ec0c078dbe965`.

Inspected filenames: `corrupt-profile.png`, `death-320.png`, `future-profile.png`; `inventory-{1280,320,720}.png`; `loot-{1280,320,720}.png`; `native-{alchemist,lancer,shield}-{left,right}.png`; `native-bombs.png`; `native-drops-merchant.png`; `shop-{1280,320,720}.png`; `talents-earned-{320,720}.png`; `talents-empty-{1280,320,720}.png`; `victory-320.png`.

Limits remain explicit: this reviewer launched no browser/server and reran no full gate. Static captures cannot independently prove interaction timing or performance. Simultaneous cross-tab writes without Web Locks remain outside the documented fallback guarantee.

Read-only audit: this reviewer created or changed no files, Git state, servers, browser sessions, or persistent artifacts.

## Findings and disposition

F0 resolved by351c21a. The first named card now appears in compact talent, equipment, shop and loot panels; keyboard scrolling reveals full actions; ordinary duplicate copy shortens while warning/feedback semantics stay intact. No new material findings. R17 defect EW-R1 and its old-red/new-green challenge gate remain permanent; AGENTS now explicitly gates first-card hierarchy and keyboard scrolling for these panels.

## Verification

Combined check26JS/test98/build/diff green. Final built controls pass required three viewports and11 title widths; two actual input runs reach victory, and the final banking/talent/retry/reload sequence passes. Actual death banks one earned ember and retry retains it. Corrupt, unsupported and unavailable storage cases pass. Native sprite/effect/merchant states inspected by both owner and reviewer are bound to the manifest digest above and unchanged renderer SHA256 b9244682e5ccf1af1605252ddb1bd98b863551509fee9d42d869278ee155b59e. The source and built src files match. Every probe's finally cleanup reports exact owned processes gone and port4191 stopped.

Expected-red checks are deliberate: old easy baseline fails pressure; pre-F0 tree fails first-card bounds. An initial native fixture URL triggered a Markdown download and supplied no visual evidence; replacing it with isolated same-origin HTML fixed the instrument, after which every captured state was inspected. The work-doc checker initially rejected contracts.md outside its allowed names; preserving the same bytes as design.md passes all five units. No product repair or unrun check is hidden by these corrected diagnostics.

## Round outcome

Product accepted with no open material findings. Main delivery, remote CI and task-resource closure are recorded in the plan. Raw captures remain temporary until closure; this authored report and exact inspected-byte provenance remain permanent.
