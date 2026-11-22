// main.ts — The Velvet Vault's hand-in program (Node 22, standard library
// only). It copies this repository's game/ and screenshots/ into the output
// directory and writes dossier.json there, the summary the judge reads,
// using the vendored make.fun library. It runs twice in the grader and
// both runs must write identical bytes, so it does nothing time-dependent:
// a fixed file order, the library's own canonical bytes, nothing else.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, as the kit's scorer states them: the dossier text
// holds at most 160 KiB of source, at most 4 screenshots of at most
// 256 KiB each, and game/ at most 993 entries and 48 MiB in all.
const dossierBytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
