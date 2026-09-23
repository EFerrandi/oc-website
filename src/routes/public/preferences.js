import { Router } from 'express';

import { NSFW_COOKIE } from '../../middleware/nsfw.js';

/**
 * Only same-origin relative paths are accepted as a return target, so the
 * toggle cannot be used as an open redirect.
 */
function safeReturnTo(value) {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function preferencesRouter() {
  const router = Router();

  router.post('/preferences/nsfw', (req, res) => {
    // An unchecked checkbox is simply not submitted, so absence means off.
    const enabled = req.body?.nsfw === '1';

    if (enabled) {
      res.cookie(NSFW_COOKIE, '1', {
        httpOnly: false,
        sameSite: 'lax',
        secure: req.app.locals.config.nodeEnv === 'production',
        path: '/',
        // No maxAge on purpose: the opt-in is a session cookie and clears
        // when the browser closes (FR-009).
      });
    } else {
      res.clearCookie(NSFW_COOKIE, { path: '/' });
    }

    // Returning to the referring URL preserves any active filters (FR-035).
    res.redirect(303, safeReturnTo(req.body?.returnTo));
  });

  return router;
}
