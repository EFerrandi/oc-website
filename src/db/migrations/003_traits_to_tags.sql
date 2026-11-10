-- Normalize existing tag names, merge case/whitespace duplicates, and keep the
-- earliest tag id as the canonical identity.
CREATE TEMP TABLE tag_name_map AS
WITH RECURSIVE normalised(id, name, pass) AS (
  SELECT id,
         lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
         0
  FROM tag
  UNION ALL
  SELECT id, replace(name, '  ', ' '), pass + 1
  FROM normalised
  WHERE pass < 8 AND instr(name, '  ') > 0
),
final_names AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
  FROM normalised
)
SELECT id, name AS name_key, MIN(id) OVER (PARTITION BY name) AS canonical_id
FROM final_names
WHERE position = 1;

INSERT OR IGNORE INTO character_tag (character_id, tag_id)
SELECT ct.character_id, canonical.canonical_id
FROM character_tag ct
JOIN tag_name_map original ON original.id = ct.tag_id
JOIN tag_name_map canonical ON canonical.id = original.canonical_id;

DELETE FROM character_tag
WHERE tag_id IN (SELECT id FROM tag_name_map WHERE id <> canonical_id);

DELETE FROM tag
WHERE id IN (SELECT id FROM tag_name_map WHERE id <> canonical_id);
DROP TABLE tag_name_map;

CREATE TEMP TABLE trait_tag_map AS
WITH RECURSIVE normalised(id, name, pass) AS (
  SELECT id,
         lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
         0
  FROM trait
  UNION ALL
  SELECT id, replace(name, '  ', ' '), pass + 1
  FROM normalised
  WHERE pass < 8 AND instr(name, '  ') > 0
),
final_names AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
  FROM normalised
)
SELECT tr.id AS trait_id, f.name AS name_key,
       (SELECT t.id FROM tag t
        JOIN (
          WITH RECURSIVE tag_names(id, name, pass) AS (
            SELECT id,
                   lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
                   0 FROM tag
            UNION ALL
            SELECT id, replace(name, '  ', ' '), pass + 1
            FROM tag_names WHERE pass < 8 AND instr(name, '  ') > 0
          ),
          final_tag_names AS (
            SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
            FROM tag_names
          )
          SELECT id, name FROM final_tag_names WHERE position = 1
        ) normalized_tags ON normalized_tags.id = t.id
        WHERE normalized_tags.name = f.name ORDER BY t.id LIMIT 1) AS tag_id,
       tr.name, tr.created_at
FROM trait tr
JOIN final_names f ON f.id = tr.id AND f.position = 1;

INSERT INTO tag (name, created_at)
SELECT (
         SELECT candidate.name FROM trait_tag_map candidate
         WHERE candidate.name_key = groups.name_key ORDER BY candidate.trait_id LIMIT 1
       ), (
         SELECT candidate.created_at FROM trait_tag_map candidate
         WHERE candidate.name_key = groups.name_key ORDER BY candidate.trait_id LIMIT 1
       )
FROM (SELECT DISTINCT name_key FROM trait_tag_map WHERE tag_id IS NULL) groups;

UPDATE trait_tag_map
SET tag_id = (
  SELECT t.id FROM tag t
  JOIN (
    WITH RECURSIVE tag_names(id, name, pass) AS (
      SELECT id,
             lower(trim(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '))),
             0 FROM tag
      UNION ALL
      SELECT id, replace(name, '  ', ' '), pass + 1
      FROM tag_names WHERE pass < 8 AND instr(name, '  ') > 0
    ),
    final_tag_names AS (
      SELECT id, name, ROW_NUMBER() OVER (PARTITION BY id ORDER BY pass DESC) AS position
      FROM tag_names
    )
    SELECT id, name FROM final_tag_names WHERE position = 1
  ) normalized_tags ON normalized_tags.id = t.id
  WHERE normalized_tags.name = trait_tag_map.name_key
  ORDER BY t.id LIMIT 1
)
WHERE tag_id IS NULL;

INSERT OR IGNORE INTO character_tag (character_id, tag_id)
SELECT ct.character_id, mapping.tag_id
FROM character_trait ct
JOIN trait_tag_map mapping ON mapping.trait_id = ct.trait_id;

DROP TABLE character_trait;
DROP TABLE trait;
DROP TABLE trait_tag_map;
