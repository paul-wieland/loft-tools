// Writes catalog.json: every tool folder with its manifest and the checksum of each of its files.
// Run from the repo root: node scripts/build-catalog.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function filesUnder(dir) {
  // Hidden files such as .DS_Store are machine-specific, so they never belong in a tool.
  return readdirSync(dir).filter((name) => !name.startsWith('.')).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const tools = readdirSync(root)
  .filter((name) => statSync(join(root, name)).isDirectory() && !name.startsWith('.') && name !== 'scripts')
  .filter((name) => statSync(join(root, name, 'manifest.json'), { throwIfNoEntry: false }))
  .sort()
  .map((name) => {
    const dir = join(root, name);
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    const files = filesUnder(dir).map((file) => ({
      path: relative(dir, file).split('\\').join('/'),
      sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    }));
    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description ?? '',
      icon: manifest.icon,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
    };
  });

writeFileSync(join(root, 'catalog.json'), JSON.stringify({ tools }, null, 2) + '\n');
console.log(`catalog.json: ${tools.length} tools`);
