// Fetch every status feed once, write one JSON file, optionally upload it.
// The static site reads only that JSON — no per-visitor API calls.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collect } from './collect.mjs';
import { upload } from './upload.mjs';

const out = path.resolve(process.env.STATUS_OUT || '.cache/status.json');
let previous = [];
try {
  previous = JSON.parse(await readFile(out, 'utf8')).services || [];
} catch {
  // First run — no previous snapshot to fall back to.
}
const snapshot = await collect(previous);

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot));

if (await upload(out)) {
  console.log(`Published ${snapshot.services.length} services to blob storage at ${snapshot.generatedAt}`);
} else {
  console.log(`Wrote ${out} (${snapshot.services.length} services). Set BLOB_UPLOAD_CMD to upload.`);
}
