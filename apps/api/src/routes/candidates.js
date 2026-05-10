const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  uploadResume,
  getCandidateStats,
  parseResumeAndCreateCandidate,
  sendAssessmentInvite,
  validateAssessmentToken,
  assessmentLogin
} = require('../controllers/candidateController');

// Configure multer for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF, DOC, DOCX files
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  }
});

// Public assessment routes (no auth required)
router.get('/assessment/validate/:token', validateAssessmentToken);
router.post('/assessment/login', assessmentLogin);

// Public video-interview token validation. Marks the candidate as "appeared".
const CandidatePublic = require('../models/Candidate');
router.get('/video-interview/validate/:token', require('../middleware/errorHandler').asyncHandler(async (req, res) => {
  const candidate = await CandidatePublic.findOne({ videoInterviewToken: req.params.token })
    .populate('company', 'name')
    .lean();
  if (!candidate) return res.status(404).json({ success: false, message: 'Invalid or expired interview link' });
  // Mark appeared if first hit
  if (!candidate.videoInterviewAppearedAt) {
    await CandidatePublic.updateOne({ _id: candidate._id }, {
      videoInterviewAppearedAt: new Date(),
      workflowStage: 'video_interview_appeared',
    });
  }
  res.json({
    success: true,
    data: {
      candidate: {
        id: candidate._id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
      },
      company: candidate.company,
    },
  });
}));

// Apply authentication to all routes
router.use(protect);

// Routes
router.route('/')
  .get(authorize(['SuperAdmin', 'Company']), getCandidates)
  .post(authorize(['SuperAdmin', 'Company']), createCandidate);

router.route('/stats')
  .get(authorize(['SuperAdmin', 'Company']), getCandidateStats);

// ===== Hiring-pipeline list endpoints =====
// IMPORTANT: these literal paths MUST be registered BEFORE the `/:id` route
// — otherwise Express matches `/:id` first and treats "results", "passed",
// "selected", etc. as candidate IDs and returns 404 "Resource not found".
{
  const { asyncHandler } = require('../middleware/errorHandler');
  const { HTTP_STATUS } = require('../utils/constants');
  const Candidate = require('../models/Candidate');

  const companyScope = (req) => (req.userType === 'SuperAdmin'
    ? {}
    : { company: req.user.company || req.user._id });

  // All candidates with their latest assessment score (for /tests page).
  router.get('/results', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
    const { minPercentage, maxPercentage, status, search, page = 1, limit = 50 } = req.query;
    const query = { ...companyScope(req), latestAssessmentAt: { $ne: null } };
    if (status === 'passed') query.latestAssessmentPassed = true;
    if (status === 'failed') query.latestAssessmentPassed = false;
    if (minPercentage != null) query.latestAssessmentPercentage = { ...(query.latestAssessmentPercentage || {}), $gte: Number(minPercentage) };
    if (maxPercentage != null) query.latestAssessmentPercentage = { ...(query.latestAssessmentPercentage || {}), $lte: Number(maxPercentage) };
    if (search) {
      const rx = new RegExp(search, 'i');
      query.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
    }
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const [items, total] = await Promise.all([
      Candidate.find(query)
        .select('firstName lastName email phone latestAssessmentScore latestAssessmentPercentage latestAssessmentPassed latestAssessmentAt workflowStage')
        .sort({ latestAssessmentAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Candidate.countDocuments(query),
    ]);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { candidates: items, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
    });
  }));

  router.get('/passed', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
    const threshold = Number(req.query.threshold ?? 60);
    const query = {
      ...companyScope(req),
      latestAssessmentPassed: true,
      latestAssessmentPercentage: { $gte: threshold },
    };
    const items = await Candidate.find(query)
      .select('firstName lastName email phone latestAssessmentScore latestAssessmentPercentage latestAssessmentAt workflowStage videoInterviewSentAt videoInterviewAppearedAt')
      .sort({ latestAssessmentAt: -1 })
      .limit(500)
      .lean();
    res.status(HTTP_STATUS.OK).json({ success: true, data: { candidates: items, threshold } });
  }));

  router.get('/video-interviews', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
    const query = {
      ...companyScope(req),
      $or: [{ videoInterviewSentAt: { $ne: null } }, { videoInterviewAppearedAt: { $ne: null } }],
    };
    const items = await Candidate.find(query)
      .select('firstName lastName email videoInterviewSentAt videoInterviewAppearedAt videoInterviewPassed workflowStage')
      .sort({ videoInterviewSentAt: -1 })
      .limit(500)
      .lean();
    res.status(HTTP_STATUS.OK).json({ success: true, data: { candidates: items } });
  }));

  router.get('/selected', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
    const query = {
      ...companyScope(req),
      workflowStage: { $in: ['selected', 'offer_released', 'video_interview_passed'] },
    };
    const items = await Candidate.find(query)
      .select('firstName lastName email phone latestAssessmentPercentage videoInterviewPassed workflowStage offerReleasedAt')
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    res.status(HTTP_STATUS.OK).json({ success: true, data: { candidates: items } });
  }));
}

