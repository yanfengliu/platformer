# Platformer

## What this is

Emberwake is an original browser roguelike platformer with authored pixel art, precise movement, readable combat, local meta talents, and a complete three-floor run. It uses Node 24 and dependency-free ES modules, Canvas, and WebAudio. No commercial game assets, live-run saves, multiplayer, or external runtime services.

Local execution rules: [docs/policies/local-rules.md](docs/policies/local-rules.md).

## Fleet constitution

This repository inherits the generated [parent fleet canon](../AGENTS.md), whose versioned master is [fleet/FLEET.md](../fleet/FLEET.md). Keep repository rules here concise; do not duplicate or edit the fleet canon. Fleet self-improvement workflow: [../fleet/docs/skills/self-improvement/SKILL.md](../fleet/docs/skills/self-improvement/SKILL.md).

## Gates

- Node version: `.nvmrc` (Node 24).
- `npm ci --ignore-scripts` and `npm audit --omit=dev --audit-level=high` after manifest changes.
- `npm run check` for syntax, local module references, and static entry-point contracts.
- `npm test` for simulation/world invariants and input buffering.
- `npm run build` for the complete static artifact.
- `npm run dev` serves localhost:4173; `-- --dist` serves the built output. Stop task-owned servers during cleanup.
- Gameplay or visual changes need headless browser checks using real keyboard/mouse input and inspected rendered states at 1280×800, 720×560, and 320×640. Check both title actions fit the frame's inner clipping box (excluding borders) and are clickable at 320px and across compact breakpoints at 420px, 421px, 480px, 481px, 560px and 561px (640px height). Simulation tests and state mutation do not replace this gate.

## Invariants & boundaries

- `src/game.js` and `src/world.js` are DOM-free; game state follows [the shared design](docs/work/0_emberwake/design.md).
- Fixed simulation step is 1/120 second with a capped accumulator. Consume action edges once; clear input on pause, blur, and hidden documents.
- Renderer draws at 640 × 360 with nearest-neighbor scaling and bounded particles. Respect reduced-motion preferences.
- Audio begins after a user gesture and respects mute/pause. Do not add browser runtime dependencies or external asset fetches.
- Menus and controls remain keyboard accessible. Debug inspection is read-only; production play uses real controls.

## Conventions

Use the smallest coherent module change. Plans/reviews live under `docs/work/`; run evidence lives under ignored `output/` or `tmp/`. Preserve authored work and clean only task-owned temporary resources.
