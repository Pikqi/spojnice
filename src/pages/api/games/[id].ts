import type { APIRoute } from 'astro';
import { getGame } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const id = params.id || '';
  const game = getGame(id);
  if (!game) return Response.json({ error: 'Game not found.' }, { status: 404 });
  return Response.json({ game });
};
