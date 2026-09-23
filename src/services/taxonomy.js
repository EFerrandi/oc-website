import { ValidationError } from '../middleware/errors.js';
import { nameKey, normaliseName } from '../lib/names.js';

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

/**
 * Configuration for the five taxonomies that share one CRUD shape.
 *
 * `inUseBlocksDelete` carries the single most important rule in this file:
 *
 *   - TAGS are mandatory on characters (FR-041), so deleting a tag that is
 *     still in use is REFUSED — otherwise a character could end up with none.
 *   - TRAITS are optional (FR-060), so deleting a trait that is in use
 *     SUCCEEDS and simply detaches it from its characters (FR-062).
 *
 * These two look inconsistent side by side. They are not. Making them match
 * would be a bug, and the database enforces the same split via RESTRICT on
 * character_tag.tag_id and CASCADE on character_trait.trait_id.
 */
const KINDS = {
  tags: {
    table: 'tag',
    label: 'Tag',
    hasUrl: false,
    hasTraitKind: false,
    inUseBlocksDelete: true,
    usageSql: 'SELECT COUNT(*) AS n FROM character_tag WHERE tag_id = ?',
    usageMessage: 'characters still carry this tag, and every character must keep at least one',
  },
  traits: {
    table: 'trait',
    label: 'Sin or virtue',
    hasUrl: false,
    hasTraitKind: true,
    inUseBlocksDelete: false,
    usageSql: 'SELECT COUNT(*) AS n FROM character_trait WHERE trait_id = ?',
  },
  genders: {
    table: 'gender',
    label: 'Gender',
    hasUrl: false,
    hasTraitKind: false,
    inUseBlocksDelete: true,
    usageSql: 'SELECT COUNT(*) AS n FROM character WHERE gender_id = ?',
    usageMessage: 'characters are still assigned this gender',
  },
  artists: {
    table: 'artist',
    label: 'Artist',
    hasUrl: true,
    hasTraitKind: false,
    inUseBlocksDelete: true,
    usageSql: 'SELECT COUNT(*) AS n FROM image WHERE artist_id = ?',
    usageMessage: 'images still credit this artist',
  },
  designers: {
    table: 'designer',
    label: 'Designer',
    hasUrl: true,
    hasTraitKind: false,
    inUseBlocksDelete: true,
    usageSql: 'SELECT COUNT(*) AS n FROM character WHERE designer_id = ?',
    usageMessage: 'characters still credit this designer',
  },
};

export function getKind(kind) {
  const spec = KINDS[kind];
  if (!spec) throw new ValidationError(`Unknown taxonomy "${kind}"`);
  return spec;
}

export const TAXONOMY_KINDS = Object.keys(KINDS);

function hasTimestamps(spec) {
  // gender and tag carry only created_at.
  return spec.table !== 'gender' && spec.table !== 'tag';
}

export function listItems(db, kind) {
  const spec = getKind(kind);
  const columns = ['id', 'name'];
  if (spec.hasUrl) columns.push('website_url AS websiteUrl');
  if (spec.hasTraitKind) columns.push('kind');

  return db.prepare(`
    SELECT ${columns.join(', ')} FROM ${spec.table} ORDER BY name COLLATE NOCASE
  `).all();
}

export function findItem(db, kind, id) {
  const spec = getKind(kind);
  const columns = ['id', 'name'];
  if (spec.hasUrl) columns.push('website_url AS websiteUrl');
  if (spec.hasTraitKind) columns.push('kind');

  return db.prepare(`SELECT ${columns.join(', ')} FROM ${spec.table} WHERE id = ?`).get(id) ?? null;
}

export function countUsage(db, kind, id) {
  const spec = getKind(kind);
  return db.prepare(spec.usageSql).get(id).n;
}

/**
 * Names are trimmed and internal whitespace collapsed BEFORE the uniqueness
 * check. The column's COLLATE NOCASE catches "Greed" vs "greed" but not
 * "Greed" vs "  Greed  " — collation does not trim (FR-048, FR-059).
 */
