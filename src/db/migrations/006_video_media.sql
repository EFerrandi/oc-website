-- @requires-foreign-keys-off
-- Allow MP4/WebM videos in the image table. Videos are stored as uploaded, so
-- they have no generated preview file and no stored dimensions.
CREATE TABLE image_new (
  id                INTEGER PRIMARY KEY,
  file_name         TEXT NOT NULL UNIQUE,
  preview_file_name TEXT UNIQUE,
  mime_type         TEXT NOT NULL
                      CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif',
                                           'video/mp4', 'video/webm')),
  byte_size         INTEGER NOT NULL,
  width             INTEGER,
  height            INTEGER,
  alt_text          TEXT NOT NULL CHECK (length(trim(alt_text)) > 0),
  short_description TEXT,
  artist_id         INTEGER NOT NULL REFERENCES artist(id) ON DELETE RESTRICT,
  is_nsfw           INTEGER NOT NULL DEFAULT 0 CHECK (is_nsfw IN (0, 1)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  CHECK (
    (mime_type LIKE 'video/%'
      AND preview_file_name IS NULL AND width IS NULL AND height IS NULL)
    OR
    (mime_type NOT LIKE 'video/%'
      AND preview_file_name IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL)
  )
);

INSERT INTO image_new (
  id, file_name, preview_file_name, mime_type, byte_size, width, height,
  alt_text, short_description, artist_id, is_nsfw, created_at, updated_at
)
SELECT id, file_name, preview_file_name, mime_type, byte_size, width, height,
       alt_text, short_description, artist_id, is_nsfw, created_at, updated_at
FROM image;

DROP TABLE image;
ALTER TABLE image_new RENAME TO image;
CREATE INDEX idx_image_artist ON image (artist_id);
CREATE INDEX idx_image_nsfw   ON image (is_nsfw);
