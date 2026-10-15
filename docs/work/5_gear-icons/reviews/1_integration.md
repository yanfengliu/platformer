# Review 1: integration

## Target

Clean product commit 26d4a88f0029aa38527cc822f6f6b94a5a97db2f against base 044f8b2ed4fb91cec1829218ae6fa95e52f6b853. Independent read-only reviewer gear_review. This round covers all final product changes, including the F0 interaction repair.

## Authored report — gear_review

No material findings remain.

F0 is resolved. src/game.js:532–535 selects the closest horizontally eligible gear, relic or merchant while retaining the prior reach limits. src/game.js:598–607 places displaced gear 26px beside the player, clamps it onto a supporting platform and switches sides when an edge would place it too close. A merchant-centered purchase now leaves the merchant selectable; moving toward the drop makes that gear selectable without consuming it. The regression at tests/gear-slots.test.js:76–106 checks both outcomes for every gear type. The edge test at tests/gear-slots.test.js:138–150 covers both facing directions.

The final source/test changes preserve the three independent slots, copy displaced gear, maintain unique pickup IDs, recompute effects without stacking or healing, and reject invalid purchases before mutation. The shared immutable icon data covers the catalog and both merchant consumables; Canvas rendering uses cached pixels. No browser dependency or external asset fetch was introduced.

Unchanged integration paths inspected include src/game.js:101–122 (stat recomputation and health/flask caps); src/game.js:143–175 and src/world.js:17–45 (collision and generated platform geometry used by placement); src/game.js:645–650 (shop closure clears buffered actions); src/main.js:361–464 and src/main.js:524–548 (overlay reconstruction, retained scroll/focus, canvas return and keyboard focus trapping); and static build copying, which includes the new icon module.

Independent verification: all 9 focused transaction, atlas and Canvas integration tests passed. No full gates, servers or browsers were launched during this review.

I inspected seven supplied rendered captures. The 320px initial shop and loot views show their first named card and icon; their scrolled views expose actions. The equipment views show distinct type icons and explicit occupied capacity. The 720px loot and 1280px equipment views have no material clipping or layout concern.

Visual review binds to these SHA-256 digests under output/playwright/gear/:

```text
equipped-320.png  018584c6c88ad6f03e18a349b1e2b1b4b268940204331799df9eec217239fc2f
shop-320.png      c801ec55e19927014e742b0a2391600f1ad8561d72f6ff285743248e3075a8c7
shop-end-320.png  7f0688f9f5f15b26f25bda852547389e0c5e33e47b486c8fd2bec1d2094d31cc
loot-320.png      f920bf854422140709dd05d35ff08795a878ee3319175056a728bcd3d529f471
loot-end-320.png  4c1910f40914df0f6e7ff46de43416814f36ebaf0bdbb0f44d791c716cea1456
equipped-1280.png c7ea659bb4847191c4f012bb64631cc5a9000f7dc69a70179dd94da055bd7e00
loot-720.png      18a2809d2bc9aa86f6d27b71d15674bb8ab099a5bf46169ef8b6dc5b69c2b182
```

Bounds: this review independently verifies source integration, focused simulation/render tests and those static captures. The parent's real keyboard/mouse run, complete viewport matrix, individual artwork inspection, mutation controls, full gates and remote CI remain separate evidence; I did not rerun them.

## Owner acceptance

Accepted. F0 is resolved and no material finding remains. The separate full local gate passes 31 JavaScript checks, 107 tests and build. The retained real-control menu gate passes strict inner-frame title bounds and real clicks at nine widths, plus named cards, icons, capacity and keyboard scrolling at three required viewports. A seed-0 built real-control run proves four loot choices, three swaps, one shop purchase, merchant re-entry while gear survives, and recovery with E at 36.82 simulation seconds. The old core, old renderer, old menu UI and center-drop mutation all fail their corresponding regression gates as expected.

The owner separately inspected all 15 icon PNGs individually at their actual 48px menu size; initial and scrolled compact menus; all three required title states; and empty/occupied gear, loot and shop cards at the required sizes. The browser emitted no page errors. Console resource errors were inherited favicon.ico 404 responses, reproduced on the baseline and unrelated to the change. No persistence or dependency gate was required because neither manifest nor profile format changed. Final main delivery, remote CI and process cleanup are recorded in the plan.

## Additional owner visual provenance

Each named icon below was inspected individually. Title captures use 1280x800, 720x560 and 320x640 respectively. These digests identify the reviewed bytes; disposable PNGs are removed at closure.

```text
icon-ash-coat.png 378766acd8e229e9c040698b142d9c22b0eb7b480db1bf2f1101050862c784b4
icon-bloom-ring.png 30bf374327608f3a4f7f544037755e84200aa74b57338ebc883a896756a7313d
icon-ember-edge.png a4117b25783ceb22edba9bf5a5cf34dce8e84a472bed35dbedaed4b46d7501be
icon-flask.png b989b7c145d43b5d18dee8657e7442eb30466343da024206b40bdedd11a228f3
icon-heal.png f581992a9bfd559b24c85e023342203a6d605a9ee351ba08bfcbad2321065072
icon-iron-coat.png 229d971dd4d496eeae7a952724d9b42b77845b3703a26f94ee4c4f769f932345
icon-iron-edge.png 15038b4f7b17af000fa4d2c4529c8e155831612c4679a90b2c7209895c738a9a
icon-kiln-mail.png 17675b30082a5ff6664dd796c9d08da1c206461091424576842ad740843b60d8
icon-phoenix-ring.png 243ea089a96fb396ba415c28934303de851b5a9cbc5a0a64340a6310ca026e16
icon-quick-edge.png 60fad2223923d872b5420b175b1796fdf56972d02b784e425aa361645ae6ea7e
icon-red-seed.png 9739db9d2f207cf47849c2a95ff81ed0031ea01789e88e7d73d0b71df467369f
icon-step-stone.png c4b80b98f955bfc7a4e9e540efa53a2a8cc3bfbd8407472ab52034a6be923b4e
icon-sun-edge.png 979f19d73cee72af45fa2d3df2c4cc249ff6acd40d2edc3ef9a7f8ad38adbf9c
icon-swift-edge.png 79a70dbd53d23a5b1a7343d35a9266c396ef2b92fa312214fabd58b0e3955ec0
icon-warden-mail.png f8aeb51c73aba513c53fd4c94ba0614135c38c013cd221697e9fd27db5a68873
title-native-1280.png f395748a971a0a2c53f2e4e4e5ce372d7e93907b2c587e35963737793782dcea
title-native-320.png 5ab8c10af276c320eee52020ca763e319ca7dde204c0b6dcc2e8293a98b6f985
title-native-720.png ce9d2bac06825fa74de783d07ef8ea55dfd9832249a3d48dd71aefcac060f50b
```
