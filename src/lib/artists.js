import { nameKey, normaliseName } from './names.js';

/** Parse an optional artist website: blank is allowed, otherwise an absolute http(s) URL. */
export function parseArtistWebsite(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return { websiteUrl: null };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
    return { websiteUrl: parsed.href };
  } catch {
    return { error: 'Enter a full web address starting with http:// or https://, or leave it blank.' };
  }
}

/**
 * Validate a "new artist" submission and add field errors under the given names.
 * Returns `{ name, websiteUrl }` (no database writes).
 */
export function validateNewArtist(body, nameField, urlField, fieldErrors) {
  const name = normaliseName(body[nameField]);
  if (!name) fieldErrors[nameField] = 'Enter the artist name.';
  const parsed = parseArtistWebsite(body[urlField]);
  if (parsed.error) fieldErrors[urlField] = parsed.error;
  return { name, websiteUrl: parsed.websiteUrl ?? null };
}

/** Find an artist by case-insensitive name or insert it; `cache` dedupes within one submission. */
export function findOrCreateArtist(db, { name, websiteUrl }, at, cache) {
  const key = nameKey(name);
  if (cache.has(key)) return cache.get(key);
  const existing = db.prepare('SELECT id, name FROM artist').all().find((a) => nameKey(a.name) === key);
  const id = existing
    ? existing.id
    : Number(db.prepare(
      'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run(name, websiteUrl, at, at).lastInsertRowid);
  cache.set(key, id);
  return id;
}
