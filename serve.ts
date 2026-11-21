// Twin Meadows, served locally for a quick game:
//   node serve.ts        ->  http://localhost:8080
//   PORT=9000 node serve.ts   (a different port)
// Static files only, and only from game/ — the game asks for nothing else.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(rootDir, 'game');

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
]);

function fail(res) {
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  const target = join(gameDir, rel === '' ? 'index.html' : rel);
  // Refuse anything that would climb out of game/.
  if (!target.startsWith(gameDir)) return fail(res);
  try {
    const bytes = await readFile(target);
    res.writeHead(200, { 'content-type': MIME.get(extname(target)) ?? 'application/octet-stream' });
    res.end(bytes);
  } catch {
    fail(res);
  }
}

const port = Number(process.env.PORT ?? 8080);
createServer((req, res) => { void handle(req, res); })
  .listen(port, () => console.log(`Twin Meadows is playing at http://localhost:${port}`));
