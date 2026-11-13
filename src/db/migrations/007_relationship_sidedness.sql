-- A relationship is either two-sided (shared, direction does not matter) or
-- one-sided (felt by "from" toward "to"). Existing rows stay two-sided.
ALTER TABLE relationship
  ADD COLUMN is_one_sided INTEGER NOT NULL DEFAULT 0 CHECK (is_one_sided IN (0, 1));

-- Two-sided rows stay unique per unordered pair and label. One-sided rows are
-- unique per ordered pair and label, so opposite directions can coexist.
-- A one-sided and a two-sided row with the same label are rejected by the
-- service, because this index cannot compare across the two kinds.
DROP INDEX idx_relationship_unique_pair;
CREATE UNIQUE INDEX idx_relationship_unique_pair
  ON relationship (
    (CASE WHEN is_one_sided = 1 THEN from_character_id ELSE pair_low END),
    (CASE WHEN is_one_sided = 1 THEN to_character_id ELSE pair_high END),
    is_one_sided,
    label COLLATE NOCASE
  );
