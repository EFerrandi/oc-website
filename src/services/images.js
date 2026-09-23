import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { ValidationError } from '../middleware/errors.js';

const ALLOWED_MIME = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export function isAllowedMime(mime) {
  return ALLOWED_MIME.has(mime);
}

/**
 * Store an upload and derive a smaller preview.
 *
 * Original dimensions are deliberately never constrained (FR-063): visitors
 * see the preview by default and reach the untouched original by following the
 * anchor. The preview is a genuinely smaller FILE, not a CSS-scaled original,
 * so page weight does not depend on the original's size.
 */
export async function storeImage({ buffer, mimeType, config }) {
  if (!isAllowedMime(mimeType)) {
    throw new ValidationError('Unsupported image type', {
      file: `Upload a PNG, JPEG, WebP or GIF. Received ${mimeType || 'an unknown type'}.`,
    });
  }

  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new ValidationError('Unreadable image', {
      file: 'That file could not be read as an image. It may be corrupt.',
    });
  }

  if (!metadata.width || !metadata.height) {
    throw new ValidationError('Unreadable image', {
      file: 'That image has no readable dimensions.',
    });
  }

  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.mkdir(config.previewDir, { recursive: true });

  const stem = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const fileName = `${stem}.${ALLOWED_MIME.get(mimeType)}`;
  const previewFileName = `${stem}-preview.webp`;

  await fs.writeFile(path.join(config.uploadDir, fileName), buffer);

  // withoutEnlargement: a small original is copied at its own size rather than
  // being upscaled into a "preview" that is larger than the original.
  await sharp(buffer, { animated: mimeType === 'image/gif' })
    .resize({
      width: config.previewMaxEdge,
      height: config.previewMaxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(path.join(config.previewDir, previewFileName));

  return {
    fileName,
    previewFileName,
    mimeType,
    byteSize: buffer.length,
    width: metadata.width,
    height: metadata.height,
  };
}

/** Best-effort cleanup; a missing file is not an error worth surfacing. */
export async function deleteImageFiles({ fileName, previewFileName }, config) {
  await Promise.allSettled([
    fs.unlink(path.join(config.uploadDir, path.basename(fileName))),
    fs.unlink(path.join(config.previewDir, path.basename(previewFileName))),
  ]);
}
