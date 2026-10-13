# Repository instructions

## Setup and commands

- Enter the development environment with `nix-shell shell.nix`; it provides Node 24 and pnpm. Use pnpm, not npm.
- Install dependencies with `pnpm install`.
- Run the required verification commands with `pnpm check` and `pnpm build`.
- Run the dev server with `pnpm dev`; it is intentionally configured to bind to `0.0.0.0:4321`.
- There is no test or lint script currently; do not invent a test command when validating changes.

## Application wiring

- This is an Astro SSR app using the Node standalone adapter; routes live under `src/pages/`.
- `src/pages/index.astro` is the public directory, `src/pages/create.astro` is the builder/import flow, and `src/pages/games/[id].astro` is gameplay.
- Game APIs are `src/pages/api/games/index.ts` (list/create) and `src/pages/api/games/[id].ts` (read one game).
- Shared validation belongs in `src/lib/validation.ts`; persistence belongs in `src/lib/db.ts`.
- Browser behavior is split into `src/scripts/home.ts`, `src/scripts/create.ts`, and `src/scripts/game.ts`; shared visual styles are in `src/styles/global.css`.

## Persistence and data

- Games are stored as one atomic JSON file per game at `data/<id>.json`; `DATA_DIR` can relocate the data directory. Older `data/games.json` files remain readable for compatibility.
- `data/` is gitignored and local-only. Do not delete or overwrite existing game data while developing.
- Game records are immutable through the app: creation appends a record, while public browsing filters by `visibility` and search text.
- `public/example-game.json` is the canonical downloadable input example; keep it valid when changing the game schema.

## TypeScript/Astro details

- Type checking uses Astro’s strict configuration and is run by `pnpm check` (`astro check`). Keep server-only Node imports out of browser scripts.
- The client scripts are loaded from `.astro` pages and must remain browser-safe; add `export {}` when adding top-level TypeScript helpers that could collide across scripts.
- Keep the server host/port in `package.json` and `astro.config.mjs`; do not replace the configured `0.0.0.0:4321` binding with localhost-only defaults.
