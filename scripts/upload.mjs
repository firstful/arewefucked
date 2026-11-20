import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function upload(file) {
  const command = process.env.BLOB_UPLOAD_CMD;
  if (!command) return false;
  await run('/bin/sh', ['-c', command], {
    env: { ...process.env, FILE: file },
    stdio: 'inherit',
  });
  return true;
}
