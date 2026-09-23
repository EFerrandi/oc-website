-- 001_initial.sql — full schema per specs/001-oc-photo-gallery/data-model.md
--
-- NOTE ON DELETE ACTIONS: they are deliberately NOT uniform. The tag/trait
-- asymmetry below is the single most important rule in this model and is
-- encoded here (rather than only in application code) so that it cannot be
-- forgotten or "tidied up" into consistency later.

-- ---------------------------------------------------------------- taxonomy

CREATE TABLE gender (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

CREATE TABLE designer (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  website_url TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE artist (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  website_url TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE tag (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

-- Uniqueness is on `name` ALONE, not (name, kind): FR-059 makes a name a
-- duplicate regardless of its sin/virtue marking, so `Greed (sin)` blocks
-- creating `greed (virtue)`.
CREATE TABLE trait (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind       TEXT NOT NULL CHECK (kind IN ('sin', 'virtue')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ----------------------------------------------------------------- content

CREATE TABLE image (
  id                INTEGER PRIMARY KEY,
  file_name         TEXT NOT NULL UNIQUE,
  preview_file_name TEXT NOT NULL UNIQUE,
  mime_type         TEXT NOT NULL
                      CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  byte_size         INTEGER NOT NULL,
  width             INTEGER NOT NULL,
  height            INTEGER NOT NULL,
  alt_text          TEXT NOT NULL CHECK (length(trim(alt_text)) > 0),
  short_description TEXT,
  artist_id         INTEGER NOT NULL REFERENCES artist(id) ON DELETE RESTRICT,
  is_nsfw           INTEGER NOT NULL DEFAULT 0 CHECK (is_nsfw IN (0, 1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE story (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL CHECK (length(trim(title)) > 0),
  slug       TEXT NOT NULL UNIQUE,
  body       TEXT NOT NULL CHECK (length(trim(body)) > 0),
  is_nsfw    INTEGER NOT NULL DEFAULT 0 CHECK (is_nsfw IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE character (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug              TEXT NOT NULL UNIQUE,
  gender_id         INTEGER NOT NULL REFERENCES gender(id) ON DELETE RESTRICT,
  short_description TEXT NOT NULL CHECK (length(trim(short_description)) > 0),
  terms_of_use      TEXT NOT NULL CHECK (length(trim(terms_of_use)) > 0),
  can_regift        INTEGER NOT NULL CHECK (can_regift IN (0, 1)),
  can_retrade       INTEGER NOT NULL CHECK (can_retrade IN (0, 1)),
  can_resell        INTEGER NOT NULL CHECK (can_resell IN (0, 1)),
  designer_id       INTEGER NOT NULL REFERENCES designer(id) ON DELETE RESTRICT,
  -- Nullable ONLY to break the circular insert (a character is written before
  -- its first image exists). The creation transaction sets it before commit,
  -- and it must reference an image linked to this same character (I-6).
  avatar_image_id   INTEGER REFERENCES image(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE character_job_title (
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (length(trim(title)) > 0),
  position     INTEGER NOT NULL,
  PRIMARY KEY (character_id, position)
);

-- SQLite has no LEAST/GREATEST, so the ordered pair is materialised into
-- generated columns and a unique index placed on them. This is what stops the
-- same pair being entered twice in the opposite direction (FR-028).
CREATE TABLE relationship (
  id                INTEGER PRIMARY KEY,
  from_character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  to_character_id   INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  label             TEXT NOT NULL CHECK (length(trim(label)) > 0),
  is_nsfw           INTEGER NOT NULL DEFAULT 0 CHECK (is_nsfw IN (0, 1)),
  pair_low          INTEGER GENERATED ALWAYS AS (MIN(from_character_id, to_character_id)) VIRTUAL,
  pair_high         INTEGER GENERATED ALWAYS AS (MAX(from_character_id, to_character_id)) VIRTUAL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  CHECK (from_character_id <> to_character_id)
);

CREATE UNIQUE INDEX idx_relationship_unique_pair
  ON relationship (pair_low, pair_high, label COLLATE NOCASE);

-- ------------------------------------------------------------- join tables
-- The delete actions differ ON PURPOSE. Read the notes before changing them.

-- tag -> RESTRICT: every character requires at least one tag (FR-041), so
-- deleting a tag that is in use would leave characters invalid. Refused.
CREATE TABLE character_tag (
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  tag_id       INTEGER NOT NULL REFERENCES tag(id) ON DELETE RESTRICT,
  PRIMARY KEY (character_id, tag_id)
);

-- trait -> CASCADE: traits are OPTIONAL (FR-060, FR-062), so deleting one that
-- is in use simply detaches it and leaves the character valid. This asymmetry
-- with character_tag above is intentional; making them match is a bug.
CREATE TABLE character_trait (
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  trait_id     INTEGER NOT NULL REFERENCES trait(id) ON DELETE CASCADE,
  PRIMARY KEY (character_id, trait_id)
);

CREATE TABLE character_image (
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  image_id     INTEGER NOT NULL REFERENCES image(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, image_id)
);

CREATE TABLE character_story (
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  story_id     INTEGER NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  PRIMARY KEY (character_id, story_id)
);

-- ----------------------------------------------------------------- indexes

CREATE INDEX idx_character_gender        ON character (gender_id);
CREATE INDEX idx_character_designer      ON character (designer_id);
CREATE INDEX idx_image_artist            ON image (artist_id);
CREATE INDEX idx_image_nsfw              ON image (is_nsfw);
CREATE INDEX idx_story_nsfw              ON story (is_nsfw);
CREATE INDEX idx_relationship_nsfw       ON relationship (is_nsfw);
CREATE INDEX idx_character_tag_tag       ON character_tag (tag_id);
CREATE INDEX idx_character_trait_trait   ON character_trait (trait_id);
CREATE INDEX idx_character_image_image   ON character_image (image_id);
CREATE INDEX idx_character_story_story   ON character_story (story_id);
CREATE INDEX idx_relationship_from       ON relationship (from_character_id);
CREATE INDEX idx_relationship_to         ON relationship (to_character_id);
