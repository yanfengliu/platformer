# A harder, richer roguelike

Status: active
Owner: Codex coordinator
Created: 2026-10-13
Updated: 2026-10-14

## Problem and outcome

The owner finds the current game too easy and requests enemy variety, a talent tree, merchants, varied drops and a fuller roguelike loop. Deliver readable tactical encounters and distinct randomized builds, with persistent talents earned across completed lives.

## Scope

Add shieldbearers, charging lancers and bomb-throwing alchemists alongside the four existing roles; varied encounters and elite pressure; run equipment, consumable drops and limited merchant stock; a nine-node talent tree with prerequisites; versioned local progression and end-of-run rewards. Retain precise input, three-stage sword feedback, original pixel art, three floors, dependency-free runtime and read-only debug inspection. No online services, copied assets or live-run save system.

## Approach

Use DOM-free content and simulation, a separate validated profile module, and existing semantic menus. Three isolated workers own core/content, presentation, and app/profile respectively. Agree exported contracts before parallel edits. The coordinator owns canonical progress, acceptance, independent review and main delivery. First milestone integrates the playable systems; a second closes balance, cross-system findings and final browser acceptance. No unattended loop without green milestone commits.

Baseline: main 52f8ec32f2a7326f7837f7e2e215a25810f39cb1, 59 existing tests and original pixel assets. The previous sword and raster gates remain applicable. The first diagnostic is the game's read-only snapshot plus real controls; it answers encounter, economy and menu behavior without production state setters.

## Acceptance criteria

- [x] Seven enemy roles have distinct silhouettes, telegraphs and effective attacks; new physical weapons animate on both facings and honor reduced motion.
- [x] A pinned naive attack-only policy is measurably challenged; a dodge-aware policy can complete a fresh three-floor run without state mutation.
- [x] Seeded encounters, rarity and equipment drops vary across seeds, preserve deterministic replay, and produce useful build differences.
- [x] Merchants have finite, affordable stock, reject invalid/duplicate/unaffordable purchases atomically, and show gold and current equipment.
- [x] Talent prerequisites, costs and effects work; earned embers persist through reload; purchases affect subsequent runs and corrupt/unsupported storage recovers safely.
- [x] Real keyboard/mouse flows cover loot, shop, talents, death, retry, reload and victory at required viewports; title breakpoint click gates remain green.
- [ ] Existing and added checks pass, visuals are inspected, integrated persistence/gameplay receives independent review, main is pushed and remote gates succeed.
- [ ] Task-owned processes, disposable output and worktrees are cleaned.

## Implementation steps

| Todo | Owner | Dependency | Progress |
|---|---|---|---|
| Contracts and canonical tracker | Coordinator | Baseline | Agreed; tracked |
| Enemy tactics, drops, economy, talent content | rogue_core | Contracts | Committed3298fb6;76checks/build green; old-red challenge control confirmed |
| New enemy/item/shop pixel presentation | rogue_art | Contracts | Committed46cb06f;72checks/build green; frozen weapons fail five motion checks |
| Profile, tree, loot/shop menus, input integration | rogue_app | Contracts | Committedbf313c7+351c21a compact repair;85checks/build green; Web Locks and stale-writer tests |
| Integrated simulation and balance gates | Coordinator + core worker | All implementations | Combined26JS/98tests/build/diff green twice; seed0naive25contacts/sixheals/oneflask versus baseline8/noheals/threeflasks |
| Headless real controls and visual acceptance | Coordinator | Integrated artifact | Complete: final run93.53s/29kills/16loot/four purchases/three shops/three relics; reward55 once, talentcost5/retry/reload; death banks1/retry retains; storage cases; native art inspected |
| Independent integrated review and repairs | rogue_review + scoped workers | Milestone revision | Round0 no new material finding; F0 old-red/new-green and native inspection complete; final focused review pending |
| Main, remote CI, docs and cleanup | Coordinator | Acceptance | Pending |

Attempt accounting: two conservative substantive repairs used (bomb alignment and F0 compact hierarchy); three remain across this work unit. Expensive full gates are serialized by coordinator grant. Headless launch instrumentation overrides windowsHide:false to true even for detached child helpers. Baseline CLI real controls entered the run, held J for700ms and observed stage3 with no page errors. The inspected1280×800 capture preserves the authored scene and numbered amber finisher. Finally cleanup verified exact owned browser/server process identities gone and port4191 stopped. This baseline verifies the acceptance instrument; it does not accept the new systems. Scoped workers confirmed interfaces, including a purchase remaining in the shop and profile storage separated from live-run state.

## Outcome

Local acceptance is complete on the integrated artifact; final review, main delivery and cleanup remain. Native ready/contact/return states for all three new actors and both facings were inspected at original pixels, plus bomb flight/warning/blast and rarity/merchant artwork. Render SHA256 b9244682e5ccf1af1605252ddb1bd98b863551509fee9d42d869278ee155b59e matches the worker commit and served build. Every src file matches dist bytes; original font digest5aa907fb583647c12f646a44e36410912285920f2ce53fe3ee771a077efbc163 is unchanged. The90-frame actual-control combat sample had median/p9516.70ms and max16.80ms; this is a bounded sample, not a general performance claim.

F0 proof: the recoverable pre-repair tree21454efd8a16ed62825e9f808d566f82c3ebe861 fails the320×640 first-talent gate (title492–516/buttonbottom584 outside inner98–312, expectedexit1); final built repair passes (title212–232/buttonbottom276). Final menus pass title bounds/clicks at11 widths and first cards/keyboard scroll at three required viewports. Initial visual fixture navigation to a Markdown file triggered a download instead of loading HTML; that invalid instrument was replaced by an isolated same-origin HTML fixture before captures were accepted. All finally paths, including that failed probe and both expected red controls, closed recorded owned processes and port4191.

Worker summaries distinguish implementation from verified integration. The goal stays active through final review, main delivery, remote checks and cleanup. Profile format1 preserves unsupported saved bytes, validates corrupt data and keeps storage-unavailable sessions playable. Web Locks serialize browser writes; the fallback protects sequential stale tabs and does not guarantee simultaneous cross-tab writes without Web Locks.
