// Fetch every status feed once, write one JSON file, optionally upload it.
// The static site reads only that JSON — no per-visitor API calls.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collect } from './collect.mjs';

const run = promisify(execFile);
const out = path.resolve(process.env.STATUS_OUT || 'dist/data/status.json');
const snapshot = await collect();

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot));

if (process.env.BLOB_UPLOAD_CMD) {
  // e.g. BLOB_UPLOAD_CMD='aws s3 cp $FILE s3://bucket/status.json --cache-control no-store'
  await run('/bin/sh', ['-c', process.env.BLOB_UPLOAD_CMD], {
    env: { ...process.env, FILE: out },
    stdio: 'inherit',
  });
  console.log(`Published ${snapshot.services.length} services to blob storage at ${snapshot.generatedAt}`);
} else {
  console.log(`Wrote ${out} (${snapshot.services.length} services). Set BLOB_UPLOAD_CMD to upload.`);
}
