const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pralaad_fd_crm_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err || !user || !user.role) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired session token. Please sign in again.' 
      });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Administrator (Checker) authorization required for this action.' 
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET
};
