import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Bound: syntax, local module references, and the dependency-free static entry point.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Emberwake checks require Node 24. Use the version in .nvmrc.');
const required = ['index.html', 'src/style.css', 'src/main.js', 'src/input.js', 'src/audio.js', 'src/game.js', 'src/world.js', 'src/render.js', 'tests/game.test.js'];
for (const file of required) {
  assert.ok((await stat(resolve(root, file)).catch(() => undefined))?.isFile(), `Missing ${file}. Restore the complete Emberwake source before checking or building.`);
}

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (['.js', '.mjs'].includes(extname(path))) files.push(path);
  }
  return files;
}

const files = (await Promise.all(['src', 'scripts', 'tests'].map((directory) => filesIn(resolve(root, directory))))).flat();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `JavaScript syntax failed in ${file}: ${result.stderr || result.error?.message}`);
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    const path = resolve(dirname(file), match[1]);
    assert.ok((await stat(path).catch(() => undefined))?.isFile(), `${file} imports ${match[1]}, but that module is missing. Restore the module or correct the import.`);
  }
}

const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
assert.equal(manifest.type, 'module');
assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0, 'Keep browser runtime dependency-free.');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.match(html, /<canvas[^>]*id="game"/);
assert.match(html, /<script[^>]*type="module"[^>]*src="\.\/src\/main\.js"/);
assert.match(html, /href="\.\/src\/style\.css"/);
console.log(`Checked ${files.length} JavaScript files, local imports, and static entry point.`);
