import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { verifyPassword } from '../../services/auth.js';

/** Only same-origin relative paths, so sign-in cannot become an open redirect. */
function safeReturnTo(value) {
  if (typeof value !== 'string') return '/admin';
  if (!value.startsWith('/') || value.startsWith('//')) return '/admin';
  return value;
}

export function authRouter() {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).render('admin/login.njk', {
        error: 'Too many sign-in attempts. Please wait a few minutes and try again.',
        returnTo: safeReturnTo(req.body?.return_to),
      });
    },
  });

  router.get('/admin/login', (req, res) => {
    if (req.session?.isAdmin) return res.redirect(303, '/admin');

    return res.render('admin/login.njk', {
      error: null,
      returnTo: safeReturnTo(req.query.return_to),
    });
  });

  router.post('/admin/login', loginLimiter, async (req, res, next) => {
    const returnTo = safeReturnTo(req.body?.return_to);

    try {
      const ok = await verifyPassword(req.body?.password ?? '', req.app.locals.config.adminPasswordHash);

      if (!ok) {
        // Deliberately generic: never reveal which part of the attempt failed.
        return res.status(401).render('admin/login.njk', {
          error: 'Invalid credentials.',
          returnTo,
        });
      }

      // Regenerate before marking the session as admin — session fixation
      // defence: the pre-login session id must never become an admin session.
      return req.session.regenerate((err) => {
        if (err) return next(err);

        req.session.isAdmin = true;
        return req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          return res.redirect(303, returnTo);
        });
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/admin/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('sid');
      return res.redirect(303, '/');
    });
  });

  return router;
}
