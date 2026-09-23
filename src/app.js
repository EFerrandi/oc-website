import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import session from 'express-session';
import nunjucks from 'nunjucks';

import { csrf } from './middleware/csrf.js';
import { requireAdmin } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { requestLogging } from './middleware/logging.js';
import { nsfw } from './middleware/nsfw.js';
import { uploads } from './middleware/uploads.js';
import { adminCharactersRouter } from './routes/admin/characters.js';
import { adminDashboardRouter } from './routes/admin/dashboard.js';
import { adminImagesRouter } from './routes/admin/images.js';
import { adminRelationshipsRouter } from './routes/admin/relationships.js';
import { adminStoriesRouter } from './routes/admin/stories.js';
import { authRouter } from './routes/admin/auth.js';
import { taxonomyRouter } from './routes/admin/taxonomy.js';
import { artistsRouter } from './routes/public/artists.js';
import { characterRouter } from './routes/public/character.js';
import { galleryRouter } from './routes/public/gallery.js';
import { imagesRouter } from './routes/public/images.js';
import { mediaRouter } from './routes/public/media.js';
import { preferencesRouter } from './routes/public/preferences.js';
import { relationshipsRouter } from './routes/public/relationships.js';
import { storiesRouter } from './routes/public/stories.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build the Express app. Deliberately does NOT call listen, so tests can drive
 * it with supertest without binding a port.
 */
export function createApp({ config, db, logger = console }) {
  const app = express();

  app.set('trust proxy', 1);

  const env = nunjucks.configure(path.join(here, 'views'), {
    autoescape: true,
    express: app,
    noCache: config.nodeEnv !== 'production',
  });
  app.set('view engine', 'njk');

  app.locals.db = db;
  app.locals.config = config;

  app.use(express.urlencoded({ extended: false }));

  // Logging goes first so a request that fails inside any later middleware is
  // still recorded. Silent during tests, which supply their own logger.
  app.use(requestLogging({ logger, enabled: config.nodeEnv !== 'test' }));

  // Only src/public is static. data/uploads is served exclusively through the
  // rating-aware /media routes — serving it statically would bypass every
  // NSFW check (FR-012, research R-006).
  app.use(express.static(path.join(here, 'public'), { maxAge: config.nodeEnv === 'production' ? '7d' : 0 }));

  app.use(session({
    name: 'sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    // Rolling: each request pushes the expiry back, so an admin is signed out
    // after SESSION_IDLE_MINUTES of inactivity rather than at a fixed hour.
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      maxAge: config.sessionIdleMs,
    },
  }));

  app.use(csrf());
  app.use(nsfw());

  app.use((req, res, next) => {
    res.locals.currentPath = req.originalUrl;
    res.locals.isAdmin = Boolean(req.session?.isAdmin);
    next();
  });

  app.use(preferencesRouter());
  app.use(galleryRouter());
  app.use(characterRouter());
  app.use(storiesRouter());
  app.use(relationshipsRouter());
  app.use(artistsRouter());
  app.use(mediaRouter());
  app.use(imagesRouter());

  // Sign-in routes come BEFORE the gate, everything else after it: an
  // unauthenticated request must never reach a rendered admin screen (FR-020).
  app.use(authRouter());

  const upload = uploads(config);
  app.use('/admin', requireAdmin());
  app.use(adminDashboardRouter());
  app.use(adminCharactersRouter(upload));
  app.use(adminImagesRouter(upload));
  app.use(adminStoriesRouter());
  app.use(adminRelationshipsRouter());
  app.use(taxonomyRouter());

  app.use(notFoundHandler());
  app.use(errorHandler({ logger }));

  app.set('nunjucksEnv', env);
  return app;
}
