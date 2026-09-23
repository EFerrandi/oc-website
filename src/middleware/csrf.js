import { randomBytes, timingSafeEqual } from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_FIELD = '_csrf';

function issueToken(session) {
  if (!session.csrfToken) {
    session.csrfToken = randomBytes(32).toString('base64url');
  }
  return session.csrfToken;
}

function matches(expected, received) {
  if (typeof received !== 'string' || received.length === 0) return false;

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Session-bound synchroniser token (research R-009: `csurf` is deprecated).
 *
 * Exposes `res.locals.csrfToken` for templates and rejects unsafe requests
 * whose submitted token does not match the session's.
 */
export function csrf() {
  return function csrfMiddleware(req, res, next) {
    if (!req.session) return next(new Error('csrf middleware requires a session'));

    const token = issueToken(req.session);
    res.locals.csrfToken = token;
    res.locals.csrfField = CSRF_FIELD;

    if (SAFE_METHODS.has(req.method)) return next();

    // Multipart bodies have not been parsed yet at this point — multer runs
    // later in the route. Those routes must call verifyCsrf() themselves
    // immediately after the upload middleware.
    if (req.is('multipart/form-data')) {
      req.csrfDeferred = true;
      return next();
    }

    const submitted = req.body?.[CSRF_FIELD] ?? req.get('x-csrf-token');
    if (!matches(token, submitted)) {
      res.status(403);
      return next(new Error('Invalid or missing CSRF token'));
    }

    return next();
  };
}

/**
 * CSRF check for multipart routes. Must be placed directly after the upload
 * middleware, where req.body is finally populated.
 */
export function verifyCsrf() {
  return function verifyCsrfMiddleware(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const submitted = req.body?.[CSRF_FIELD] ?? req.get('x-csrf-token');
    if (!matches(req.session?.csrfToken ?? '', submitted)) {
      res.status(403);
      return next(new Error('Invalid or missing CSRF token'));
    }

    req.csrfDeferred = false;
    return next();
  };
}
