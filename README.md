# The Velvet Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/rizkyptrp/best-heist-game-20261122-0559/blob/main/LICENSE)
[![Made for make.fun](https://img.shields.io/badge/make.fun-best--heist--game-7c5cff)](https://make.fun/c/best-heist-game-20261122-0559)
[![Node 22](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org)

A top-down stealth heist in a museum after midnight. You are Vesper, a thief
with a velvet touch: cross three galleries under sweeping guard cones and
rotating security cameras, steal the ★ TARGET piece in each room, and slip
out the green exit before the alarm meter fills.

## The heist

- **Gallery I — The Painted Hall.** Two patrolling guards, one camera, the
  Star Sapphire Portrait on the far wall.
- **Gallery II — The Gem Vault.** Three guards, two cameras, the Heart of the
  Mountain gem on its plinth.
- **Gallery III — The Grand Vault.** Four guards, three cameras, the Crown of
  Vesna — and one clean run to take it.

## How to play

| Input | Does |
| --- | --- |
| WASD / arrow keys | Move quietly |
| 1 / 2 / 3 (or Q to cycle) | Choose a tool: EMP Pulse, Smoke Bomb, Noisemaker |
| E or Space | Use the chosen tool |
| Click | Throw the noisemaker at that spot (or drop smoke there) |
| M | Mute |

**The rules of the room:**

- Yellow cones are guard sight, red cones are cameras. Walls and display
  cases block sight; smoke clouds block it too.
- Being watched fills the **ALARM** meter. Hide and it drains. A full meter
  means caught: one life lost, back to the door, the meter reset to 30.
- **EMP Pulse** kills every camera nearby for 6 seconds. **Smoke Bomb** lays
  a cloud no eye can see through. **Noisemaker** pulls nearby guards to the
  sound. Every tool costs a charge — blue crates around the rooms restock you.
- Loot is yours by touch. The ★ TARGET piece unlocks the exit; the rest is
  bonus money. Finish a room fast for a time bonus.
- Three lives. Lose them all and the vault keeps its secrets.

## Build

No build step, no libraries, no network. Plain static files under `game/`,
Canvas 2D and synthesized WebAudio (every sound is made by oscillators, so
there are no audio files to fetch). Serve `game/` with any static server and
open `game/index.html` in a desktop browser:

```sh
node serve.ts   # or: npx serve game
```

Screenshots are posed with `?shot=cover`, `?shot=tools` and `?shot=win`,
which freeze the real game into the exact frame each shot needs.

## Layout

- `game/js/main.js` — game loop and screen state machine
- `game/js/levels.js` — the three rooms: walls, loot, patrols, cameras
- `game/js/guards.js` — patrols, vision cones, line-of-sight
- `game/js/cameras.js` — sweeping camera cones and EMP blackouts
- `game/js/thief.js` — movement, wall sliding, the three tools
- `game/js/alarm.js` — the alarm meter
- `game/js/render.js` — everything drawn, including the HUD
- `game/js/audio.js` — synthesized sounds and the alarm's heartbeat
- `game/js/input.js` — keyboard and mouse
- `game/js/shots.js` — deterministic screenshot poses
- `main.ts` — hands the game in: copies `game/` and `screenshots/` and
  writes `dossier.json` with the vendored make.fun library

## License

MIT — see [LICENSE](https://github.com/rizkyptrp/best-heist-game-20261122-0559/blob/main/LICENSE).
