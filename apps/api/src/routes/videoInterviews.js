const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);

// Mock video interviews data
const mockVideoInterviews = [];

// @desc    Get all video interviews
// @route   GET /api/video-interviews
// @access  Private
router.get('/', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: mockVideoInterviews,
    count: mockVideoInterviews.length
  });
}));

// @desc    Get single video interview
// @route   GET /api/video-interviews/:id
// @access  Private
router.get('/:id', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const interview = mockVideoInterviews.find(i => i.id === req.params.id);
  
  if (!interview) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Video interview not found'
    });
  }
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: interview
  });
}));

// @desc    Create video interview
// @route   POST /api/video-interviews
// @access  Private
router.post('/', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const { title, candidateId, scheduledAt, duration } = req.body;
  
  const newInterview = {
    id: String(mockVideoInterviews.length + 1),
    title,
    candidateId,
    scheduledAt,
    duration,
    status: 'scheduled',
    createdAt: new Date()
  };
  
  mockVideoInterviews.push(newInterview);
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Video interview created successfully',
    data: newInterview
  });
}));

module.exports = router;