router.route('/:id')
  .get(authorize(['SuperAdmin', 'Company']), getCandidate)
  .put(authorize(['SuperAdmin', 'Company']), updateCandidate)
  .delete(authorize(['SuperAdmin', 'Company']), deleteCandidate);

router.route('/:id/resume')
  .post(authorize(['SuperAdmin', 'Company']), upload.single('resume'), uploadResume);

// Alternative route for frontend compatibility
router.route('/upload-resume')
  .post(authorize(['SuperAdmin', 'Company']), upload.single('resume'), uploadResume);

// New route for automatic resume parsing and candidate creation
router.route('/parse-resume')
  .post(authorize(['SuperAdmin', 'Company']), upload.single('resume'), parseResumeAndCreateCandidate);

// Send assessment invitation emails to candidates
router.route('/send-assessment')
  .post(authorize(['SuperAdmin', 'Company']), sendAssessmentInvite);

// Per-candidate alias used by CandidatesPage / CandidateProfile (passes id in URL)
router.post('/:id/send-assessment', authorize(['SuperAdmin', 'Company']), (req, res, next) => {
  req.body = { ...(req.body || {}), candidateIds: [req.params.id] };
  return sendAssessmentInvite(req, res, next);
});

// ===== Hiring pipeline action endpoints (POST /:id/...) =====
// (GET list endpoints — /results, /passed, /selected, /video-interviews —
// live above the /:id route registration to avoid Express matching /:id first.)
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const crypto = require('crypto');

const companyScope = (req) => (req.userType === 'SuperAdmin'
  ? {}
  : { company: req.user.company || req.user._id });

// Send the video interview invite (auto path replacing the manual scheduler).
router.post('/:id/send-video-interview', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const candidate = await Candidate.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!candidate) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Candidate not found' });
  
  const token = crypto.randomBytes(24).toString('hex');
  candidate.videoInterviewToken = token;
  candidate.videoInterviewSentAt = new Date();
  candidate.workflowStage = 'video_interview_invited';
  await candidate.save();
  
  const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const interviewUrl = `${base}/interview/${token}`;
  const company = await Company.findById(candidate.company).select('name').lean();
  
  const { sendVideoInterviewInvite } = require('../services/emailService');
  
  try {
    await sendVideoInterviewInvite(candidate.email, {
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      companyName: company?.name || 'the team',
      token,
      interviewUrl,
    });
    console.log('[video-invite] Email sent successfully to:', candidate.email);
  } catch (e) {
    console.error('[video-invite] Email failed:', e);
    // Don't fail the request if email fails, but log it
  }
  
  res.json({ success: true, message: 'Video interview invite sent', data: { interviewUrl } });
}));

// Mark the video interview round outcome (pass/fail) and notify the candidate.
router.post('/:id/video-interview/result', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const { passed } = req.body || {};
  const candidate = await Candidate.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!candidate) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Candidate not found' });
  candidate.videoInterviewPassed = !!passed;
  candidate.workflowStage = passed ? 'selected' : 'video_interview_failed';
  await candidate.save();
  const company = await Company.findById(candidate.company).select('name').lean();
  const { sendVideoInterviewResultEmail } = require('../services/emailService');
  sendVideoInterviewResultEmail(candidate.email, {
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    companyName: company?.name || 'the team',
    passed: !!passed,
  }).catch((e) => console.warn('[video-result] email failed:', e?.message));
  res.json({ success: true, message: passed ? 'Marked selected' : 'Marked rejected', data: { workflowStage: candidate.workflowStage } });
}));

// Release the offer letter.
router.post('/:id/release-offer', authorize(['SuperAdmin', 'Company', 'HR']), asyncHandler(async (req, res) => {
  const { role, salary, startDate, message } = req.body || {};
  const candidate = await Candidate.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!candidate) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Candidate not found' });
  candidate.workflowStage = 'offer_released';
  candidate.offerReleasedAt = new Date();
  await candidate.save();
  const company = await Company.findById(candidate.company).select('name').lean();
  const { sendOfferLetterEmail } = require('../services/emailService');
  sendOfferLetterEmail(candidate.email, {
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    companyName: company?.name || 'the team',
    role, salary, startDate, message,
  }).catch((e) => console.warn('[offer] email failed:', e?.message));
  res.json({ success: true, message: 'Offer letter sent', data: { offerReleasedAt: candidate.offerReleasedAt } });
}));

module.exports = router;
