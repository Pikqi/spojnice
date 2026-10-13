# Matching Game

A small, mobile-friendly matching game for studying any subject. Games are
created from JSON, stored locally, and shared with unguessable links.

## Technical recommendation

- **Frontend and server:** Astro with TypeScript and the Astro Node adapter.
- **Persistence:** One atomic JSON file per game in the local `data/` directory.
  It is deliberately dependency-free for the first version and can later be
  replaced with a hosted database without changing the game model.
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

Each game is stored at `data/<id>.json`. Set `DATA_DIR` to place the game files
elsewhere. Older installations using `data/games.json` remain readable.
Production can be run with `pnpm build` followed by
`node ./dist/server/entry.mjs`.
