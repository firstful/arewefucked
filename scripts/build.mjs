import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from './collect.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const snapshot = await collect();

await mkdir(path.join(dist, 'data'), { recursive: true });
await writeFile(path.join(dist, 'data', 'status.json'), JSON.stringify(snapshot, null, 2));
for (const file of ['index.html', 'styles.css', 'app.js']) {
  await copyFile(path.join(root, 'public', file), path.join(dist, file));
}

const tally = snapshot.services.reduce((acc, s) => {
  acc[s.status.state] = (acc[s.status.state] || 0) + 1;
  return acc;
}, {});
console.log(`Built ${snapshot.services.length} services at ${snapshot.generatedAt}`);
console.log(JSON.stringify(tally));
