// Twin Meadows — Spot the Difference: the hand-in program (program/v1).
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser, no build step, no network). This program delivers it the
// way the grader expects: it copies game/ and screenshots/ into the output
// directory and writes dossier.json there with buildDossier from the vendored
// make.fun library, so the dossier is exactly the one the library produces
// from those files.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsOut = join(outputDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
const shotsIn = join(repoRoot, 'screenshots');
if (existsSync(shotsIn)) {
  cpSync(shotsIn, shotsOut, { recursive: true });
}

// The caps mirror the sealed gate's own limits, so a hand-in this program
// writes is one the gate accepts: at most 4 screenshots of 256 KiB each, at
// most 993 entries and 48 MiB under game/, no game path over 1000 bytes, and
// the dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`Twin Meadows handed in: game/ + screenshots/ + dossier.json -> ${outputDir}`);
