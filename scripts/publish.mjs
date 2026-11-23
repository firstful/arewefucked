// Fetch every status feed once, write one JSON file, optionally upload it.
// The static site reads only that JSON — no per-visitor API calls.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collect } from './collect.mjs';
import { upload } from './upload.mjs';

const out = path.resolve(process.env.STATUS_OUT || '.cache/status.json');
const PREV_URL = process.env.STATUS_PREV_URL || 'https://arewefcked.blob.core.windows.net/status/status.json';
let previousServices = [];
let previousIncidents = [];
// 1) Prefer a locally cached snapshot (dev runs).
try {
  const previous = JSON.parse(await readFile(out, 'utf8'));
  previousServices = previous.services || [];
  previousIncidents = previous.incidents || [];
} catch {
  // 2) On ephemeral CI runners the local cache is empty, so recover the last
  //    published snapshot from the blob. This keeps incident detectedAt/firstSeen
  //    stable across runs instead of resetting everything to "now".
  try {
    const res = await fetch(PREV_URL, { cache: 'no-store' });
    if (res.ok) {
      const previous = await res.json();
      previousServices = previous.services || [];
      previousIncidents = previous.incidents || [];
      console.log(`[susmeter] recovered previous snapshot from blob (${previousServices.length} services, ${previousIncidents.length} incidents)`);
    }
  } catch (error) {
    console.error(`[susmeter] could not recover previous snapshot: ${error?.message || error}`);
  }
}
const snapshot = await collect(previousServices, previousIncidents);

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot));

if (await upload(out)) {
  console.log(`Published ${snapshot.services.length} services / ${snapshot.incidents.length} tracked incidents to blob storage at ${snapshot.generatedAt}`);
} else {
  console.log(`Wrote ${out} (${snapshot.services.length} services, ${snapshot.incidents.length} incidents). Set BLOB_UPLOAD_CMD to upload.`);
}
