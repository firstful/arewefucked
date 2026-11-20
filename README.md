# arewefucked.xyz

Real status feeds, blunt commentary. A static site on Azure Static Web Apps that
reads **one public JSON blob** published by a job every 15 minutes. The JSON is
never bundled into the SWA deployment.

**The humor is commentary, not attribution.** "DEGRADED" means a vendor's own
status feed reported a problem — not that a cyber attack was confirmed. Every
card links to the real status page.

## Flow

```
Gitea Actions (every 15m)
  → npm run build           # static UI only → dist/ (no status.json)
  → npm run publish         # fetch all feeds once → .cache/status.json
  → deploy-blob.mjs         # upload to Azure Blob + set CORS
  → swa deploy ./dist       # deploy static UI
  → browser fetches https://arewefcked.blob.core.windows.net/status/status.json
```

The site polls the JSON every 2 minutes. The JSON carries `timestamp`; the page
shows **"Last refresh: 11 minutes ago"**, re-humanized every 30 seconds.

If the publisher goes quiet for **>30 minutes**, a full-screen overlay says
**"oh fuck… we're flying blind"** and the stale cards are marked as history.
It can be dismissed for the current session.

Each service has an impact weight (`S` / `M` / `L` / `XL` / `XXL`). A small
service going down barely moves the alert level; a major GCP/AWS/Azure/Cloudflare
incident sends it to Level 1. Weights live in `src/catalog.js` and show as badges.

## Run locally

```bash
cd ~/susmeter
npm run build
STATUS_OUT=dist/data/status.json npm run publish
python3 -m http.server 8080 -d dist
```

On localhost the app reads `./data/status.json`; in production it reads the blob
URL from `meta[name="status-json"]`. Node 18+; local build has no dependencies.

## Azure wiring

Repo secrets: `AZ_BLOB_CONN_STRING`, `AZ_SWA_DEPLOY_TOKEN`.

Workflow: `.gitea/workflows/publish.yml` (cron `*/15 * * * *`, also manually
dispatchable). It uses `@azure/storage-blob` to upload/create the container and
set CORS for `arewefucked.xyz`, the SWA default hostname, and localhost.

If your Gitea does not mirror `actions/checkout@v4`, swap it for
`gitea.com/actions/checkout@v4`.

## Files

- `src/catalog.js` — ~100 services, feed URLs, filters, impact weights
- `src/normalize.js` — shared feed normalizer
- `scripts/collect.mjs` — fetches each unique feed once and normalizes
- `scripts/publish.mjs` — writes one JSON and uploads it
- `scripts/deploy-blob.mjs` — Azure Blob upload + CORS
- `scripts/site.mjs` — copies static UI to `dist/` (no JSON)
- `public/` — static UI (HTML/CSS/JS, no framework)

## Adding a service

Add `{ id, name, category, url, source }` to `src/catalog.js`. Supported source
types: `statuspage`, `aws`, `gcp`, `azure`, `hetzner`, `atom`, `rss`, `dodo`,
`apple`, `heroku`, `simple`, and `none` (shows "NO FEED"). Use `filter` to scope
shared feeds to one product.
