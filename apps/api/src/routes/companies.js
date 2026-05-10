const express = require('express');
const { body } = require('express-validator');
const {
  createCompany,
  registerCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanyStats
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Validation rules
const companyValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('domain')
    .trim()
    .isLength({ min: 3, max: 100 })
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .withMessage('Please provide a valid domain name'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry cannot exceed 100 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL')
];

const registrationValidation = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('domain').trim().notEmpty().matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/).withMessage('Valid domain is required'),
  body('industry').notEmpty().withMessage('Industry is required'),
  body('size').notEmpty().withMessage('Company size is required'),
  body('contactPerson.name').trim().notEmpty().withMessage('Contact person name is required'),
  body('contactPerson.email').isEmail().withMessage('Valid contact email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.country').trim().notEmpty().withMessage('Country is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// Public registration route (before protect middleware)
router.post('/register', registrationValidation, validate, registerCompany);

// All routes below require authentication
router.use(protect);

const Company = require('../models/Company');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get current company's structured profile blob
// @route   GET /api/companies/profile
router.get('/profile', authorize(['Company']), asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user._id).select('-password');
  if (!company) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Company not found' });
  }
  const profile = company.profile && Object.keys(company.profile).length
    ? company.profile
    : {
        company: {
          companyName: company.name || '',
          website: company.website || '',
          industry: company.industry || '',
          size: company.size || '',
        },
        address: {
          line1: company.address?.street || '',
          line2: '',
          city: company.address?.city || '',
          state: company.address?.state || '',
          country: company.address?.country || '',
          pincode: company.address?.zipCode || '',
        },
        contact: {
          name: '',
          email: company.email || '',
          phone: company.contact?.phone || '',
        },
        legal: { gst: '', pan: '', cin: '' },
        banking: { accountName: '', accountNumber: '', ifsc: '', bankName: '', branch: '' },
        billing: { billingEmail: company.email || '', billingAddress: '', currency: 'INR' },
      };
  res.json({ success: true, data: { profile } });
}));

// @desc    Save current company's structured profile blob
// @route   PUT /api/companies/profile
router.put('/profile', authorize(['Company']), asyncHandler(async (req, res) => {
  const { profile } = req.body || {};
  if (!profile || typeof profile !== 'object') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'profile body required' });
  }
  const update = { profile };
  if (profile.company?.companyName) update.name = profile.company.companyName;
  if (profile.company?.website) update.website = profile.company.website;
  if (profile.company?.industry) update.industry = profile.company.industry;
  if (profile.company?.size) update.size = profile.company.size;
  if (profile.address) {
    update.address = {
      street: profile.address.line1 || '',
      city: profile.address.city || '',
      state: profile.address.state || '',
      country: profile.address.country || '',
      zipCode: profile.address.pincode || '',
    };
  }
  if (profile.contact?.phone) update['contact.phone'] = profile.contact.phone;

  const company = await Company.findByIdAndUpdate(req.user._id, update, {
    new: true,
    runValidators: false,
  }).select('-password');
  res.json({ success: true, data: { profile: company.profile } });
}));

// Routes
router.post('/',
  authorize(['SuperAdmin']), 
  companyValidation, 
  validate, 
  createCompany
);

router.get('/', 
  authorize(['SuperAdmin']), 
  getCompanies
);

router.get('/:id', 
  authorize(['SuperAdmin', 'Company']), 
  getCompany
);

router.put('/:id', 
  authorize(['SuperAdmin', 'Company']), 
  companyValidation, 
  validate, 
  updateCompany
);

router.delete('/:id', 
  authorize(['SuperAdmin']), 
  deleteCompany
);

router.get('/:id/stats', 
  authorize(['SuperAdmin', 'Company']), 
  getCompanyStats
);

module.exports = router;
