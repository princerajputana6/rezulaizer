const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

// Mock JD Templates data
const mockTemplates = [
  {
    id: '1',
    title: 'Software Engineer',
    category: 'Engineering',
    description: 'Full-stack software engineer position',
    requirements: ['3+ years experience', 'JavaScript', 'React', 'Node.js'],
    responsibilities: ['Develop features', 'Code reviews', 'Collaborate with team']
  },
  {
    id: '2',
    title: 'Product Manager',
    category: 'Product',
    description: 'Product manager for SaaS platform',
    requirements: ['5+ years experience', 'Agile', 'Stakeholder management'],
    responsibilities: ['Define roadmap', 'Prioritize features', 'Work with engineering']
  }
];

// @desc    Get all JD templates
// @route   GET /api/jd-templates
// @access  Private
router.get('/', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: mockTemplates,
    count: mockTemplates.length
  });
}));

// @desc    Get single JD template
// @route   GET /api/jd-templates/:id
// @access  Private
router.get('/:id', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const template = mockTemplates.find(t => t.id === req.params.id);
  
  if (!template) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Template not found'
    });
  }
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: template
  });
}));

// @desc    Create JD template
// @route   POST /api/jd-templates
// @access  Private
router.post('/', authorize(['SuperAdmin', 'Company']), asyncHandler(async (req, res) => {
  const { title, category, description, requirements, responsibilities } = req.body;
  
  const newTemplate = {
    id: String(mockTemplates.length + 1),
    title,
    category,
    description,
    requirements,
    responsibilities
  };
  
  mockTemplates.push(newTemplate);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Template created successfully',
    data: newTemplate
  });
}));

module.exports = router;
