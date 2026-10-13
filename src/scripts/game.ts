type Pair = { left: string; right: string };
type Game = { id: string; title: string; description: string; leftColumnLabel: string; rightColumnLabel: string; pairs: Pair[] };
type Item = { id: number; text: string; side: 'left' | 'right' };

const app = document.querySelector<HTMLElement>('#game-app');
const loading = document.querySelector<HTMLElement>('#game-loading');
const error = document.querySelector<HTMLElement>('#game-error');
const setup = document.querySelector<HTMLElement>('#setup-screen');
const play = document.querySelector<HTMLElement>('#play-screen');
const summary = document.querySelector<HTMLElement>('#summary-screen');
let game!: Game;
let rounds: Pair[][] = [];
let roundIndex = 0;
let mistakes = 0;
let matched = new Set<number>();
let selected: Item | null = null;
let roundStartedAt = 0;

const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};

function show(which: HTMLElement | null) {
  [setup, play, summary].forEach((screen) => { if (screen) screen.hidden = screen !== which; });
  if (loading) loading.hidden = true;
}

function renderSetup() {
  if (!setup) return;
  const options = [4, 6, 8, 10].filter((size) => size < game.pairs.length).concat(game.pairs.length).filter((size, index, values) => values.indexOf(size) === index).sort((a, b) => a - b);
  setup.innerHTML = `
    <p class="eyebrow">Before you begin</p><h1>${escapeHtml(game.title)}</h1>
    ${game.description ? `<p class="lede">${escapeHtml(game.description)}</p>` : ''}
    <div class="setup-card"><h2>How many pairs per round?</h2><p class="muted">All ${game.pairs.length} pairs will appear once across the session.</p>
      <div class="round-options">${options.map((size, index) => `<label class="round-choice"><input type="radio" name="round-size" value="${size}" ${index === 0 ? 'checked' : ''}/><span>${size}<small>${size === game.pairs.length ? 'all pairs' : 'per round'}</small></span></label>`).join('')}</div>
      <button id="start-game" class="button" type="button">Start matching <span aria-hidden="true">→</span></button>
    </div>`;
  setup.querySelector('#start-game')?.addEventListener('click', startGame);
  show(setup);
}

function startGame() {
  const size = Number(setup?.querySelector<HTMLInputElement>('input[name="round-size"]:checked')?.value || game.pairs.length);
  const shuffled = shuffle(game.pairs);
  rounds = [];
  for (let index = 0; index < shuffled.length; index += size) rounds.push(shuffled.slice(index, index + size));
  roundIndex = 0; mistakes = 0; matched = new Set(); selected = null; roundStartedAt = Date.now();
  renderRound();
}

function renderRound() {
  const pairs = rounds[roundIndex];
  matched = new Set(); selected = null;
  const leftItems = shuffle(pairs.map((pair, id) => ({ id, text: pair.left, side: 'left' as const })));
  const classification = hasRepeatedRightAnswers();
  const rightItems = classification
    ? shuffle(uniqueRightItems())
    : shuffle(pairs.map((pair, id) => ({ id, text: pair.right, side: 'right' as const })));
  if (!play) return;
  play.innerHTML = `
    <div class="play-top"><div><p class="eyebrow">Round ${roundIndex + 1} of ${rounds.length}</p><h1>${escapeHtml(game.title)}</h1></div><div class="mistakes"><span aria-hidden="true">✕</span> <strong id="mistake-count">${mistakes}</strong> mistakes</div></div>
    <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${game.pairs.length}" aria-valuenow="${roundIndex * (rounds[0]?.length || 0)}"><span style="width:${Math.round((roundIndex / rounds.length) * 100)}%"></span></div>
    <p id="game-feedback" class="game-feedback" role="status">Select an item from either column, then select its match.</p>
    <div class="game-board"><div class="game-column"><h2>${escapeHtml(game.leftColumnLabel)}</h2><div id="left-items" class="item-list">${leftItems.map(itemButton).join('')}</div></div><div class="game-column"><h2>${escapeHtml(game.rightColumnLabel)}</h2><div id="right-items" class="item-list">${rightItems.map(itemButton).join('')}</div></div></div>`;
  [...play.querySelectorAll<HTMLButtonElement>('.match-item')].forEach((button) => button.addEventListener('click', () => choose(button)));
  show(play);
}

function itemButton(item: Item) {
  return `<button class="match-item" type="button" data-id="${item.id}" data-side="${item.side}">${escapeHtml(item.text)}<span class="item-mark" aria-hidden="true"></span></button>`;
}

