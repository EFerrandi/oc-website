export const NSFW_COOKIE = 'nsfw';

/**
 * Read a raw cookie value from a Cookie header.
 *
 * The value is deliberately NOT trimmed or percent-decoded. We set this cookie
 * ourselves as the literal `1`, so any decoding would only widen what counts
 * as opt-in — `"1 "` and `"%31"` would both become `"1"`. Comparing raw keeps
 * the opt-in surface exactly one string wide (Constitution I).
 */
function readCookie(header, name) {
  if (typeof header !== 'string' || header.length === 0) return undefined;

  for (const part of header.split(';')) {
    // Only leading whitespace is separator noise; it belongs to neither
    // the name nor the value.
    const pair = part.trimStart();
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    if (pair.slice(0, eq) !== name) continue;

    return pair.slice(eq + 1);
  }

  return undefined;
}

/**
 * Resolve the viewer's content rating preference.
 *
 * Constitution Principle I: the safe state is the default. ONLY the exact
 * string "1" enables NSFW content — absent, empty, malformed, and
 * truthy-looking values ("true", "yes", "on", "01") all resolve to off.
 */
export function isNsfwEnabled(req) {
  return readCookie(req.headers?.cookie, NSFW_COOKIE) === '1';
}

export function nsfw() {
  return function nsfwMiddleware(req, res, next) {
    const enabled = isNsfwEnabled(req);

    req.showNsfw = enabled;
    res.locals.showNsfw = enabled;

    // Rating changes the rendered body, so shared caches must not reuse one
    // visitor's response for another.
    res.set('Vary', 'Cookie');
    next();
  };
}
