# best-spot-the-difference-game-20261121-0451

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Bedos24/best-spot-the-difference-game-20261121-0451/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Bedos24/best-spot-the-difference-game-20261121-0451/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

**Twin Meadows — Spot the Difference.** Two near-identical pictures of a cottage meadow sit side by side; the right-hand one hides a handful of sneaky changes — a vanished bird, a recoloured roof, a cat that wandered in, a shirt missing from the laundry line. Click a change in either picture to ring it on both, watch the "to find" counter fall, and clear the round for a time bonus.

Every scene is generated from a seed: the cottage, tree, pond boat, laundry, fence, flowers and sky are drawn item by item on canvas, then the altered twin changes exactly one thing about a few items, so no two rounds play alike. Rounds grow from 5 differences to 11 across three scenes — Morning, Golden Hour and Starlight — with streak scoring, two hints per round, wrong-click penalties, synthesized WebAudio sounds (no audio files), and full keyboard play (arrow keys move a ring cursor, Enter checks the spot, Tab swaps pictures, H hints, R restarts).

## Run it

```sh
node serve.ts   # then open http://localhost:8080 in a desktop browser
```

The game is plain static files under `game/` with no build step and no network requests — any static file server works, and `game/index.html` is the entry point. To hand the entry in the way the grader runs it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library in `vendor/makefun-game.ts`.

## How to play

- Click a difference in **either** picture; a red ring marks it on both and the counter drops.
- Each find scores 100 points, consecutive finds build a streak bonus, a wrong click costs 25.
- Stuck? A hint makes one difference glimmer — two hints per round, 150 points each.
- Find them all to finish the round and earn a time bonus, then move to the next scene.

---

<sub>Entered on [make.fun](https://make.fun/?ref=cqr5rs5e&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
