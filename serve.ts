// A pocket static server for playing Twin Meadows locally:
//   node serve.ts   ->   http://localhost:8080
// It serves this directory's game/ folder and nothing else, because the
// game needs nothing else: no build, no network, no other files.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = join(fileURLToPath(new URL('.', import.meta.url)), 'game');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const port = Number(process.env.PORT ?? 8080);

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const rel = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
    const filePath = join(gameRoot, rel === '' ? 'index.html' : rel);
    if (!filePath.startsWith(gameRoot)) throw new Error('path escapes game/');
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
}).listen(port, () => {
  console.log(`Twin Meadows is playing at http://localhost:${port}`);
});
