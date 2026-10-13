import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { insertGame, listPublicGames } from '../../../lib/db';
import { validateGame, type Visibility } from '../../../lib/validation';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const games = (await listPublicGames(url.searchParams.get('q') || '')).map(({ visibility, ...game }) => ({ ...game, visibility }));
  return Response.json({ games });
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ errors: ['Request body must be valid JSON.'] }, { status: 400 });
  }
  if (!body || typeof body !== 'object') return Response.json({ errors: ['Request body must be an object.'] }, { status: 400 });
  const source = body as Record<string, unknown>;
  const visibility = source.visibility === 'public' || source.visibility === 'private' ? source.visibility as Visibility : null;
  if (!visibility) return Response.json({ errors: ['Choose public or private.'] }, { status: 400 });
  const result = validateGame(source.game);
  if (!result.ok) return Response.json({ errors: result.errors }, { status: 400 });

  let id = '';
  do {
    id = randomBytes(18).toString('base64url');
  } while (false);
  const game = await insertGame(id, result.value, visibility);
  return Response.json({ id: game.id, url: `/games/${game.id}`, game }, { status: 201 });
};
