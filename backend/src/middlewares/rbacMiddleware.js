/**
 * Middleware to check if the authenticated user's role is allowed
 * @param {Array<string>} allowedRoles - Roles allowed to access the route (e.g. ['admin'])
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user session found' });
    }

    const { role } = req.user; // Derived from JWT payload: admin / agent

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: No tiene permisos suficientes para realizar esta acción' });
    }

    next();
  };
}

module.exports = {
  checkRole,
};
