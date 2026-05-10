const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Company = require('../models/Company');
const HR = require('../models/HR');
const User = require('../models/User');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const { asyncHandler } = require('./errorHandler');
const authCache = require('./authCache');

// Look up a user across all collections in parallel.
// Returns the first non-null match (preference: SuperAdmin > Company > HR > User).
const findUserById = async (userId) => {
  const [superAdmin, company, hr, user] = await Promise.all([
    SuperAdmin.findById(userId),
    Company.findById(userId),
    HR.findById(userId).populate('company'),
    User.findById(userId).populate('company'),
  ]);
  if (superAdmin) return { user: superAdmin, userType: 'SuperAdmin' };
  if (company) return { user: company, userType: 'Company' };
  if (hr) return { user: hr, userType: 'HR' };
  if (user) return { user, userType: 'User' };
  return null;
};

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.UNAUTHORIZED
    });
  }

  try {
    // Verify token signature/expiry first (cheap, no DB)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Hot path: cache hit avoids 4 Mongo queries
    const cached = authCache.get(token);
    if (cached) {
      req.user = cached.user;
      req.userType = cached.userType;
      req.authToken = token;
      return next();
    }

    const result = await findUserById(decoded.userId);

    if (!result) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    const { user, userType } = result;

    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    authCache.set(token, user, userType);
    req.user = user;
    req.userType = userType;
    req.authToken = token;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN
    });
  }
});

// Authorize specific roles
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.userType || !roles.includes(req.userType)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

/**
 * Candidate auth middleware — accepts the session token issued during assessment login.
 * Falls back to the standard JWT protect middleware if a Bearer JWT is present.
 * Sets req.user = candidate document, req.userType = 'Candidate'
 */
const candidateAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const sessionToken = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!sessionToken) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Candidate session token required'
    });
  }

  // Try candidate session token first
  const Candidate = require('../models/Candidate');
  const candidate = await Candidate.findOne({
    assessmentSessionToken: sessionToken,
    assessmentSessionExpiry: { $gt: new Date() }
  });

  if (candidate) {
    req.user = candidate;
    req.user.id = candidate._id.toString();
    req.userType = 'Candidate';
    return next();
  }

  // Fallback: try as a JWT (company/admin accessing test routes)
  try {
    const decoded = require('jsonwebtoken').verify(sessionToken, process.env.JWT_SECRET || 'your-secret-key');
    const result = await findUserById(decoded.userId);
    if (result) {
      req.user = result.user;
      req.user.id = result.user._id.toString();
      req.userType = result.userType;
      return next();
    }
  } catch (_) {
    // not a valid JWT either
  }

  return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    success: false,
    message: 'Invalid or expired session token'
  });
});

module.exports = { protect, authorize, candidateAuth };
