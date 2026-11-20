# arewefucked.xyz

Real status feeds, unserious commentary. A static site that reads **one JSON file**
published by a job every 15 minutes. No per-visitor API calls, no backend.

**The humor is commentary, not attribution.** "SUS" means a vendor's own status
feed reported a problem — not that a cyber attack was confirmed. Every card links
to the real status page.

## Flow

```
cron / Actions (every 15m)
  → npm run publish        # fetch all public feeds once, write one JSON
  → BLOB_UPLOAD_CMD        # aws s3 cp / rclone / curl / anything
  → blob storage
  → arewefucked.xyz fetches that single JSON
```

The site polls the JSON every 2 minutes (and on **↻ refresh**). If the blob has
not changed, nothing visually changes.

## Run locally

```bash
cd ~/susmeter
npm run build
python3 -m http.server 8080 -d dist
```

`npm run build` = `npm run publish` plus copying the static UI into `dist/`.
Node 18+, no npm dependencies.

## Publish the JSON

```bash
STATUS_OUT=dist/data/status.json \
BLOB_UPLOAD_CMD='aws s3 cp $FILE s3://bucket/status.json --cache-control no-store' \
npm run publish
```

`$FILE` expands to the generated JSON path. Any shell command works — `rclone
copyto`, `az storage blob upload`, `curl` with a signed URL, etc. Without
`BLOB_UPLOAD_CMD`, the JSON is only written locally.

Point the site at a different JSON URL by editing this tag in `public/index.html`
before building:

```html
<meta name="status-json" content="https://json.example.com/status.json" />
```

A cross-origin URL needs CORS (`Access-Control-Allow-Origin`) since the browser
fetches it. Same-origin (`./data/status.json`) avoids that entirely.

## Schedule it

`.gitea/workflows/publish.yml` runs every 15 minutes on Gitea Actions. If your
Gitea instance does not mirror `actions/checkout`, swap it for
`gitea.com/actions/checkout@v4`. For plain cron:

```cron
*/15 * * * * cd /home/reeds/susmeter && npm run publish >> publish.log 2>&1
```

## Files

- `src/catalog.js` — 57 services, feed URLs, product filters
- `src/normalize.js` — shared feed normalizer
- `scripts/collect.mjs` — fetches each unique feed once and normalizes
- `scripts/publish.mjs` — writes one JSON and uploads it
- `scripts/build.mjs` — publish + copy static UI to `dist/`
- `public/` — static UI (HTML/CSS/JS, no framework)

## Adding a service

Add `{ id, name, category, url, source }` to `src/catalog.js`. Supported source
types: `statuspage`, `aws`, `gcp`, `azure`, `hetzner`, `atom`, `rss`, `dodo`,
and `none` (shows "NO SIGNAL"). Use `filter` to scope shared feeds to one product.
