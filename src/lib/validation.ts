export type GameInput = {
  title: string;
  description?: string;
  leftColumnLabel: string;
  rightColumnLabel: string;
  pairs: Array<{ left: string; right: string }>;
};

export type Visibility = 'public' | 'private';

export type ValidationResult =
  | { ok: true; value: Required<GameInput> }
  | { ok: false; errors: string[] };

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function validateGame(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['The JSON root must be an object.'] };
  }

  const source = value as Record<string, unknown>;
  const title = text(source.title);
  const description = text(source.description);
  const leftColumnLabel = text(source.leftColumnLabel);
  const rightColumnLabel = text(source.rightColumnLabel);
  const errors: string[] = [];

  if (!title) errors.push('Title is required.');
  else if (title.length > 160) errors.push('Title must be 160 characters or fewer.');
  if (description.length > 2_000) errors.push('Description must be 2,000 characters or fewer.');
  if (!leftColumnLabel) errors.push('Left column label is required.');
  if (!rightColumnLabel) errors.push('Right column label is required.');
  if (leftColumnLabel && rightColumnLabel && leftColumnLabel.toLocaleLowerCase() === rightColumnLabel.toLocaleLowerCase()) {
    errors.push('Column labels must be different.');
  }

  if (!Array.isArray(source.pairs)) {
    errors.push('Pairs must be an array.');
  } else {
    if (source.pairs.length < 2) errors.push('Add at least two pairs.');
    if (source.pairs.length > 1_000) errors.push('A game can contain at most 1,000 pairs.');
    const lefts = new Set<string>();
    const rights = new Set<string>();
    source.pairs.forEach((pair, index) => {
      if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
        errors.push(`Pair ${index + 1} must be an object.`);
        return;
      }
      const item = pair as Record<string, unknown>;
      const left = text(item.left);
      const right = text(item.right);
      if (!left) errors.push(`Pair ${index + 1} has an empty left answer.`);
      if (!right) errors.push(`Pair ${index + 1} has an empty right answer.`);
      const leftKey = left.toLocaleLowerCase();
      const rightKey = right.toLocaleLowerCase();
      if (left && lefts.has(leftKey)) errors.push(`Duplicate left answer: “${left}”.`);
      if (right && rights.has(rightKey)) errors.push(`Duplicate right answer: “${right}”.`);
      if (left) lefts.add(leftKey);
      if (right) rights.add(rightKey);
    });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      description,
      leftColumnLabel,
      rightColumnLabel,
      pairs: (source.pairs as Array<Record<string, unknown>>).map((pair) => ({
        left: text(pair.left),
        right: text(pair.right),
      })),
    },
  };
}
