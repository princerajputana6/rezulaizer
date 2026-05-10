const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const HR = require('../models/HR');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

// @desc    Get all HR users
// @route   GET /api/hr/users
// @access  Private (Company, SuperAdmin)
router.get('/users', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const query = {};
  
  if (req.userType !== 'SuperAdmin') {
    query.company = req.user._id;
  }
  
  const hrUsers = await HR.find(query)
    .populate('company', 'name email')
    .select('-password')
    .sort({ createdAt: -1 });
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: hrUsers,
    count: hrUsers.length
  });
}));

// @desc    Create HR user
// @route   POST /api/hr/users
// @access  Private (Company, SuperAdmin)
router.post('/users', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;
  
  const companyId = req.userType === 'SuperAdmin' ? req.body.company : req.user._id;
  
  const existingHR = await HR.findOne({ email });
  if (existingHR) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'HR user with this email already exists'
    });
  }
  
  const hrUser = await HR.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    company: companyId
  });
  
  const hrUserResponse = await HR.findById(hrUser._id)
    .populate('company', 'name email')
    .select('-password');
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'HR user created successfully',
    data: hrUserResponse
  });
}));

// @desc    Get single HR user
// @route   GET /api/hr/users/:id
// @access  Private (Company, SuperAdmin)
router.get('/users/:id', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const hrUser = await HR.findById(req.params.id)
    .populate('company', 'name email')
    .select('-password');
  
  if (!hrUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'HR user not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && hrUser.company._id.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: hrUser
  });
}));

// @desc    Update HR user
// @route   PUT /api/hr/users/:id
// @access  Private (Company, SuperAdmin)
router.put('/users/:id', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  let hrUser = await HR.findById(req.params.id);
  
  if (!hrUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'HR user not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && hrUser.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const { firstName, lastName, email, phone, isActive } = req.body;
  
  hrUser = await HR.findByIdAndUpdate(
    req.params.id,
    { firstName, lastName, email, phone, isActive },
    { new: true, runValidators: true }
  ).populate('company', 'name email').select('-password');
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'HR user updated successfully',
    data: hrUser
  });
}));

// @desc    Delete HR user
// @route   DELETE /api/hr/users/:id
// @access  Private (Company, SuperAdmin)
router.delete('/users/:id', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const hrUser = await HR.findById(req.params.id);
  
  if (!hrUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'HR user not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && hrUser.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  await HR.findByIdAndDelete(req.params.id);
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'HR user deleted successfully'
  });
}));

// ============================================
// BACKWARD COMPATIBILITY ROUTES
// Support both /api/hr/users and /api/hr-users
// ============================================

// When accessed via /api/hr-users (no /users suffix needed)
router.get('/', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const query = {};
  
  if (req.userType !== 'SuperAdmin') {
    query.company = req.user._id;
  }
  
  const hrUsers = await HR.find(query)
    .populate('company', 'name email')
    .select('-password')
    .sort({ createdAt: -1 });
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: hrUsers,
    count: hrUsers.length
  });
}));

router.post('/', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;
  
  const companyId = req.userType === 'SuperAdmin' ? req.body.company : req.user._id;
  
  const existingHR = await HR.findOne({ email });
  if (existingHR) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'HR user with this email already exists'
    });
  }
  
  const hrUser = await HR.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    company: companyId
  });
  
  const hrUserResponse = await HR.findById(hrUser._id)
    .populate('company', 'name email')
    .select('-password');
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'HR user created successfully',
    data: hrUserResponse
  });
}));

router.get('/:id', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const hrUser = await HR.findById(req.params.id)
    .populate('company', 'name email')
    .select('-password');
  
  if (!hrUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'HR user not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && hrUser.company._id.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: hrUser
  });
}));

router.put('/:id', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  let hrUser = await HR.findById(req.params.id);
  
  if (!hrUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'HR user not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && hrUser.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const { firstName, lastName, email, phone, isActive } = req.body;
  
  hrUser = await HR.findByIdAndUpdate(
    req.params.id,
    { firstName, lastName, email, phone, isActive },
    { new: true, runValidators: true }
  ).populate('company', 'name email').select('-password');
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'HR user updated successfully',
    data: hrUser
  });
}));

router.delete('/:id', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const hrUser = await HR.findById(req.params.id);
  
  if (!hrUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'HR user not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && hrUser.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  await HR.findByIdAndDelete(req.params.id);
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'HR user deleted successfully'
  });
}));

module.exports = router;
