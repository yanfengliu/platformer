# Emberwake module contract

Original browser game inspired by the movement and combat loop of Dead Cells, using authored Canvas pixel art and generated audio. No copied game assets. Node 24, ES modules, zero runtime dependencies. Native game resolution is 640 × 360, rendered with nearest-neighbor scaling.

## Owners and files

Core worker owns `src/game.js`, `src/world.js`, and `tests/game.test.js`. Visual worker owns `src/render.js` only. App worker owns `index.html`, `src/main.js`, `src/input.js`, `src/audio.js`, `src/style.css`, `package.json`, lockfile if needed, `.nvmrc`, `scripts/`, `.github/`, README, and local AGENTS.md. Coordinator owns planning, integration, review records, and devlog. Workers use their assigned worktree and communicate changes to this contract before adopting them.

## Core API

`createGame(seed = number)` returns a plain state object. `updateGame(game, input, dt)` advances by seconds, normally 1/120. `chooseUpgrade(game, id)` applies an offered upgrade. `drainEvents(game)` returns and clears events. Named exports include these functions and `UPGRADES`. No DOM imports in core.

Input has held booleans `left`, `right`, `jumpHeld`, `downHeld` and edge booleans `jumpPressed`, `attackPressed`, `rollPressed`, `healPressed`, `interactPressed`. Edge actions must be consumed once across fixed steps. Input may contain `attackHeld` as optional convenience; attack must work on a press.

State fields: `seed`, `mode` (`playing`, `choice`, `dead`, `won`), `time`, `floor` (1-based), `kills`, `gold`, `combo`, `bestCombo`, `upgrades` (chosen IDs), `offer` (objects with `id`, `name`, `description`), `player`, `world`, `enemies`, `projectiles`, and `events`. Optional fields can be added compatibly. A run has three generated floors, ending with a boss and a won screen; death can restart with a new seed.

Player and enemies use world pixel positions `x`, `y`, `w`, `h`, `vx`, `vy`, `facing` (-1 or 1), `hp`, `maxHp`, `grounded`, `invulnerable`, `hurtTime`, `attackTime`, `attackDuration`, `rollTime`, and `combo` when relevant. Player includes `flasks` and `maxFlasks`. Enemy includes stable `id`, `type` (`walker`, `archer`, `brute`, `boss`), `state`, `windup`, and `dead`. Timers count down in seconds. Missing optional entity fields are read as 0 by the renderer. Attack animation is active when `attackTime > 0` and progress is `1 - attackTime / attackDuration`.

World contains `width`, `height`, `platforms` (`x,y,w,h,oneWay`), `rooms` (`x,w,kind,index`), `exit` (`x,y,w,h,locked`), `pickups` (`x,y,type`), and optional `decor`. Solid floor is guaranteed. Rooms mix combat, traversal, and a relic choice; reaching an unlocked exit and pressing interact advances floors. Relic choices use game.mode=choice and game.offer. World generation must be reproducible and its traversable routes verified.

Projectiles use `x,y,vx,vy,w,h,type,owner`. Events use `type`, `x`, `y` and optional `amount`, `direction`, `target`. Supported event types: `attack`, `hit`, `damage`, `kill`, `jump`, `land`, `roll`, `heal`, `pickup`, `upgrade`, `boss`, `complete`. A hit event is emitted once per successfully damaged enemy per attack, with impact position, damage amount, and direction. Events drive sounds, sparks, damage text, hit-stop, and camera shake; core itself can own a short hit-stop timer.

## Renderer API

`createRenderer(canvas)` returns `{ render(game, dt, events = [], options = {}), destroy() }`. Renderer sets canvas native dimensions to 640×360. It owns its camera and bounded transient particles. It draws the world and actors even on title/paused screens. Options include `reducedMotion` and `paused`. Render gracefully handles an empty event list and absent optional state fields. HUD and menus belong to app; in-world enemy health, attack telegraphs, pickups, exit labels, and environmental details belong to renderer.

## App and verification

App starts with an authored title overlay above a visible dungeon scene. Start/retry, pause/resume, mute, help, upgrade selection, floor change, death, and victory work by keyboard and accessible DOM buttons. Controls: A/D or arrows move; Space/W/Up jump; J/left click attack; K/Shift/right click roll; F heal; E interact; Escape pause. Include a compact persistent controls legend and a small minimap or floor progression display.

App has one requestAnimationFrame loop, capped accumulator, fixed simulation steps, blur/visibility input clearing and pause, input press buffering across frames, and generated WebAudio only after user action. `window.__EMBERWAKE__` may expose read-only debug inspection and the existing game API for diagnostics; production gameplay must use actual controls. No state-based harness can substitute for control-path verification.

`npm test` runs meaningful simulation/world invariants via node:test. `npm run check` checks JavaScript syntax and local build contracts. `npm run build` creates a static dist. `npm run dev` serves localhost headlessly, default port 4173. Dependency audit is required if dependency manifests change. Verification includes deterministic generation, collision, coyote time/jump buffering, roll immunity, one hit per attack, recovery/death, upgrade choice, floor progression, boss victory, and real browser keyboard flows at 1280×800 and a smaller viewport. Browser evidence is ignored and deleted after acceptance; all task-owned browser/server processes are closed.
