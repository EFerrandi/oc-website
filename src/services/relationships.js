import { ValidationError } from '../middleware/errors.js';
import { nameKey, normaliseName } from '../lib/names.js';

function asBool(value) {
  return value === '1' || value === 'true' || value === 'on' || value === true;
}

/**
 * Validate a relationship.
 *
 * Two rules matter (FR-028):
 *   - a character cannot be related to itself;
 *   - the same pair with the same label cannot exist twice in EITHER
 *     direction. The database enforces this with generated pair_low/pair_high
 *     columns, but we check here too so the admin gets a named field error
 *     rather than a raw constraint failure.
 */
function validate(db, body, excludeId = null) {
  const fieldErrors = {};

  const fromId = Number(body.from_character_id);
  const toId = Number(body.to_character_id);
  const label = normaliseName(body.label);

  if (!db.prepare('SELECT 1 FROM character WHERE id = ?').get(fromId)) {
    fieldErrors.from_character_id = 'Choose the first character.';
  }
  if (!db.prepare('SELECT 1 FROM character WHERE id = ?').get(toId)) {
    fieldErrors.to_character_id = 'Choose the second character.';
  }
  if (!label) {
    fieldErrors.label = 'Describe the relationship.';
  }

  if (fromId && toId && fromId === toId) {
    fieldErrors.to_character_id = 'A character cannot be related to itself. Choose two different characters.';
  }

  if (Object.keys(fieldErrors).length === 0) {
    const low = Math.min(fromId, toId);
    const high = Math.max(fromId, toId);

    const duplicate = db.prepare(`
      SELECT id, label FROM relationship
      WHERE MIN(from_character_id, to_character_id) = ?
        AND MAX(from_character_id, to_character_id) = ?
    `).all(low, high).find((row) => nameKey(row.label) === nameKey(label) && row.id !== excludeId);

    if (duplicate) {
      fieldErrors.label = 'These two characters already have a relationship with that label, '
        + 'in one direction or the other.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('The relationship could not be saved', fieldErrors);
  }

  return { fromId, toId, label, isNsfw: asBool(body.is_nsfw) };
}

export function createRelationship(db, body) {
  const input = validate(db, body);
  const at = new Date().toISOString();

  return Number(db.prepare(`
    INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.fromId, input.toId, input.label, input.isNsfw ? 1 : 0, at, at).lastInsertRowid);
}

export function updateRelationship(db, id, body) {
  if (!db.prepare('SELECT 1 FROM relationship WHERE id = ?').get(id)) {
    throw new ValidationError('Relationship not found');
  }

  const input = validate(db, body, id);

  db.prepare(`
    UPDATE relationship
    SET from_character_id = ?, to_character_id = ?, label = ?, is_nsfw = ?, updated_at = ?
    WHERE id = ?
  `).run(input.fromId, input.toId, input.label, input.isNsfw ? 1 : 0, new Date().toISOString(), id);

  return id;
}

export function deleteRelationship(db, id, { confirm }) {
  if (!db.prepare('SELECT 1 FROM relationship WHERE id = ?').get(id)) {
    throw new ValidationError('Relationship not found');
  }

  if (confirm !== 'delete') {
    throw new ValidationError('The relationship was not deleted', {
      confirm: 'Type "delete" to confirm removing this relationship.',
    });
  }

  db.prepare('DELETE FROM relationship WHERE id = ?').run(id);
}
