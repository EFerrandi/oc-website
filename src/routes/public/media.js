import fs from 'node:fs';
import path from 'node:path';

import { Router } from 'express';

import { NotFoundError } from '../../middleware/errors.js';
import { findVisibleImageById } from '../../repositories/images.js';

const PREVIEW_MIME = 'image/webp';

/**
 * The only route family that serves uploaded bytes. `data/uploads/` is never
 * mounted statically, because a static mount would bypass every rating check
 * (FR-012, research R-006).
 *
 * Both variants apply the identical check, so opting out makes the preview and
 * the original equally unavailable (FR-070). A hidden image answers 404 rather
 * than 403 — a 403 would confirm that an NSFW image exists at that id.
 */
export function mediaRouter() {
  const router = Router();

  function serve(variant) {
    return (req, res, next) => {
      const { db, config } = req.app.locals;

      const id = Number(req.params.imageId);
      if (!Number.isInteger(id) || id <= 0) return next(new NotFoundError());

      const image = findVisibleImageById(db, id, { showNsfw: res.locals.showNsfw });
      if (!image) return next(new NotFoundError());

      const isFull = variant === 'full';
      const directory = isFull ? config.uploadDir : config.previewDir;
      const fileName = isFull ? image.fileName : image.previewFileName;

      // basename guards against a stored name ever escaping its directory.
      const filePath = path.join(directory, path.basename(fileName));
      if (!fs.existsSync(filePath)) return next(new NotFoundError());

      res.type(isFull ? image.mimeType : PREVIEW_MIME);

      if (image.isNsfw === 1) {
        // Never let a shared or proxy cache hand this to someone who has not
        // opted in.
        res.set('Cache-Control', 'private, no-store');
      } else {
        res.set('Cache-Control', 'public, max-age=86400');
      }

      return res.sendFile(filePath, (err) => {
        if (err) next(new NotFoundError());
      });
    };
  }

  router.get('/media/:imageId', serve('preview'));
  router.get('/media/:imageId/full', serve('full'));

  return router;
}
