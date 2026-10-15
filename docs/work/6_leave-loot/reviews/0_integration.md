# Review 0: integration

## Target

Clean product commit 043224fc386fbaf71f2d544d74d5addf6faea261 against base 4997bb5efc2a93b17db3b7a0864aa43ec9a75c03. Scope: loot preservation, copy, regression and browser gates, simulation policy and explicitly labelled historical review-format corrections.

## Reviewers and coverage

gear_review independently read the exact committed diff and relevant unchanged Escape/input/interaction code and ran focused simulation tests. The owner separately ran full gates, the negative control, actual mouse/keyboard acceptance and visual checks. The reviewer did not inspect new captures or run browsers/full gates.

## Reports

### gear_review

No material findings.

src/game.js:614–625 now marks gear collected only when equipped. Declining preserves the original pickup and closes the panel without duplicating gear or changing inventory.

src/main.js:329–340 clearly explains preservation for the current floor. The unchanged Escape path at src/main.js:81–90 calls the same decline operation.

Unchanged interaction selection at src/game.js:530–547 requires a fresh interaction edge. Buffer clearing at src/game.js:126–134, overlay input clearing at src/main.js:379, and edge/repeat handling in src/input.js prevent automatic reopening after closing.

The expanded regression at tests/gear-slots.test.js:125–163 covers all 13 catalog items, three consecutive declines, exact pickup preservation, unchanged inventory/stats, walking away and returning, and eventual equip with one displaced-item drop.

tests/helpers/run-policy.js:18 now avoids deliberately targeting gear the policy would decline, which is appropriate for persistent drops.

The historical review corrections retain their authored reports and explicitly acknowledge the missing initial-patch provenance.

Independent verification: node --test tests/gear-slots.test.js tests/roguelike.test.js passed all 22 tests. Working tree was clean at review completion.

Bounds: this review covers the exact committed diff, relevant unchanged Escape/input/interaction paths, and focused simulation tests. I read the new real-control browser gate but did not run it, inspect new captures, launch a browser/server, or rerun full gates. Browser layout, actual mouse/keyboard acceptance, full checks and remote CI remain separate owner evidence.

## Findings and disposition

No material findings or unresolved review items.

## Verification

Owner check covers 32 JavaScript files; all 108 tests and build pass. The catalog-wide leave/return regression fails against base 4997bb5 on collected=true and passes after repair. The four original tactical seeds still complete without changing their acceptance thresholds. The work-document structural gate passes all 7 units after explicitly labelled corrections to prior reviews; the original allocator rejection proved those omissions were detected.

Built seed-0 real controls reached Iron coat at 10.32 simulation seconds. Mouse Leave, Escape and keyboard Leave each preserved its exact pickup, resumed play without auto-reopening, allowed walking beyond the interaction radius and reopening the same item with E. The third return equipped it successfully. The run then reached a merchant at 27.91 seconds. Initial named cards and keyboard-scrolled actions in loot and shop were inspected at 1280×800,720×560,320×640. The retained menu gate passed both title actions' strict inner bounds and actual clicks at 320,420,421,480,481,560,561,720,1280px, plus talent/equipment cards, icons and keyboard scrolling at all three viewports. No page errors occurred; favicon.ico 404s match the inherited console condition.

Browser launch instrumentation forced windowsHide=true for owned helpers. Finally cleanup closed the named session and server; an exact recorded-process audit found zero browser/daemon/server/console processes and zero port 4194 listeners. Main delivery and CI are recorded in the plan at closure.

## Round outcome

Accepted with no material findings. Simulation coverage spans every catalog item with occupied slots; actual controls cover one real dropped item across all three viewports and close paths. No persistence or manifest changes require additional gates. Main integration must preserve the reviewed product tree and finish its required checks and CI before closure.

## Owner visual provenance

The owner inspected each of these actual rendered loot states. SHA256 binds the review to the inspected bytes; disposable PNGs are removed after acceptance.

```text
leave-initial-1280.png 3278b4fafa2586f01bec007d97bdbdca6013c39c361baa23a736c3f326590eaa
leave-initial-720.png d53ba64d896c5c4dde3c2cf33488ba8c98e6958fd9b37e5fd0371c302359dc4a
leave-initial-320.png b5e3c5e8c9f993651dad340bcc84a352a0ca3b6573f001e5cf83864de1888cdc
leave-actions-1280.png 046453d379ca2d5122027610df2386c72fe6f01c00d81363ab748846cdf374e4
leave-actions-720.png 3b4df2c72282ff908aaf27cb37b1f0b193b2ad604f95e3abc637f21e75c2b4d5
leave-actions-320.png 231208f2f2665d5bd371906c346034ae710dfa9bdd9b3ddca6d459484ac5d739
```
