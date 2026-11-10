-- @requires-foreign-keys-off
-- Merge creator identities before replacing the character's designer FK.
-- Recompute normalized names as a stable key; collapse duplicate existing artist
-- entries into the lowest id and preserve all image credits.
CREATE TEMP TABLE artist_name_map AS
WITH RECURSIVE normalised(id, name, pass) AS (
  SELECT id,
         lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
         0
  FROM artist
  UNION ALL
  SELECT id, replace(name, '  ', ' '), pass + 1
  FROM normalised
  WHERE pass < 8 AND instr(name, '  ') > 0
),
final_names AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
  FROM normalised
)
SELECT id, name AS name_key,
       MIN(id) OVER (PARTITION BY name) AS canonical_id
FROM final_names
WHERE position = 1;

UPDATE artist
SET website_url = COALESCE(
  (SELECT other.website_url
   FROM artist_name_map current
   JOIN artist other ON other.id = current.id
   WHERE current.canonical_id = artist.id AND other.website_url IS NOT NULL
     AND trim(other.website_url) <> ''
   ORDER BY other.id LIMIT 1),
  website_url
)
WHERE id IN (SELECT canonical_id FROM artist_name_map);

UPDATE image
SET artist_id = (SELECT canonical_id FROM artist_name_map WHERE id = image.artist_id)
WHERE artist_id IN (SELECT id FROM artist_name_map WHERE id <> canonical_id);

DELETE FROM artist
WHERE id IN (SELECT id FROM artist_name_map WHERE id <> canonical_id);
DROP TABLE artist_name_map;

-- Create a lookup for each designer, matching normalized names to existing artists.
CREATE TEMP TABLE artist_normalised AS
WITH RECURSIVE normalised(id, name, pass) AS (
  SELECT id,
         lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
         0
  FROM artist
  UNION ALL
  SELECT id, replace(name, '  ', ' '), pass + 1
  FROM normalised
  WHERE pass < 8 AND instr(name, '  ') > 0
),
final_names AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
  FROM normalised
)
SELECT id, name AS name_key FROM final_names WHERE position = 1;

CREATE TEMP TABLE designer_artist_map AS
WITH RECURSIVE normalised(id, name, pass) AS (
  SELECT id,
         lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
         0
  FROM designer
  UNION ALL
  SELECT id, replace(name, '  ', ' '), pass + 1
  FROM normalised
  WHERE pass < 8 AND instr(name, '  ') > 0
),
final_names AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
  FROM normalised
)
SELECT d.id AS designer_id, f.name AS name_key,
       (SELECT a.id FROM artist_normalised a
        WHERE a.name_key = f.name ORDER BY a.id LIMIT 1) AS artist_id,
       d.name, d.website_url, d.created_at, d.updated_at
FROM designer d
JOIN final_names f ON f.id = d.id AND f.position = 1;

INSERT INTO artist (name, website_url, created_at, updated_at)
SELECT name, website_url, created_at, updated_at
FROM designer_artist_map
WHERE artist_id IS NULL;

UPDATE designer_artist_map
SET artist_id = (
  SELECT a.id FROM artist_normalised a
  WHERE a.name_key = designer_artist_map.name_key ORDER BY a.id LIMIT 1
)
WHERE artist_id IS NULL;

-- If a matching artist has no URL, inherit the designer's available link.
UPDATE artist
SET website_url = (
  SELECT m.website_url FROM designer_artist_map m
  WHERE m.artist_id = artist.id AND m.website_url IS NOT NULL AND trim(m.website_url) <> ''
  ORDER BY m.designer_id LIMIT 1
)
WHERE (website_url IS NULL OR trim(website_url) = '')
  AND id IN (SELECT artist_id FROM designer_artist_map);

CREATE TABLE character_new (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug              TEXT NOT NULL UNIQUE,
  gender_id         INTEGER NOT NULL REFERENCES gender(id) ON DELETE RESTRICT,
  short_description TEXT NOT NULL CHECK (length(trim(short_description)) > 0),
  terms_of_use      TEXT NOT NULL CHECK (length(trim(terms_of_use)) > 0),
  can_regift        INTEGER NOT NULL CHECK (can_regift IN (0, 1)),
  can_retrade       INTEGER NOT NULL CHECK (can_retrade IN (0, 1)),
  can_resell        INTEGER NOT NULL CHECK (can_resell IN (0, 1)),
  artist_id         INTEGER NOT NULL REFERENCES artist(id) ON DELETE RESTRICT,
  avatar_image_id   INTEGER REFERENCES image(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

INSERT INTO character_new (
  id, name, slug, gender_id, short_description, terms_of_use,
  can_regift, can_retrade, can_resell, artist_id, avatar_image_id, created_at, updated_at
)
SELECT c.id, c.name, c.slug, c.gender_id, c.short_description, c.terms_of_use,
       c.can_regift, c.can_retrade, c.can_resell, m.artist_id, c.avatar_image_id,
       c.created_at, c.updated_at
FROM character c
JOIN designer_artist_map m ON m.designer_id = c.designer_id;

DROP TABLE character;
ALTER TABLE character_new RENAME TO character;
CREATE INDEX idx_character_gender ON character (gender_id);
CREATE INDEX idx_character_artist ON character (artist_id);
DROP TABLE designer;
DROP TABLE designer_artist_map;
DROP TABLE artist_normalised;
