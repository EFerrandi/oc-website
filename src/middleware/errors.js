/**
 * Error surface.
 *
 * Visitors never see internals. Admin validation errors DO name the failing
 * field, because an admin who cannot tell which field was rejected cannot fix
 * the upload (FR-027).
 */

export class ValidationError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.status = 422;
    this.fieldErrors = fieldErrors;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

export function notFoundHandler() {
  return function handleNotFound(req, res, next) {
    next(new NotFoundError());
  };
}

export function errorHandler({ logger = console } = {}) {
  // eslint-disable-next-line no-unused-vars -- Express requires arity 4.
  return function handleError(err, req, res, next) {
    const candidate = err.status ?? (res.statusCode >= 400 ? res.statusCode : 500);
    const resolved = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
      ? candidate
      : 500;

    if (resolved >= 500) {
      logger.error?.(err);
    }

    res.status(resolved);

    const isAdmin = req.path?.startsWith('/admin');
    const context = {
      status: resolved,
      title: titleFor(resolved),
      message: messageFor(resolved),
      // Field-level detail is admin-only; visitors get the generic message.
      fieldErrors: isAdmin && err instanceof ValidationError ? err.fieldErrors : null,
      detail: isAdmin && err instanceof ValidationError ? err.message : null,
    };

    if (req.accepts(['html', 'json']) === 'json') {
      return res.json(context);
    }

    return res.render('error.njk', context, (renderErr, html) => {
      if (renderErr) {
        logger.error?.(renderErr);
        return res.type('text/plain').send(`${resolved} ${context.title}`);
      }
      return res.send(html);
    });
  };
}

function titleFor(status) {
  if (status === 404) return 'Not found';
  if (status === 403) return 'Forbidden';
  if (status === 422) return 'That could not be saved';
  return 'Something went wrong';
}

function messageFor(status) {
  if (status === 404) return 'We could not find that page.';
  if (status === 403) return 'That request could not be verified. Please try again.';
  if (status === 422) return 'Please check the form and try again.';
  return 'Please try again in a moment.';
}
