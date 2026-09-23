import multer from 'multer';

/**
 * Uploads are buffered in memory, then written by the image service only after
 * validation passes. Keeping them out of a temp directory means a rejected
 * upload cannot leave a stray file behind (research R-010, FR-050).
 *
 * The limit is a safety ceiling, not an artistic one: originals are never
 * resized, so the preview keeps pages light regardless (FR-067).
 */
export function uploads(config) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
  });
}
