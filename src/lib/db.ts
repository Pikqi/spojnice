import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { get, list, put } from '@vercel/blob';
import type { GameInput, Visibility } from './validation';

export type StoredGame = GameInput & {
  id: string;
  visibility: Visibility;
  createdAt: string;
};

// Each game is a separate JSON object. In production, objects are stored in a
// private Vercel Blob store. Local development keeps using files so the app can
// run without a Blob token and existing local data remains available.
const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
const legacyDataFile = join(dataDir, 'games.json');
const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const blobPrefix = 'games/';

if (!blobEnabled) mkdirSync(dataDir, { recursive: true });

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

function readLocalGames(): StoredGame[] {
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

function writeLocalGame(game: StoredGame) {
  const file = gameFile(game.id);
  if (!file) throw new Error('Invalid game ID.');
  const temporaryFile = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporaryFile, `${JSON.stringify(game, null, 2)}\n`, 'utf8');
  renameSync(temporaryFile, file);
}

function createGame(id: string, input: GameInput, visibility: Visibility): StoredGame {
  return {
    ...input,
    description: input.description || '',
    id,
    visibility,
    createdAt: new Date().toISOString(),
  };
}

async function readBlobGame(pathname: string): Promise<StoredGame | null> {
  try {
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    const value: unknown = JSON.parse(await new Response(result.stream).text());
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as StoredGame;
  } catch {
    return null;
  }
}

async function listBlobGames(): Promise<StoredGame[]> {
  const games: StoredGame[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: blobPrefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    const pageGames = await Promise.all(page.blobs.map((blob) => readBlobGame(blob.pathname)));
    games.push(...pageGames.filter((game): game is StoredGame => game !== null));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return games;
}

export async function insertGame(id: string, input: GameInput, visibility: Visibility): Promise<StoredGame> {
  const game = createGame(id, input, visibility);
  if (blobEnabled) {
    await put(`${blobPrefix}${id}.json`, `${JSON.stringify(game, null, 2)}\n`, {
      access: 'private',
      contentType: 'application/json',
    });
  } else {
    writeLocalGame(game);
  }
  return game;
}

export async function getGame(id: string): Promise<StoredGame | null> {
  const file = gameFile(id);
  if (!file) return null;
  if (blobEnabled) return readBlobGame(`${blobPrefix}${id}.json`);
  return readGameFile(file) || readLegacyGames().find((game) => game.id === id) || null;
}

export async function listPublicGames(query = ''): Promise<StoredGame[]> {
  const search = query.trim().toLocaleLowerCase();
  const games = blobEnabled ? await listBlobGames() : readLocalGames();
  return games
    .filter((game) => game.visibility === 'public')
    .filter((game) => !search || game.title.toLocaleLowerCase().includes(search) || (game.description || '').toLocaleLowerCase().includes(search))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}
