# Emberwake

A playable original pixel-art roguelike platformer inspired by the movement and combat rhythm of Dead Cells. Descend through three generated floors, build a loadout from dropped gear and finite merchant stock, take relics, clear enemies to open each gate, and defeat the keeper. Death creates a new run and banks its earned embers for permanent talents.

The game uses authored Canvas pixel art and synthesized WebAudio. It runs entirely in the browser with no runtime dependencies, accounts, or network calls.

## Play locally

Use Node 24; `.nvmrc` pins the tested release. No dependency installation is needed to play.

```sh
npm run dev
```

Open [localhost:4173](http://127.0.0.1:4173). Click **Enter the keep**, or press Enter. The server binds to localhost and stops with Ctrl+C. Use `npm run dev -- --port 4174` to select another port.

Append `?seed=42` to the URL for a reproducible initial keep. Retry creates a fresh seed. The current seed appears in the lower right of the game.

## Controls

| Action | Input |
| --- | --- |
| Move | A/D or Left/Right arrows |
| Jump; double jump | Space, W, or Up; release early for a shorter jump |
| Sword combo | J or left click; hold to keep striking |
| Dodge roll | K, Shift, or right click |
| Heal | F |
| Use dropped gear, merchants, relics, or an open gate | E |
| Inspect equipment; pauses the run | I or Gear |
| Learn talents between lives | T or Talents |
| Close a panel / pause / resume | Escape |
| Mute / show controls | M / H |
| Choose a relic | 1, 2, 3, or click its card |

Attacks have clear windups. Shieldbearers block attacks from their front, lancers commit to spear charges, and alchemists leave warned bomb blasts. Roll through danger, preserve your flasks, and clear the floor before entering its gate. Gear fills blade, armor, and charm slots; taking or buying a new piece replaces the existing piece. Loot panels show the change, and merchant panels show current gold, finite stock, and equipment comparisons. Relics apply to the current run.

Gold and equipment start fresh each life. Defeated enemies and cleared floors earn run embers, which bank once at death or victory. The nine talents form Survival, Combat, and Fortune branches; learning one rank unlocks the next talent in its branch. Purchases apply to the next run. Banked embers and talent ranks are saved locally in this browser; there is no live-run save. The page explains when blocked storage limits progression to the session. Unsupported saved versions stay untouched, and invalid saves recover with a fresh validated profile.

All panels use keyboard-accessible buttons and scroll inside the game frame. Escape leaves a merchant, leaves a gear drop, or closes equipment and talents. Switching tabs or losing window focus pauses the game and clears held input. Reduced-motion preferences disable camera shake and animated UI transitions.

## Checks and static build

```sh
npm ci --ignore-scripts
npm audit --omit=dev --audit-level=high
npm run check
npm test
npm run build
npm run dev -- --dist
```

`check` verifies JavaScript syntax, local imports, and the static entry point. Tests cover simulation and world invariants, control-event buffering, talent transactions, and profile persistence failures. `build` copies the complete game to `dist/` for static hosting. CI repeats these gates on Node 24. Headless browser acceptance exercises actual controls, menus, and rendered states separately; unit tests alone do not verify visual quality or user input in a browser.

## Project boundaries

Native resolution is 640 × 360 with nearest-neighbor scaling. One animation loop drives a capped fixed simulation step at 120 Hz. The core has no DOM imports; the renderer owns the camera and transient visual effects; the app owns inputs, menus, HUD, audio, and browser lifecycle. Read-only diagnostic state is available at `window.__EMBERWAKE__.snapshot()` and `window.__EMBERWAKE__.game`; it is not a gameplay API.

This is a compact practice game with a complete three-floor run and local meta talents. Scope excludes copied commercial assets, multiplayer, live-run saves, external services, and a full commercial game's content volume. The shared module design and acceptance criteria live in [docs/work/0_emberwake/design.md](docs/work/0_emberwake/design.md).
