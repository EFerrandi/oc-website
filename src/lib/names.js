/** Trim and collapse internal whitespace runs to a single space. */
export function normaliseName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Key used for case-insensitive duplicate detection (FR-048, FR-059).
 *
 * The database's `COLLATE NOCASE` catches `Greed` vs `greed`, but NOT
 * `Greed` vs `  Greed  ` — collation does not trim. Names must therefore be
 * normalised here before they are compared or stored.
 */
export function nameKey(value) {
  return normaliseName(value).toLowerCase();
}

export function isBlank(value) {
  return normaliseName(value).length === 0;
}
