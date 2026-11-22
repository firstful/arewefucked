import { mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function buildSite() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dist = path.join(root, 'dist');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  const files = ['index.html', 'styles.css', 'app.js', 'normalize.js', 'logic.js', 'staticwebapp.config.json'];
  for (const file of files) {
    const from = (file === 'normalize.js' || file === 'logic.js') ? path.join(root, 'src', file) : path.join(root, 'public', file);
    await copyFile(from, path.join(dist, file));
  }
  return dist;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = await buildSite();
  console.log(`Static site written to ${dist}`);
}
