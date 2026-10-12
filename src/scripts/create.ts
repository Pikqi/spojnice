import { validateGame, type GameInput } from '../lib/validation';

const form = document.querySelector<HTMLFormElement>('#create-form');
const file = document.querySelector<HTMLInputElement>('#json-file');
const input = document.querySelector<HTMLTextAreaElement>('#json-input');
const fileName = document.querySelector<HTMLSpanElement>('#file-name');
const errors = document.querySelector<HTMLDivElement>('#validation-errors');
const pairEditor = document.querySelector<HTMLDivElement>('#pair-editor');
const pairCount = document.querySelector<HTMLParagraphElement>('#pair-count');
const addPairButton = document.querySelector<HTMLButtonElement>('#add-pair');
const importJsonButton = document.querySelector<HTMLButtonElement>('#import-json');
const preview = document.querySelector<HTMLElement>('#preview-section');
const previewContent = document.querySelector<HTMLDivElement>('#preview-content');
const createButton = document.querySelector<HTMLButtonElement>('#create-button');
const createErrors = document.querySelector<HTMLParagraphElement>('#create-errors');
let currentGame: Required<GameInput> | null = null;
type PairDraft = { left: string; right: string };

let pairs: PairDraft[] = [
  { left: '', right: '' },
  { left: '', right: '' },
];

renderPairEditor();

function showErrors(target: HTMLElement | null, messages: string[]) {
  if (!target) return;
  target.hidden = messages.length === 0;
  target.innerHTML = messages.length ? `<strong>Please fix the following:</strong><ul>${messages.map((message) => `<li>${message}</li>`).join('')}</ul>` : '';
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return value.replace(/[&<>'"]/g, (character) => entities[character] || character);
}

function renderPairEditor() {
  if (!pairEditor) return;
  pairEditor.innerHTML = pairs.map((pair, index) => `
    <div class="pair-editor-row">
      <span class="pair-number" aria-hidden="true">${index + 1}</span>
      <label class="sr-only" for="pair-left-${index}">Pair ${index + 1} first answer</label>
      <input id="pair-left-${index}" class="pair-input" data-pair-index="${index}" data-pair-side="left" value="${escapeHtml(pair.left)}" placeholder="First answer" />
      <span class="pair-arrow" aria-hidden="true">↔</span>
      <label class="sr-only" for="pair-right-${index}">Pair ${index + 1} second answer</label>
      <input id="pair-right-${index}" class="pair-input" data-pair-index="${index}" data-pair-side="right" value="${escapeHtml(pair.right)}" placeholder="Matching answer" />
      <button class="remove-pair" data-remove-index="${index}" type="button" aria-label="Remove pair ${index + 1}" ${pairs.length <= 2 ? 'disabled' : ''}>×</button>
    </div>`).join('');
  if (pairCount) pairCount.textContent = `${pairs.length} ${pairs.length === 1 ? 'pair' : 'pairs'}`;
}

function readBuilder(): GameInput {
  return {
    title: document.querySelector<HTMLInputElement>('#game-title')?.value || '',
    description: document.querySelector<HTMLTextAreaElement>('#game-description')?.value || '',
    leftColumnLabel: document.querySelector<HTMLInputElement>('#left-label')?.value || '',
    rightColumnLabel: document.querySelector<HTMLInputElement>('#right-label')?.value || '',
    pairs: pairs.map((pair) => ({ left: pair.left, right: pair.right })),
  };
}

function fillBuilder(value: unknown) {
  const result = validateGame(value);
  if (!result.ok) {
    showErrors(errors, result.errors);
    return false;
  }
  const game = result.value;
  const title = document.querySelector<HTMLInputElement>('#game-title');
  const description = document.querySelector<HTMLTextAreaElement>('#game-description');
  const leftLabel = document.querySelector<HTMLInputElement>('#left-label');
  const rightLabel = document.querySelector<HTMLInputElement>('#right-label');
  if (title) title.value = game.title;
  if (description) description.value = game.description;
  if (leftLabel) leftLabel.value = game.leftColumnLabel;
  if (rightLabel) rightLabel.value = game.rightColumnLabel;
  pairs = game.pairs.map((pair) => ({ ...pair }));
  renderPairEditor();
  showErrors(errors, []);
  return true;
}

function parseJsonInput() {
  try {
    return JSON.parse(input?.value || '');
  } catch {
    showErrors(errors, ['The text is not valid JSON. Check commas, quotes, and brackets.']);
    return null;
  }
}

addPairButton?.addEventListener('click', () => {
  pairs.push({ left: '', right: '' });
  renderPairEditor();
  pairEditor?.querySelector<HTMLInputElement>(`.pair-input[data-pair-index="${pairs.length - 1}"]`)?.focus();
});

pairEditor?.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement;
  const index = Number(target.dataset.pairIndex);
  const side = target.dataset.pairSide as 'left' | 'right';
  if (Number.isInteger(index) && pairs[index] && (side === 'left' || side === 'right')) pairs[index][side] = target.value;
});

pairEditor?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('[data-remove-index]');
  if (!button || pairs.length <= 2) return;
  pairs.splice(Number(button.dataset.removeIndex), 1);
  renderPairEditor();
});

importJsonButton?.addEventListener('click', () => {
  const value = parseJsonInput();
  if (value !== null && fillBuilder(value)) {
    importJsonButton.textContent = 'Form filled ✓';
    window.setTimeout(() => { if (importJsonButton) importJsonButton.textContent = 'Fill form from JSON'; }, 1800);
  }
});

file?.addEventListener('change', async () => {
  const selected = file.files?.[0];
  if (!selected) return;
  fileName!.textContent = selected.name;
  input!.value = await selected.text();
  const value = parseJsonInput();
  if (value !== null) fillBuilder(value);
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  showErrors(errors, []);
  const value = readBuilder();
  const result = validateGame(value);
  if (!result.ok) {
    showErrors(errors, result.errors);
    preview!.hidden = true;
    currentGame = null;
    return;
  }
  currentGame = result.value;
  previewContent!.innerHTML = `
    <div class="preview-header"><h3>${escapeHtml(currentGame.title)}</h3><p>${escapeHtml(currentGame.description || 'No description')}</p></div>
    <div class="preview-table" role="table" aria-label="Game pairs">
      <div class="preview-row preview-labels" role="row"><strong>${escapeHtml(currentGame.leftColumnLabel)}</strong><strong>${escapeHtml(currentGame.rightColumnLabel)}</strong></div>
      ${currentGame.pairs.map((pair) => `<div class="preview-row" role="row"><span>${escapeHtml(pair.left)}</span><span>${escapeHtml(pair.right)}</span></div>`).join('')}
    </div>`;
  preview!.hidden = false;
  preview!.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

createButton?.addEventListener('click', async () => {
  if (!currentGame) return;
  createButton.disabled = true;
  createButton.textContent = 'Saving…';
  showErrors(createErrors, []);
  try {
    const visibility = document.querySelector<HTMLInputElement>('input[name="visibility"]:checked')?.value;
    const response = await fetch('/api/games', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: currentGame, visibility }),
    });
    const data = await response.json() as { errors?: string[]; url?: string };
    if (!response.ok || !data.url) throw new Error(data.errors?.join(' ') || 'Could not save game.');
    window.location.href = `/created?game=${encodeURIComponent(data.url)}`;
  } catch (error) {
    showErrors(createErrors, [error instanceof Error ? error.message : 'Could not save game.']);
    createButton.disabled = false;
    createButton.innerHTML = 'Save and get link <span aria-hidden="true">→</span>';
  }
});

export {};
