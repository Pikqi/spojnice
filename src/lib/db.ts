import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameInput, Visibility } from './validation';

export type StoredGame = GameInput & {
  id: string;
  visibility: Visibility;
  createdAt: string;
};

// The MVP intentionally uses a small JSON document instead of a native database
// driver. This keeps local development and deployment portable across Node ABIs.
// Writes are atomic so a process interruption cannot leave a half-written file.
const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
const dataFile = join(dataDir, 'games.json');
mkdirSync(dataDir, { recursive: true });

function readGames(): StoredGame[] {
  try {
    const value: unknown = JSON.parse(readFileSync(dataFile, 'utf8'));
    if (!Array.isArray(value)) return [];
    return value as StoredGame[];
  } catch {
    return [];
  }
}

function writeGames(games: StoredGame[]) {
  const temporaryFile = `${dataFile}.tmp`;
  writeFileSync(temporaryFile, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
  renameSync(temporaryFile, dataFile);
}

export function insertGame(id: string, input: GameInput, visibility: Visibility): StoredGame {
  const game: StoredGame = {
    ...input,
    description: input.description || '',
    id,
    visibility,
    createdAt: new Date().toISOString(),
  };
  writeGames([...readGames(), game]);
  return game;
}

export function getGame(id: string): StoredGame | null {
  return readGames().find((game) => game.id === id) || null;
}

export function listPublicGames(query = ''): StoredGame[] {
  const search = query.trim().toLocaleLowerCase();
  return readGames()
    .filter((game) => game.visibility === 'public')
    .filter((game) => !search || game.title.toLocaleLowerCase().includes(search) || (game.description || '').toLocaleLowerCase().includes(search))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}
