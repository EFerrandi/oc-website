import { ValidationError } from '../middleware/errors.js';
import { transaction } from '../db/index.js';
import { uniqueSlug } from '../lib/slug.js';

function asIdList(value) {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
}

function asBool(value) {
  return value === '1' || value === 'true' || value === 'on' || value === true;
}

function validate(db, body) {
  const fieldErrors = {};

  const title = String(body.title ?? '').trim();
  if (!title) fieldErrors.title = 'Enter a title.';

  const text = String(body.body ?? '').trim();
  if (!text) fieldErrors.body = 'Enter the story text.';

  // A story must be linked to at least one character (invariant I-5).
  const characterIds = asIdList(body['character_id[]'] ?? body.character_id);
  if (characterIds.length === 0) {
    fieldErrors.character_id = 'Link this story to at least one character.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('The story could not be saved', fieldErrors);
  }

  return { title, body: text, characterIds, isNsfw: asBool(body.is_nsfw) };
}

function existingSlugs(db) {
  return new Set(db.prepare('SELECT slug FROM story').all().map((r) => r.slug));
}

export function createStory(db, body) {
  const input = validate(db, body);

  return transaction(db, () => {
    const at = new Date().toISOString();
    const slug = uniqueSlug(input.title, existingSlugs(db));

    const storyId = Number(db.prepare(`
      INSERT INTO story (title, slug, body, is_nsfw, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.title, slug, input.body, input.isNsfw ? 1 : 0, at, at).lastInsertRowid);

    for (const characterId of input.characterIds) {
      db.prepare('INSERT INTO character_story (character_id, story_id) VALUES (?, ?)')
        .run(characterId, storyId);
    }

    return storyId;
  });
}

export function updateStory(db, id, body) {
  if (!db.prepare('SELECT 1 FROM story WHERE id = ?').get(id)) {
    throw new ValidationError('Story not found');
  }

  const input = validate(db, body);

  return transaction(db, () => {
    db.prepare('UPDATE story SET title = ?, body = ?, is_nsfw = ?, updated_at = ? WHERE id = ?')
      .run(input.title, input.body, input.isNsfw ? 1 : 0, new Date().toISOString(), id);

    db.prepare('DELETE FROM character_story WHERE story_id = ?').run(id);
    for (const characterId of input.characterIds) {
      db.prepare('INSERT INTO character_story (character_id, story_id) VALUES (?, ?)')
        .run(characterId, id);
    }

    return id;
  });
}

export function deleteStory(db, id, { confirm }) {
  if (!db.prepare('SELECT 1 FROM story WHERE id = ?').get(id)) {
    throw new ValidationError('Story not found');
  }

  if (confirm !== 'delete') {
    throw new ValidationError('The story was not deleted', {
      confirm: 'Type "delete" to confirm removing this story.',
    });
  }

  db.prepare('DELETE FROM story WHERE id = ?').run(id);
}
