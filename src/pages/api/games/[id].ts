import type { APIRoute } from 'astro';
import { getGame } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id || '';
  const game = await getGame(id);
  if (!game) return Response.json({ error: 'Game not found.' }, { status: 404 });
  return Response.json({ game });
};
