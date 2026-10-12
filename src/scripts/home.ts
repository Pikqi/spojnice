type ListedGame = { id: string; title: string; description: string; pairs: Array<unknown> };

const list = document.querySelector<HTMLDivElement>('#game-list');
const search = document.querySelector<HTMLInputElement>('#game-search');
let requestNumber = 0;

function render(games: ListedGame[]) {
  if (!list) return;
  if (!games.length) {
    list.innerHTML = '<div class="empty-state"><span aria-hidden="true">⌕</span><h3>No public games found</h3><p>Try another search, or create the first game.</p></div>';
    return;
  }
  list.innerHTML = games.map((game) => `
    <a class="game-card" href="/games/${encodeURIComponent(game.id)}">
      <span class="card-kicker">${game.pairs.length} ${game.pairs.length === 1 ? 'pair' : 'pairs'}</span>
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description || 'A matching game ready to play.')}</p>
      <span class="card-arrow" aria-hidden="true">→</span>
    </a>`).join('');
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return value.replace(/[&<>'"]/g, (character) => entities[character] || character);
}

async function loadGames() {
  const current = ++requestNumber;
  if (list) list.innerHTML = '<p class="muted">Searching…</p>';
  try {
    const response = await fetch(`/api/games?q=${encodeURIComponent(search?.value || '')}`);
    if (!response.ok) throw new Error('Could not load games');
    const data = await response.json() as { games: ListedGame[] };
    if (current === requestNumber) render(data.games);
  } catch {
    if (list) list.innerHTML = '<div class="alert alert-error">Could not load public games. Please refresh and try again.</div>';
  }
}

let timeout: number | undefined;
search?.addEventListener('input', () => {
  window.clearTimeout(timeout);
  timeout = window.setTimeout(loadGames, 250);
});
loadGames();

export {};
