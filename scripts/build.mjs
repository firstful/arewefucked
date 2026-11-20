import { buildSite } from './site.mjs';

const dist = await buildSite();
console.log(`Static site written to ${dist} (no status.json — that lives in blob storage)`);
