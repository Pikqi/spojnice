# Matching Game

A small, mobile-friendly matching game for studying any subject. Games are
created from JSON, stored in Vercel Blob in production (or locally during
development), and shared with unguessable links.

## Technical recommendation

- **Frontend and server:** Astro with TypeScript and the Vercel adapter.
- **Persistence:** One private JSON Blob per game under the `games/` prefix.
  Local development falls back to the `data/` directory when
  `BLOB_READ_WRITE_TOKEN` is not set.
- **Data model:** one `games` row (`id`, title, description, column labels,
  visibility, created time) and many immutable `pairs` rows (`game_id`, left,
  right, position).

Main screens are the public directory, create/preview, share confirmation, and
the game setup/play/summary flow. There are no accounts or management links.

## Run locally

With Nix installed:

```sh
nix-shell
pnpm install
pnpm dev
```

The development server always binds to `0.0.0.0` on port `4321`, making it
available to other devices on the network.

When running locally without Blob storage, each game is stored at
`data/<id>.json`. Set `DATA_DIR` to place the game files elsewhere. Older
installations using `data/games.json` remain readable.
Production can be run with `pnpm build` followed by
`node ./dist/server/entry.mjs`.

## Vercel Blob storage

Create a Blob store in Vercel, link it to the project, and add its
`BLOB_READ_WRITE_TOKEN` environment variable to the Vercel Production,
Preview, and Development environments. Redeploy after adding the variable.

Games are stored as private Blobs, and the application reads them server-side
through its API. The Blob token must never be exposed to browser code.
