const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const HR = require('../models/HR');
const User = require('../models/User');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const { asyncHandler } = require('./errorHandler');

// Helper function to find user by ID across all collections
const findUserById = async (userId) => {
  // Try SuperAdmin first
  let user = await SuperAdmin.findById(userId);
  if (user) return { user, userType: 'SuperAdmin' };
  
  // Try Admin
  user = await Admin.findById(userId).populate('company');
  if (user) return { user, userType: 'Admin' };
  
  // Try HR
  user = await HR.findById(userId).populate('company');
  if (user) return { user, userType: 'HR' };
  
  // Try regular User
  user = await User.findById(userId).populate('company');
  if (user) return { user, userType: 'User' };
  
  return null;
};

// Protect routes - verify JWT token
const auth = asyncHandler(async (req, res, next) => {
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
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from token across all collections
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

    req.user = user;
    req.userType = userType;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN
    });
  }
});

module.exports = { auth };
