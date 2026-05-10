const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');
const Job = require('../models/Job');

router.use(protect);

// @desc    Get all job descriptions
// @route   GET /api/job-descriptions
// @access  Private
router.get('/', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const query = {};
  
  if (req.userType !== 'SuperAdmin') {
    query.company = req.user._id;
  }
  
  const jobs = await Job.find(query)
    .populate('company', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: jobs,
    count: jobs.length
  });
}));

// @desc    Get single job description
// @route   GET /api/job-descriptions/:id
// @access  Private
router.get('/:id', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('company', 'name');
  
  if (!job) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Job description not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && job.company._id.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: job
  });
}));

// @desc    Create job description
// @route   POST /api/job-descriptions
// @access  Private
router.post('/', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const companyId = req.userType === 'SuperAdmin' ? req.body.company : req.user._id;
  
  const job = await Job.create({
    ...req.body,
    company: companyId,
    createdBy: req.user._id
  });
  
  const populatedJob = await Job.findById(job._id)
    .populate('company', 'name');
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Job description created successfully',
    data: populatedJob
  });
}));

// @desc    Update job description
// @route   PUT /api/job-descriptions/:id
// @access  Private
router.put('/:id', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  let job = await Job.findById(req.params.id);
  
  if (!job) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Job description not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && job.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  job = await Job.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('company', 'name');
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Job description updated successfully',
    data: job
  });
}));

// @desc    Delete job description
// @route   DELETE /api/job-descriptions/:id
// @access  Private
router.delete('/:id', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  
  if (!job) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Job description not found'
    });
  }
  
  if (req.userType !== 'SuperAdmin' && job.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  await Job.findByIdAndDelete(req.params.id);
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Job description deleted successfully'
  });
}));

// Assessment configuration (mix + per-type timings) per job
const DEFAULT_CFG = {
  mcqCount: 3, outputCount: 1, practicalCount: 1,
  mcqSeconds: 60, outputSeconds: 120, practicalSeconds: 600,
  passingScore: 60,
};

router.get('/:id/assessment-config', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).select('assessmentConfig company').lean();
  if (!job) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Job not found' });
  if (req.userType !== 'SuperAdmin' && job.company?.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
  }
  res.json({ success: true, data: { config: { ...DEFAULT_CFG, ...(job.assessmentConfig || {}) } } });
}));

router.put('/:id/assessment-config', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Job not found' });
  if (req.userType !== 'SuperAdmin' && job.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Access denied' });
  }
  const incoming = req.body || {};
  const cfg = { ...DEFAULT_CFG, ...(job.assessmentConfig || {}) };
  for (const k of Object.keys(DEFAULT_CFG)) {
    if (incoming[k] != null) {
      const n = Number(incoming[k]);
      if (Number.isFinite(n) && n >= 0) cfg[k] = n;
    }
  }
  job.assessmentConfig = cfg;
  await job.save();
  res.json({ success: true, message: 'Assessment configuration saved', data: { config: cfg } });
}));

module.exports = router;
