import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Bound: copies the complete authored static entry point; no transpiler or network.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
assert.equal(dirname(output), root, 'Build output must be the repository dist directory.');
for (const file of ['index.html', 'src/main.js', 'src/game.js', 'src/world.js', 'src/render.js', 'src/input.js', 'src/audio.js', 'src/style.css']) {
  assert.ok((await stat(resolve(root, file)).catch(() => undefined))?.isFile(), `Cannot build: ${file} is missing. Restore the complete Emberwake source.`);
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'index.html'), resolve(output, 'index.html'));
await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
const entry = await readFile(resolve(output, 'index.html'), 'utf8');
assert.ok(entry.includes('./src/main.js'), 'Built index must reference the copied source entry.');
console.log('Built dist/index.html and dist/src. Serve the dist directory on any static host.');
