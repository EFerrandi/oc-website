import { Router } from 'express';

import { listArtistsWithVisibleImages } from '../../repositories/credits.js';
import { listImagesByArtist } from '../../repositories/images.js';

export function artistsRouter() {
  const router = Router();

  router.get('/artists', (req, res) => {
    const db = req.app.locals.db;
    const showNsfw = res.locals.showNsfw;

    // Design-credit-only artists remain discoverable, but hidden artwork does
    // not leave behind an empty group that hints at NSFW content.
    const artists = listArtistsWithVisibleImages(db, { showNsfw }).map((artist) => ({
      ...artist,
      images: listImagesByArtist(db, artist.id, { showNsfw }),
    }));

    res.render('pages/artists.njk', { artists });
  });

  return router;
}
