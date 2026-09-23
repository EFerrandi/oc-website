/**
 * One structured line per request.
 *
 * Deliberately records no cookie, query string or request body: the NSFW
 * opt-in cookie and admin credentials both travel that way, and a log file is
 * exactly the kind of place that quietly outlives the data it describes.
 */
export function requestLogging({ logger = console, enabled = true } = {}) {
  return function logRequest(req, res, next) {
    if (!enabled) return next();

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      const entry = {
        time: new Date().toISOString(),
        method: req.method,
        // `req.path` excludes the query string, which can carry filter values.
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      };

      const line = JSON.stringify(entry);

      if (res.statusCode >= 500) logger.error(line);
      else logger.info(line);
    });

    return next();
  };
}