function assertUniqueName(db, spec, name, excludeId) {
  const key = nameKey(name);

  const clash = db.prepare(`SELECT id, name FROM ${spec.table}`).all()
    .find((row) => nameKey(row.name) === key && row.id !== excludeId);

  if (clash) {
    throw new ValidationError(`That name is already in use`, {
      name: `"${clash.name}" already exists. Names must be unique, ignoring case and surrounding spaces.`,
    });
  }
}

function validate(spec, { name, websiteUrl, traitKind }) {
  const cleanName = normaliseName(name);
  const fieldErrors = {};

  if (!cleanName) fieldErrors.name = 'Enter a name.';

  if (spec.hasTraitKind && traitKind !== 'sin' && traitKind !== 'virtue') {
    fieldErrors.kind = 'Choose either Sin or Virtue.';
  }

  let cleanUrl = null;
  if (spec.hasUrl && websiteUrl) {
    const trimmed = String(websiteUrl).trim();
    if (trimmed) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
        cleanUrl = parsed.href;
      } catch {
        fieldErrors.websiteUrl = 'Enter a full web address starting with http:// or https://, or leave it blank.';
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError(`${spec.label} could not be saved`, fieldErrors);
  }

  return { cleanName, cleanUrl };
}

export function createItem(db, kind, input) {
  const spec = getKind(kind);
  const { cleanName, cleanUrl } = validate(spec, input);
  assertUniqueName(db, spec, cleanName, null);

  const at = new Date().toISOString();
  const columns = ['name', 'created_at'];
  const values = [cleanName, at];

  if (spec.hasTraitKind) { columns.splice(1, 0, 'kind'); values.splice(1, 0, input.traitKind); }
  if (spec.hasUrl) { columns.splice(1, 0, 'website_url'); values.splice(1, 0, cleanUrl); }
  if (hasTimestamps(spec)) { columns.push('updated_at'); values.push(at); }

  const info = db.prepare(`
    INSERT INTO ${spec.table} (${columns.join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
  `).run(...values);

  return Number(info.lastInsertRowid);
}

export function updateItem(db, kind, id, input) {
  const spec = getKind(kind);
  const existing = findItem(db, kind, id);
  if (!existing) throw new ValidationError(`${spec.label} not found`);

  const { cleanName, cleanUrl } = validate(spec, input);
  assertUniqueName(db, spec, cleanName, id);

  const sets = ['name = ?'];
  const values = [cleanName];

  // Re-classifying a trait moves it between the Sins and Virtues headings
  // everywhere it appears — automatically, because characters reference the
  // row rather than copying its name (FR-058, FR-061).
  if (spec.hasTraitKind) { sets.push('kind = ?'); values.push(input.traitKind); }
  if (spec.hasUrl) { sets.push('website_url = ?'); values.push(cleanUrl); }
  if (hasTimestamps(spec)) { sets.push('updated_at = ?'); values.push(new Date().toISOString()); }

  values.push(id);
  db.prepare(`UPDATE ${spec.table} SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteItem(db, kind, id) {
  const spec = getKind(kind);
  const existing = findItem(db, kind, id);
  if (!existing) throw new ValidationError(`${spec.label} not found`);

  const usage = countUsage(db, kind, id);

  if (usage > 0 && spec.inUseBlocksDelete) {
    throw new ConflictError(
      `"${existing.name}" cannot be deleted because ${spec.usageMessage}.`,
    );
  }

  // For traits, usage > 0 is fine: the ON DELETE CASCADE on
  // character_trait.trait_id detaches it from every character (FR-062).
  db.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).run(id);
}

/**
 * Find an existing item by name, or create it. Lets the admin add a tag or a
 * sin/virtue inline while creating a character, instead of breaking off to the
 * taxonomy screens first.
 */
export function findOrCreateByName(db, kind, name, extra = {}) {
  const spec = getKind(kind);
  const key = nameKey(name);
  if (!key) return null;

  const existing = db.prepare(`SELECT id, name FROM ${spec.table}`).all()
    .find((row) => nameKey(row.name) === key);

  if (existing) return existing.id;

  return createItem(db, kind, { name, ...extra });
}
