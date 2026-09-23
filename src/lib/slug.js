import { normaliseName } from './names.js';

export function slugify(value) {
  const base = normaliseName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || 'item';
}

/**
 * Produce a slug not already present in `taken`, appending -2, -3, … as needed.
 * `taken` is any object with a `.has()` method (Set, or a DB-backed lookup).
 */
export function uniqueSlug(value, taken) {
  const base = slugify(value);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
