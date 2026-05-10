const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Company = require('../models/Company');
const HR = require('../models/HR');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  TIME_CONSTANTS 
} = require('../utils/constants');
const logger = require('../utils/logger');

// Look up an account across all collections in parallel.
// Preference order on collision (rare): SuperAdmin > Company > HR > User.
const findUserByEmail = async (email) => {
  const [superAdmin, company, hr, user] = await Promise.all([
    SuperAdmin.findOne({ email }).select('+password'),
    Company.findOne({ email }).select('+password'),
    HR.findOne({ email }).select('+password').populate('company'),
    User.findOne({ email }).select('+password').populate('company'),
  ]);
  if (superAdmin) return { user: superAdmin, userType: 'SuperAdmin' };
  if (company) return { user: company, userType: 'Company' };
  if (hr) return { user: hr, userType: 'HR' };
  if (user) return { user, userType: 'User' };
  return null;
};

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: TIME_CONSTANTS.JWT_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: TIME_CONSTANTS.REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user across all collections
  const result = await findUserByEmail(email);
  
  if (!result) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_CREDENTIALS
    });
  }

  const { user, userType } = result;

  // Check if account is locked
  if (user.isLocked) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.ACCOUNT_LOCKED
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    await user.incLoginAttempts();
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_CREDENTIALS
    });
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Set secure cookie with refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Remove password from response
  user.password = undefined;

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    data: {
      user,
      userType,
      token: accessToken
    }
  });
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: ERROR_MESSAGES.USER_EXISTS
    });
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Set secure cookie with refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Remove password from response
  user.password = undefined;

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: SUCCESS_MESSAGES.USER_REGISTERED,
    data: {
      user,
      token: accessToken
    }
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.cookies;

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.UNAUTHORIZED
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN
      });
    }

    const { accessToken } = generateTokens(user._id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        token: accessToken
      }
    });
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken');

  // Drop the cached auth lookup for this token so it can't be reused.
  try {
    require('../middleware/authCache').invalidate(req.authToken);
  } catch (_) {}

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
  });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('company');
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, profile } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { firstName, lastName, profile },
    { new: true, runValidators: true }
  );
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.USER_UPDATED,
    data: { user }
  });
});

// Placeholder functions for other auth methods
const forgotPassword = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Forgot password functionality not implemented yet'
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Reset password functionality not implemented yet'
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Email verification functionality not implemented yet'
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Resend verification functionality not implemented yet'
  });
});

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
};
