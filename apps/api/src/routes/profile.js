const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');
const Company = require('../models/Company');
const HR = require('../models/HR');
const SuperAdmin = require('../models/SuperAdmin');

router.use(protect);

// @desc    Get current user profile
// @route   GET /api/profile
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  let user;
  
  try {
    switch (req.userType) {
      case 'SuperAdmin':
        user = await SuperAdmin.findById(req.user._id).select('-password');
        break;
      case 'Company':
        user = await Company.findById(req.user._id).select('-password');
        break;
      case 'HR':
        user = await HR.findById(req.user._id)
          .populate('company', 'name email firstName lastName')
          .select('-password');
        break;
      default:
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User type not recognized'
        });
    }
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User profile not found'
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...user.toObject(),
        userType: req.userType
      }
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
}));

// @desc    Update current user profile
// @route   PUT /api/profile
// @access  Private
router.put('/', asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, name, companyName, industry, website } = req.body;
  
  try {
    let user;
    let Model;
    
    switch (req.userType) {
      case 'SuperAdmin':
        Model = SuperAdmin;
        break;
      case 'Company':
        Model = Company;
        break;
      case 'HR':
        Model = HR;
        break;
      default:
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User type not recognized'
        });
    }
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    
    // Company-specific fields
    if (req.userType === 'Company') {
      if (name) updateData.name = name;
      if (companyName) updateData.name = companyName; // Support both field names
      if (industry) updateData.industry = industry;
      if (website) updateData.website = website;
    }
    
    user = await Model.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (req.userType === 'HR') {
      user = await user.populate('company', 'name email firstName lastName');
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...user.toObject(),
        userType: req.userType
      }
    });
  } catch (error) {
    console.error('[Profile] Error updating profile:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
}));

// @desc    Change password
// @route   PUT /api/profile/password
// @access  Private
router.put('/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide current and new password'
    });
  }
  
  let Model;
  
  switch (req.userType) {
    case 'SuperAdmin':
      Model = SuperAdmin;
      break;
    case 'Company':
      Model = Company;
      break;
    case 'HR':
      Model = HR;
      break;
    default:
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
  }
  
  const user = await Model.findById(req.user._id);
  
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }
  
  user.password = newPassword;
  await user.save();
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password changed successfully'
  });
}));

module.exports = router;
