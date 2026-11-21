// Twin Meadows — Spot the Difference · the hand-in program (program/v1).
//
// The game itself is a static site in game/: no build step, no network, just
// open game/index.html in a desktop browser. This program is only the
// delivery van. It copies game/ and screenshots/ into the output directory
// and writes dossier.json there, produced by buildDossier from the vendored
// make.fun library, so the dossier is exactly the one the gate rebuilds from
// the same files.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// In the grader MAKEFUN_OUTPUT_DIR is unset and the target is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The whole game folder goes across as it stands.
mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });

// Screenshots ride along when the repo carries them.
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  const shotsOut = join(outDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  cpSync(shotsDir, shotsOut, { recursive: true });
}

// These limits mirror the sealed gate's own caps, so anything written here
// is already inside them: at most 4 screenshots of 256 KiB each, at most 993
// entries and 48 MiB under game/, no game path longer than 1000 bytes, and
// the dossier's text capped at 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`Twin Meadows handed in: game/ + screenshots/ + dossier.json -> ${outDir}`);
