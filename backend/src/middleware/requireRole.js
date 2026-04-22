/**
 * requireRole — Role-based access control middleware
 * Must be used AFTER requireAuth
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'moderator')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

/**
 * requireAdmin — Shorthand for requireRole('admin')
 */
const requireAdmin = requireRole('admin');

/**
 * requireModerator — Accepts both admin and moderator
 */
const requireModerator = requireRole('admin', 'moderator');

module.exports = { requireRole, requireAdmin, requireModerator };
