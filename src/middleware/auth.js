/**
 * Gate every /admin route except the sign-in pages.
 *
 * An unauthenticated request is redirected to the sign-in form, never shown a
 * rendered admin screen and never allowed to perform a partial action
 * (FR-020). The original path is carried across so the visitor lands where
 * they were headed.
 */
export function requireAdmin() {
  return function requireAdminMiddleware(req, res, next) {
    if (req.session?.isAdmin) return next();

    const target = encodeURIComponent(req.originalUrl || '/admin');
    return res.redirect(303, `/admin/login?return_to=${target}`);
  };
}