function choose(button: HTMLButtonElement) {
  if (button.disabled || !play) return;
  const item: Item = { id: Number(button.dataset.id), side: button.dataset.side as 'left' | 'right', text: button.textContent || '' };
  if (!selected) { selected = item; button.classList.add('selected'); button.setAttribute('aria-pressed', 'true'); setFeedback('Now select its match.', ''); return; }
  if (selected.side === item.side) {
    play.querySelectorAll<HTMLButtonElement>('.match-item.selected').forEach((candidate) => {
      candidate.classList.remove('selected');
      candidate.setAttribute('aria-pressed', 'false');
    });
    selected = selected.id === item.id ? null : item;
    if (selected) {
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
    }
    setFeedback(selected ? 'Now select its match.' : 'Selection cleared.', '');
    return;
  }
  const first = selected;
  const isCorrect = isMatch(first, item);
  const firstButton = play.querySelector<HTMLButtonElement>(`.match-item[data-id="${first.id}"][data-side="${first.side}"]`);
  const buttons = [firstButton, button].filter((candidate): candidate is HTMLButtonElement => candidate !== null);
  buttons.forEach((candidate) => candidate.classList.add(isCorrect ? 'correct' : 'incorrect'));
  if (isCorrect) {
    const pairId = first.side === 'left' ? first.id : item.id;
    matched.add(pairId);
    selected = null;
    buttons.forEach((candidate) => {
      const shouldDisable = candidate.dataset.side === 'left' || !hasRepeatedRightAnswers();
      if (shouldDisable) {
        candidate.disabled = true;
        candidate.setAttribute('aria-label', `${candidate.textContent} — matched ✓`);
      }
    });
    updateProgress();
    setFeedback('Correct! ✓', 'positive');
    if (matched.size === rounds[roundIndex].length) window.setTimeout(roundComplete, 650);
  } else {
    mistakes += 1; selected = null;
    const count = play.querySelector('#mistake-count'); if (count) count.textContent = String(mistakes);
    setFeedback('Not a match — try again. ✕', 'negative');
    window.setTimeout(() => buttons.forEach((candidate) => { candidate.classList.remove('incorrect', 'selected'); }), 650);
  }
}

function hasRepeatedRightAnswers() {
  return new Set(game.pairs.map((pair) => normalize(pair.right))).size < game.pairs.length;
}

function uniqueRightItems(): Item[] {
  const seen = new Set<string>();
  return rounds[roundIndex].reduce<Item[]>((items, pair, index) => {
    const key = normalize(pair.right);
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ id: index, text: pair.right, side: 'right' });
    }
    return items;
  }, []);
}

function isMatch(first: Item, second: Item) {
  if (hasRepeatedRightAnswers()) {
    const left = first.side === 'left' ? first : second;
    const right = first.side === 'right' ? first : second;
    return normalize(rounds[roundIndex][left.id]?.right || '') === normalize(right.text);
  }
  return first.id === second.id;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function roundComplete() {
  if (roundIndex < rounds.length - 1) {
    const next = document.createElement('div'); next.className = 'round-complete';
    next.innerHTML = `<div class="success-icon">✓</div><h2>Round complete!</h2><p>Nice work. Ready for the next set?</p><button class="button" type="button">Next round <span aria-hidden="true">→</span></button>`;
    play?.append(next); next.querySelector('button')?.addEventListener('click', () => { roundIndex += 1; renderRound(); });
  } else renderSummary();
}

function updateProgress() {
  const progress = play?.querySelector<HTMLElement>('.progress-track');
  if (!progress) return;
  const totalMatched = rounds.slice(0, roundIndex).reduce((total, round) => total + round.length, 0) + matched.size;
  const totalPairs = rounds.reduce((total, round) => total + round.length, 0);
  const percentage = Math.round((totalMatched / totalPairs) * 100);
  progress.setAttribute('aria-valuenow', String(totalMatched));
  const bar = progress.querySelector<HTMLElement>('span');
  if (bar) bar.style.width = `${percentage}%`;
}

function renderSummary() {
  if (!summary) return;
  const duration = Math.max(1, Math.round((Date.now() - roundStartedAt) / 1000));
  summary.innerHTML = `<div class="success-icon" aria-hidden="true">✓</div><p class="eyebrow">Session complete</p><h1>Well matched.</h1><p class="lede">You matched all ${game.pairs.length} pairs in ${rounds.length} round${rounds.length === 1 ? '' : 's'}.</p><div class="summary-stats"><div><strong>${mistakes}</strong><span>mistakes</span></div><div><strong>${duration}s</strong><span>time played</span></div></div><button id="play-again" class="button" type="button">Play again <span aria-hidden="true">↻</span></button>`;
  summary.querySelector('#play-again')?.addEventListener('click', renderSetup); show(summary);
}

function setFeedback(message: string, mood: string) { const feedback = play?.querySelector('#game-feedback'); if (feedback) { feedback.textContent = message; feedback.className = `game-feedback ${mood}`; } }
function escapeHtml(value: string) { const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }; return value.replace(/[&<>'"]/g, (character) => entities[character] || character); }

async function load() {
  try {
    const response = await fetch(`/api/games/${encodeURIComponent(app?.dataset.gameId || '')}`);
    if (!response.ok) throw new Error('This game could not be found.');
    const data = await response.json() as { game: Game }; game = data.game; renderSetup();
  } catch (loadError) { if (loading) loading.hidden = true; if (error) { error.textContent = loadError instanceof Error ? loadError.message : 'Could not load game.'; error.hidden = false; } }
}
load();

export {};
