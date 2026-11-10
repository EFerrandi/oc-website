ALTER TABLE character
  ADD COLUMN avatar_crop_x REAL NOT NULL DEFAULT 50
  CHECK (avatar_crop_x BETWEEN 0 AND 100);

ALTER TABLE character
  ADD COLUMN avatar_crop_y REAL NOT NULL DEFAULT 50
  CHECK (avatar_crop_y BETWEEN 0 AND 100);

ALTER TABLE character
  ADD COLUMN avatar_crop_zoom REAL NOT NULL DEFAULT 1.0
  CHECK (avatar_crop_zoom BETWEEN 1.0 AND 3.0);
