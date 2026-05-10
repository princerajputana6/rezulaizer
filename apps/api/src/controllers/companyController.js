const Company = require('../models/Company');
const User = require('../models/User');
const Activity = require('../models/Activity');
const bcrypt = require('bcryptjs');
const { sendCompanyCredentials } = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  USER_ROLES 
} = require('../utils/constants');
const logger = require('../utils/logger');

// Helper function to generate random password
const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// @desc    Create company
// @route   POST /api/companies
// @access  Private (Super Admin only)
const createCompany = asyncHandler(async (req, res) => {
  const { name, domain, description, industry, website, address, contact } = req.body;

  // Check if company with domain already exists
  const existingCompany = await Company.findOne({ domain });
  if (existingCompany) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Company with this domain already exists'
    });
  }

  // Check if company with email already exists
  const existingEmail = await Company.findOne({ email: contact.email });
  if (existingEmail) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Company with this email already exists'
    });
  }

  // Generate temporary password
  const temporaryPassword = generatePassword(12);

  // Create company with authentication fields
  const company = await Company.create({
    name,
    domain,
    description,
    industry,
    website,
    address,
    contact: {
      phone: contact.phone
    },
    // Authentication fields
    email: contact.email,
    password: temporaryPassword,
    firstName: contact.email.split('@')[0], // Use email prefix as first name
    lastName: 'Admin',
    isActive: true,
    isEmailVerified: false,
    permissions: {
      manageUsers: true,
      viewReports: true,
      manageTests: true,
      manageSettings: true
    },
    createdBy: req.user.id
  });

  // Create activity for company creation
  try {
    await Activity.createActivity({
      title: 'New company registered',
      description: `${name} - ${new Date().toLocaleString()}`,
      type: 'company_registration',
      icon: 'Building2',
      color: 'bg-green-600',
      relatedEntity: {
        entityType: 'Company',
        entityId: company._id
      },
      priority: 8
    });
  } catch (activityError) {
    console.log('Failed to create activity:', activityError.message);
  }

  // Send email with credentials
  try {
    await sendCompanyCredentials(contact.email, {
      companyName: name,
      contactPerson: contact.email.split('@')[0],
      email: contact.email,
      password: temporaryPassword
    });
    console.log(`✅ Credentials email sent to: ${contact.email}`);
  } catch (emailError) {
    console.error('❌ Failed to send credentials email:', emailError.message);
    // Don't fail the company creation if email fails
  }

  console.log(`Company created: ${name}`);
  console.log(`Company email: ${contact.email}`);
  console.log(`Temporary password: ${temporaryPassword}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: SUCCESS_MESSAGES.USER_CREATED.replace('User', 'Company'),
    data: { 
      company,
      temporaryPassword,
      adminEmail: contact.email
    }
  });
});

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private (Super Admin only)
const getCompanies = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    Company.find()
      .populate('createdBy', 'firstName lastName email')
      .populate('userCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Company.countDocuments(),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private (Super Admin, Company Admin)
const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email')
    .populate('userCount');

  if (!company) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Check if user has access to this company
  if (req.userType !== 'SuperAdmin') {
    // If user is a Company, they can only access their own data
    if (req.userType === 'Company' && req.user._id.toString() !== company._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }
    // For other user types, check company association
    else if (req.userType !== 'Company' && req.user.company?.toString() !== company._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { company }
  });
});

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (Super Admin, Company Admin)
const updateCompany = asyncHandler(async (req, res) => {
  const { name, description, industry, website, address, contact, settings } = req.body;

  const company = await Company.findById(req.params.id);

  if (!company) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Check if user has access to this company
  if (req.userType !== 'SuperAdmin') {
    // If user is a Company, they can only access their own data
    if (req.userType === 'Company' && req.user._id.toString() !== company._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }
    // For other user types, check company association
    else if (req.userType !== 'Company' && req.user.company?.toString() !== company._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }
  }

  // Update company
  const updatedCompany = await Company.findByIdAndUpdate(
    req.params.id,
    { name, description, industry, website, address, contact, settings },
    { new: true, runValidators: true }
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.USER_UPDATED.replace('User', 'Company'),
    data: { company: updatedCompany }
  });
});

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private (Super Admin only)
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Check if company has users
  const userCount = await User.countDocuments({ company: company._id });
  if (userCount > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Cannot delete company with existing users'
    });
  }

  await Company.findByIdAndDelete(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.USER_DELETED.replace('User', 'Company')
  });
});

// @desc    Get company stats
// @route   GET /api/companies/:id/stats
// @access  Private (Super Admin, Company Admin)
const getCompanyStats = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Check if user has access to this company
  if (req.userType !== 'SuperAdmin') {
    // If user is a Company, they can only access their own data
    if (req.userType === 'Company' && req.user._id.toString() !== company._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }
    // For other user types, check company association
    else if (req.userType !== 'Company' && req.user.company?.toString() !== company._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN
      });
    }
  }

  const [totalUsers, activeUsers] = await Promise.all([
    User.countDocuments({ company: company._id }),
    User.countDocuments({ company: company._id, isActive: true }),
  ]);
  const stats = { totalUsers, activeUsers };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { stats }
  });
});

// @desc    Register company (public self-registration)
// @route   POST /api/companies/register
// @access  Public
const registerCompany = asyncHandler(async (req, res) => {
  const { 
    name, domain, industry, size, contactPerson, phone, address, 
    password, subscriptionPlan, credits, isActive 
  } = req.body;

  // Check if company with domain already exists
  const existingCompany = await Company.findOne({ domain });
  if (existingCompany) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Company with this domain already exists'
    });
  }

  // Check if company with email already exists
  const existingEmail = await Company.findOne({ email: contactPerson.email });
  if (existingEmail) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Company with this email already exists'
    });
  }

  // Create company
  const company = await Company.create({
    name,
    domain,
    industry,
    size,
    firstName: contactPerson.name.split(' ')[0],
    lastName: contactPerson.name.split(' ').slice(1).join(' ') || '',
    email: contactPerson.email,
    phone,
    address,
    password,
    subscriptionPlan: subscriptionPlan || 'basic',
    credits: credits || 100,
    isActive: isActive !== undefined ? isActive : true,
    passwordResetRequired: false
  });

  logger.info(`Company registered: ${company.name} (${company.domain})`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Company registered successfully! You can now log in.',
    data: {
      company: {
        id: company._id,
        name: company.name,
        domain: company.domain,
        email: company.email
      }
    }
  });
});

module.exports = {
  createCompany,
  registerCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats
};
