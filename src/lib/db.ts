import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameInput, Visibility } from './validation';

export type StoredGame = GameInput & {
  id: string;
  visibility: Visibility;
  createdAt: string;
};

// Each game is a separate JSON file instead of using a native database driver.
// This keeps local development and deployment portable across Node ABIs and
// makes individual games easy to inspect and edit. Writes are atomic so a
// process interruption cannot leave a half-written file.
const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
const legacyDataFile = join(dataDir, 'games.json');
mkdirSync(dataDir, { recursive: true });

function gameFile(id: string): string | null {
  // IDs are generated from base64url. Rejecting other values also prevents a
  // request from escaping DATA_DIR when reading a game by URL.
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return join(dataDir, `${id}.json`);
}

function readGameFile(file: string): StoredGame | null {
  try {
    const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as StoredGame;
  } catch {
    return null;
  }
}

function readLegacyGames(): StoredGame[] {
  try {
    const value: unknown = JSON.parse(readFileSync(legacyDataFile, 'utf8'));
    return Array.isArray(value) ? value as StoredGame[] : [];
  } catch {
    return [];
  }
}

function readGames(): StoredGame[] {
  // Reading the old aggregate file keeps existing local installations
  // available. New writes never update it, and per-game files take precedence
  // if a game exists in both formats.
  const games = new Map<string, StoredGame>();
  for (const game of readLegacyGames()) {
    if (game && typeof game.id === 'string') games.set(game.id, game);
  }

  try {
    for (const entry of readdirSync(dataDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'games.json') continue;
      const game = readGameFile(join(dataDir, entry.name));
      if (game && typeof game.id === 'string') games.set(game.id, game);
    }
  } catch {
    // An unavailable or unreadable data directory behaves like an empty store.
  }

  return [...games.values()];
}

function writeGame(game: StoredGame) {
  const file = gameFile(game.id);
  if (!file) throw new Error('Invalid game ID.');
  const temporaryFile = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporaryFile, `${JSON.stringify(game, null, 2)}\n`, 'utf8');
  renameSync(temporaryFile, file);
}

export function insertGame(id: string, input: GameInput, visibility: Visibility): StoredGame {
  const game: StoredGame = {
    ...input,
    description: input.description || '',
    id,
    visibility,
    createdAt: new Date().toISOString(),
  };
  writeGame(game);
  return game;
}

export function getGame(id: string): StoredGame | null {
  const file = gameFile(id);
  if (!file) return null;
  return readGameFile(file) || readLegacyGames().find((game) => game.id === id) || null;
}

export function listPublicGames(query = ''): StoredGame[] {
  const search = query.trim().toLocaleLowerCase();
  return readGames()
    .filter((game) => game.visibility === 'public')
    .filter((game) => !search || game.title.toLocaleLowerCase().includes(search) || (game.description || '').toLocaleLowerCase().includes(search))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}
