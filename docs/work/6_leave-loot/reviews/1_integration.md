# Review 1: integration

## Target

Commit 405318e8c260153a58a561f2ae4cb34088d8feec against b333f2b4e1a858fa02819648f9c3ef8806d7b1eb. Only scripts/browser/leave-loot.mjs changes; the product source remains identical to round 0.

## Reviewers and coverage

gear_review independently inspected the bounded polling correction and ran its syntax check. It did not run the browser gate or repeat full product gates. Actual browser rerun remains the owner's evidence.

## Reports

### gear_review

No findings.

The correction at scripts/browser/leave-loot.mjs:37–46 waits for observed player distance instead of assuming 550ms is sufficient. It retains the strict requirement to exceed the 52px interaction radius, uses a 70px stopping margin, and bounds polling to 50 iterations of 50ms plus snapshot latency. The finally block releases the movement key even if observation fails.

Pickup preservation, unchanged inventory, fresh-E recovery and eventual equip assertions remain intact. Product source is unchanged. Failure output now includes useful coordinates and mode.

node --check scripts/browser/leave-loot.mjs passed. This focused review did not execute the browser gate or repeat product/full gates; the parent's real-browser rerun remains required evidence.

## Findings and disposition

No material findings. The owner accepted the correction because the same strict interaction-radius assertion now measures observed position rather than assuming a fixed travel time.

## Verification

One integrated main repeat reached Iron coat and preserved it but failed the fixed 550ms walk-away assertion. This invalidated that movement assumption; it did not invalidate the already-observed pickup preservation. The corrected gate has 50 bounded polls, the original >52px requirement and key cleanup. Syntax/static checks pass. Final actual-control rerun and CI are recorded in the plan.

## Round outcome

The test correction is accepted with no findings. Round 0's exact product review remains applicable because product source is unchanged. Final browser rerun must pass before acceptance closes.

## Final owner acceptance

The corrected gate passed against final main 405318e: three mouse/Escape/keyboard close cycles preserved Iron coat, actual walking left the interaction radius, E reopened that same item three times, and eventual equip succeeded. The run reached loot at 10.38 seconds and the merchant at 29.42 seconds. The title/talent/equipment and shop gates passed their full viewport matrix again. Main check covers 32 JavaScript files, all 108 tests and build pass, and dist source bytes match src. CI 38687901839 passed on 405318e. The final exact-process audit found zero owned browser/daemon/server/console processes and zero port 4194 listeners. The owner inspected these final main captures:

```text
leave-initial-320.png a64a5fde9cde404e0dfb5e4672e0867e26ebd7bfe3c5de52fa2e14b643177e5a
leave-actions-320.png 43a4f1611d934c8b4d3ec4f07e8c43f75da18804d3b78b591de8b68ea42ad258
shop-initial-720.png 6f2839aef1b2ced68e6f0df9336cbc0d6e0a87b74a38f059076288010ed0cf86
```
