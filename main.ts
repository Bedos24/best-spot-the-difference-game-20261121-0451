// Twin Meadows — Spot the Difference · hand-in program (program/v1).
//
// The game is a static site living in game/ (open game/index.html in a
// desktop browser and play; there is no build step and no network use).
// This program is the delivery mechanism for the gate: it copies game/
// — and screenshots/, when the repo carries them — into the output
// directory, then writes dossier.json there using buildDossier from the
// vendored make.fun library, so the dossier is built from exactly the
// files the gate will rebuild it from.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// With MAKEFUN_OUTPUT_DIR unset the output directory is /output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// The game folder crosses over exactly as it stands.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// Screenshots are optional cargo: take them when present.
const shotsHere = join(here, 'screenshots');
if (existsSync(shotsHere)) {
  const shotsOut = join(out, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  cpSync(shotsHere, shotsOut, { recursive: true });
}

// The caps passed to buildDossier mirror the sealed gate's own limits, so
// what is written here is already inside them: dossier text at most
// 160 KiB, at most 4 screenshots of 256 KiB apiece, at most 993 game
// entries totalling 48 MiB, and no game path longer than 1000 bytes.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, buildDossier(out, GATE_LIMITS));

// Report what actually landed: a file count and the dossier's size make
// gate-side surprises visible in this program's own log line.
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}
const fileCount = countFiles(out);
const dossierBytes = statSync(dossierPath).size;
console.log(`Twin Meadows handed in: ${fileCount} files, dossier.json ${dossierBytes} bytes -> ${out}`);
