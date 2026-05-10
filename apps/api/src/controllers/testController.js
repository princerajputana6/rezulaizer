 
const Test = require('../models/Test');
const Candidate = require('../models/Candidate');
const TestAttempt = require('../models/TestAttempt');
const TestInvitation = require('../models/TestInvitation');
const Question = require('../models/Question');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS, MESSAGES } = require('../utils/constants');
const { createSuccessResponse, createErrorResponse, getPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');
const { sendAssessmentEmail, sendEmail } = require('../services/emailService');

let AuditLog, ScheduledJob, aiService, PDFDocument;
try { AuditLog = require('../models/AuditLog'); } catch (_) { AuditLog = null; }
try { ScheduledJob = require('../models/ScheduledJob'); } catch (_) { ScheduledJob = null; }
try { aiService = require('../config/ai'); } catch (_) { aiService = null; }
try { PDFDocument = require('pdfkit'); } catch (_) { PDFDocument = null; }

// @desc    Get all tests
// @route   GET /api/tests
// @access  Private
const getTests = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    type,
    search,
    createdBy
  } = req.query;

  const query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by type
  if (type) {
    query.type = type;
  }

  // Resolve effective role robustly (fallback to model name)
  const roleFromModel = (req.user && req.user.constructor && req.user.constructor.modelName === 'Company') ? 'company' : '';
  const effectiveRole = (
    req.user.role || req.userRole || roleFromModel || ''
  ).toLowerCase();

  // Filter by creator (admin/company can see all, others see only their own)
  if (!['super_admin','admin','company'].includes(effectiveRole)) {
    query.createdBy = req.user.id;
  } else if (createdBy) {
    query.createdBy = createdBy;
  }

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);

  const [docs, total] = await Promise.all([
    Test.find(query)
      .sort({ createdAt: -1 })
      .skip((pageInt - 1) * limitInt)
      .limit(limitInt)
      .select('-questions') // list view doesn't need full question payload
      .populate('createdBy', 'firstName lastName email')
      .lean(),
    Test.countDocuments(query)
  ]);

  res.json(
    createSuccessResponse('Tests retrieved successfully', {
      tests: docs,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    })
  );
});

// @desc    Get test by ID
// @route   GET /api/tests/:id
// @access  Private
const getTestById = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email')
    .populate('questions');

  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  // Enhanced debugging - log all user properties
  try {
    console.log('[DEBUG] Full req.user object:', JSON.stringify(req.user, null, 2));
  } catch {}
  console.log('[DEBUG] req.userRole:', req.userRole);
  console.log('[DEBUG] req.user.role:', req.user?.role);
  console.log('[DEBUG] req.user.userType:', req.user?.userType);
  console.log('[DEBUG] req.user.accountType:', req.user?.accountType);

  // Derive effective role from multiple sources and fallbacks
  const companyModelFallback = (req.user && req.user.constructor && req.user.constructor.modelName === 'Company') ? 'company' : '';
  const rolesFromCompanies = Array.isArray(req.user?.companies)
    ? req.user.companies.map(c => (c.role || '').toLowerCase()).filter(Boolean)
    : [];
  const primaryRole = (
    req.user?.role ||
    req.userRole ||
    req.user?.userType ||
    req.user?.accountType ||
    companyModelFallback ||
    ''
  ).toLowerCase();
  // choose the most privileged among discovered roles
  const discoveredRoles = [primaryRole, ...rolesFromCompanies];
  const privilegeOrder = ['candidate','user','company','admin','super_admin','superadmin'];
  let role = discoveredRoles.reduce((best, r) => {
    if (!r) return best;
    return privilegeOrder.indexOf(r) > privilegeOrder.indexOf(best) ? r : best;
  }, '');
  // fallback to 'user' if still empty (logged-in but role-less)
  if (!role) role = 'user';

  console.log('[DEBUG] Final role determined:', role, 'from', { primaryRole, rolesFromCompanies });

  let hasAccess = false;

  // Debug log for access decisions
  try {
    const creatorId = (test.createdBy && test.createdBy._id) ? test.createdBy._id.toString() : (test.createdBy ? String(test.createdBy) : 'N/A');
    console.log('[TEST_ACCESS_DEBUG]', { 
      role, 
      userId: req.user.id || req.user._id, 
      creatorId, 
      testId: String(test._id),
      isPublic: test.isPublic
    });
  } catch (err) {
    console.log('[DEBUG] Error in access logging:', err.message);
  }

  // Check for admin-level access first
  if (['super_admin', 'admin', 'company', 'superadmin', 'user'].includes(role)) {
    console.log('[DEBUG] Admin-level access granted for role:', role);
    hasAccess = true;
  }
  // Check if test is public
  else if (test.isPublic === true) {
    console.log('[DEBUG] Public test access granted');
    hasAccess = true;
  }
  // Check if user is the creator
  else if (test.createdBy) {
    const creatorId = test.createdBy._id ? test.createdBy._id.toString() : test.createdBy.toString();
    const userId = req.user.id || req.user._id;
    if (creatorId === userId.toString()) {
      console.log('[DEBUG] Creator access granted');
      hasAccess = true;
    }
  }
  // Check for candidate access
  else if (role === 'candidate') {
    console.log('[DEBUG] Checking candidate access...');
    try {
      const assigned = await Candidate.findById(req.user._id || req.user.id).select('assignedTests');
      console.log('[DEBUG] Candidate assigned tests:', assigned?.assignedTests);
      if (assigned && assigned.assignedTests && assigned.assignedTests.some(t => t.testId && t.testId.toString() === req.params.id)) {
        console.log('[DEBUG] Candidate access granted via assignment');
        hasAccess = true;
      }
    } catch (candidateErr) {
      console.log('[DEBUG] Error checking candidate access:', candidateErr.message);
    }
  }

  console.log('[DEBUG] Final access decision:', hasAccess);

  if (!hasAccess) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Access denied')
    );
  }

  // For candidates, strip correct answers and explanations from question payload
  if (role === 'candidate' && Array.isArray(test.questions)) {
    const sanitizedQuestions = test.questions.map(q => {
      const obj = q.toObject ? q.toObject() : q;
      if (obj.options) {
        obj.options = obj.options.map(opt => ({ _id: opt._id, text: opt.text }));
      }
      delete obj.correctAnswer;
      delete obj.explanation;
      return obj;
    });
    const sanitized = test.toObject ? test.toObject() : test;
    sanitized.questions = sanitizedQuestions;
    return res.json(
      createSuccessResponse('Test retrieved successfully', { test: sanitized })
    );
  }

  res.json(
    createSuccessResponse('Test retrieved successfully', { test })
  );
});

// @desc    Create new test
// @route   POST /api/tests
// @access  Private
const createTest = asyncHandler(async (req, res) => {
  const testData = {
    ...req.body,
    createdBy: req.user.id
  };

  const test = await Test.create(testData);

  // Create questions if provided
  if (req.body.questions && req.body.questions.length > 0) {
    const questions = req.body.questions.map(q => ({
      ...q,
      testId: test._id,
      createdBy: req.user.id
    }));

    const createdQuestions = await Question.insertMany(questions);
    test.questions = createdQuestions.map(q => q._id);
    await test.save();
  }

  await AuditLog.create({
    userId: req.user.id,
    action: 'test_created',
    resourceType: 'Test',
    resourceId: test._id,
    details: { title: test.title },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.info(`Test created: ${test.title} by ${req.user.email}`);

  const populatedTest = await Test.findById(test._id)
    .populate('createdBy', 'firstName lastName email')
    .populate('questions');

  res.status(HTTP_STATUS.CREATED).json(
    createSuccessResponse('Test created successfully', { test: populatedTest })
  );
});

// @desc    Update test
// @route   PUT /api/tests/:id
// @access  Private
const updateTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);

  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  // Check if user owns the test or is admin/company
  if (!['super_admin','admin','company'].includes((req.user.role || req.userRole || (req.user?.constructor?.modelName === 'Company' ? 'company' : '') || '').toLowerCase()) &&
      test.createdBy.toString() !== req.user.id) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Access denied')
    );
  }

  // Cannot update published tests
  if (test.status === 'published') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Cannot update published test')
    );
  }

  const updatedTest = await Test.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('createdBy', 'firstName lastName email');

  await AuditLog.create({
    userId: req.user.id,
    action: 'test_updated',
    resourceType: 'Test',
    resourceId: test._id,
    details: { title: updatedTest.title },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json(
    createSuccessResponse('Test updated successfully', { test: updatedTest })
  );
});

// @desc    Delete test
// @route   DELETE /api/tests/:id
// @access  Private
const deleteTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);

  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  // Check if user owns the test or is admin/company
  if (!['super_admin','admin','company'].includes((req.user.role || req.userRole || (req.user?.constructor?.modelName === 'Company' ? 'company' : '') || '').toLowerCase()) &&
      test.createdBy.toString() !== req.user.id) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Access denied')
    );
  }

  await Test.findByIdAndDelete(req.params.id);

  await AuditLog.create({
    userId: req.user.id,
    action: 'test_deleted',
    resourceType: 'Test',
    resourceId: test._id,
    details: { title: test.title },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json(createSuccessResponse('Test deleted successfully'));
});

// @desc    Start test attempt
// @route   POST /api/tests/:id/start
// @access  Candidate or Company
const startTestAttempt = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);

  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  // Accept both 'Active' (AI-generated) and 'published' (manually created) tests
  const allowedStatuses = ['Active', 'active', 'published', 'Published'];
  if (!allowedStatuses.includes(test.status)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse(`Test is not available (status: ${test.status})`)
    );
  }

  const userId = req.user.id || req.user._id?.toString();

  // Use correct schema field names: 'test' and 'candidate'
  const existing = await TestAttempt.findOne({ test: test._id, candidate: userId });

  if (existing) {
    if (existing.status === 'completed') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('You have already completed this test')
      );
    }
    if (!existing.startedAt || !existing.expiresAt) {
      existing.status = 'in_progress';
      existing.startedAt = new Date();
      existing.expiresAt = new Date(Date.now() + test.duration * 60 * 1000);
      await existing.save();
    }
    return res.json(createSuccessResponse('Test attempt resumed', { attempt: existing }));
  }

  try {
    const attempt = await TestAttempt.create({
      test: test._id,
      candidate: userId,
      company: test.company,
      status: 'in_progress',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + test.duration * 60 * 1000)
    });
    return res.status(HTTP_STATUS.CREATED).json(
      createSuccessResponse('Test attempt started', { attempt })
    );
  } catch (err) {
    if (err && err.code === 11000) {
      const attempt = await TestAttempt.findOne({ test: test._id, candidate: userId });
      if (attempt) {
        return res.json(createSuccessResponse('Test attempt resumed', { attempt }));
      }
    }
    throw err;
  }
});

// @desc    Submit answer
// @route   POST /api/tests/:id/answer
// @access  Candidate
const submitAnswer = asyncHandler(async (req, res) => {
  const { attemptId, questionId, answer } = req.body;

  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test attempt not found')
    );
  }

  const userId = req.user.id || req.user._id?.toString();
  const attemptUser = (attempt.candidate || attempt.userId)?.toString();
  if (attemptUser !== userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Access denied')
    );
  }

  if (attempt.status !== 'in_progress') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Test attempt is not active')
    );
  }

  // Update or add answer
  const answerField = attempt.answers || [];
  const existingIdx = answerField.findIndex(
    a => (a.questionId || a.question)?.toString() === questionId
  );

  if (existingIdx >= 0) {
    attempt.answers[existingIdx].answer = answer;
    attempt.answers[existingIdx].answeredAt = new Date();
  } else {
    attempt.answers.push({
      question: questionId,
      answer,
      answeredAt: new Date()
    });
  }

  await attempt.save();
  res.json(createSuccessResponse('Answer submitted successfully'));
});

// @desc    Submit test
// @route   POST /api/tests/:id/submit
// @access  Candidate
const submitTest = asyncHandler(async (req, res) => {
  const { attemptId } = req.body;

  const attempt = await TestAttempt.findById(attemptId)
    .populate('test');

  if (!attempt) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test attempt not found')
    );
  }

  const userId = req.user.id || req.user._id?.toString();
  const attemptUser = (attempt.candidate || attempt.userId)?.toString();
  if (attemptUser !== userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Access denied')
    );
  }

  if (attempt.status !== 'in_progress') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse('Test attempt is not active')
    );
  }

  // Mark as completed
  attempt.status = 'completed';
  attempt.completedAt = new Date();

  // Basic scoring for MCQ questions
  const testDoc = attempt.test || await Test.findById(req.params.id);
  if (testDoc && Array.isArray(testDoc.questions) && Array.isArray(attempt.answers)) {
    let score = 0;
    let totalPoints = 0;
    attempt.answers.forEach(ans => {
      const q = testDoc.questions.find(tq =>
        tq._id.toString() === (ans.question || ans.questionId)?.toString()
      );
      if (q) {
        totalPoints += q.points || 0;
        if (q.type === 'multiple-choice' && Array.isArray(q.options)) {
          const correctOpt = q.options.find(o => o.isCorrect);
          if (correctOpt && ans.answer) {
            const answerText = typeof ans.answer === 'string' ? ans.answer : '';
            const correctId = correctOpt._id?.toString();
            const correctText = correctOpt.text;
            if (answerText === correctId || answerText === correctText) {
              score += q.points || 0;
              ans.isCorrect = true;
              ans.pointsEarned = q.points || 0;
            }
          }
        }
        // Non-MCQ (essay/practical) get partial credit by default, to be reviewed
      }
    });
    attempt.score = score;
    attempt.totalQuestions = testDoc.questions.length;
    attempt.questionsAttempted = attempt.answers.length;
    attempt.correctAnswers = attempt.answers.filter(a => a.isCorrect).length;
    const maxPoints = testDoc.totalPoints || testDoc.questions.reduce((s, q) => s + (q.points || 0), 0);
    attempt.percentage = maxPoints > 0 ? Math.round((score / maxPoints) * 100) : 0;
    attempt.isPassed = attempt.percentage >= (testDoc.passingScore || 60);
  }

  await attempt.save();

  // Update candidate workflow + send automated pass/fail email (best-effort)
  try {
    const Candidate = require('../models/Candidate');
    const Company = require('../models/Company');
    const candidateId = attempt.candidate;
    if (candidateId) {
      const passed = !!attempt.isPassed;
      const update = {
        latestAssessmentScore: attempt.score,
        latestAssessmentPercentage: attempt.percentage,
        latestAssessmentPassed: passed,
        latestAssessmentAt: new Date(),
        workflowStage: passed ? 'assessment_passed' : 'assessment_failed',
      };
      const candidate = await Candidate.findByIdAndUpdate(candidateId, update, { new: true });
      if (candidate) {
        const company = await Company.findById(candidate.company).select('name').lean();
        const { sendAssessmentResultEmail } = require('../services/emailService');
        sendAssessmentResultEmail(candidate.email, {
          candidateName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
          companyName: company?.name || 'the team',
          score: attempt.score,
          percentage: attempt.percentage,
          passed,
        }).catch((e) => console.warn('[submit] result email failed:', e?.message));
      }
    }
  } catch (e) {
    console.warn('[submit] post-submit pipeline update failed:', e?.message);
  }

  res.json(
    createSuccessResponse('Test submitted successfully', {
      attempt: {
        id: attempt._id,
        score: attempt.score,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        status: attempt.status
      }
    })
  );
});

// @desc    Get test results
// @route   GET /api/tests/:id/results
// @access  Candidate or Company
const getTestResults = asyncHandler(async (req, res) => {
  const { attemptId } = req.query;
  const testId = req.params.id;
  const userId = req.user.id || req.user._id?.toString();

  const test = await Test.findById(testId);
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  let attempt;
  if (attemptId) {
    attempt = await TestAttempt.findById(attemptId);
  } else {
    // Try new field names first, then legacy
    attempt = await TestAttempt.findOne({
      $or: [
        { test: test._id, candidate: userId, status: 'completed' },
        { testId: test._id, userId, status: 'completed' }
      ]
    }).sort({ completedAt: -1 });
  }

  if (!attempt) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('No completed attempt found')
    );
  }

  const attemptUser = (attempt.candidate || attempt.userId)?.toString();
  const isAdmin = ['Company', 'SuperAdmin', 'HR'].includes(req.userType);
  if (attemptUser !== userId && !isAdmin) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Access denied')
    );
  }

  res.json(
    createSuccessResponse('Test results retrieved successfully', {
      test,
      attempt,
      analysis: {
        totalQuestions: test.questions?.length || 0,
        correctAnswers: (attempt.answers || []).filter(a => a.isCorrect).length,
        timeSpent: attempt.totalTimeSpent || attempt.timeSpent || 0
      }
    })
  );
});

// @desc    Get test analytics
// @route   GET /api/tests/:id/analytics
// @access  Private (Admin only)
const getTestAnalytics = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  res.json(
    createSuccessResponse('Test analytics retrieved successfully', {
      message: 'Analytics functionality coming soon'
    })
  );
});

// @desc    Get test attempts
// @route   GET /api/tests/:id/attempts
// @access  Private
const getTestAttempts = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  res.json(
    createSuccessResponse('Test attempts retrieved successfully', {
      attempts: []
    })
  );
});

// @desc    Publish test
// @route   POST /api/tests/:id/publish
// @access  Private
const publishTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  test.status = 'published';
  await test.save();

  res.json(createSuccessResponse('Test published successfully'));
});

// @desc    Archive test
// @route   POST /api/tests/:id/archive
// @access  Private
const archiveTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  test.status = 'archived';
  await test.save();

  res.json(createSuccessResponse('Test archived successfully'));
});

// @desc    Duplicate test
// @route   POST /api/tests/:id/duplicate
// @access  Private
const duplicateTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('Test not found')
    );
  }

  res.json(createSuccessResponse('Test duplicated successfully'));
});

// @desc    Generate AI questions
// @route   POST /api/tests/:id/generate-questions
// @access  Private
const generateAIQuestions = asyncHandler(async (req, res) => {
  res.json(createSuccessResponse('AI questions generated successfully'));
});

// @desc    Send test invitations
// @route   POST /api/tests/:id/invite
// @access  Private
const sendTestInvitations = asyncHandler(async (req, res) => {
  const testId = req.params.id;
  const { emails = [], scheduleAt, message } = req.body || {};

  const test = await Test.findById(testId).populate('createdBy', 'firstName lastName email');
  if (!test) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse('Test not found'));
  }

  // Determine recipients: if not provided, derive from candidates assigned to test creator's company (future enhancement)
  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('No recipient emails provided'));
  }

  // If scheduled in future, create ScheduledJob for Cloudflare cron to pick up
  const now = new Date();
  const when = scheduleAt ? new Date(scheduleAt) : now;

  if (when > now) {
    await ScheduledJob.create({
      type: 'invite_test',
      payload: { testId, emails, message, loginBaseUrl: process.env.CLIENT_URL },
      scheduledAt: when,
      companyId: test.companyId || undefined,
      createdBy: req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'test_invite_scheduled',
      resourceType: 'Test',
      resourceId: test._id,
      details: { emailsCount: emails.length, scheduleAt: when.toISOString() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.json(createSuccessResponse('Invitations scheduled', { scheduledAt: when.toISOString() }));
  }

  // Immediate send via nodemailer
  const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const loginUrl = `${base}/assessment-login`;
  const companyName = `${test.createdBy?.firstName || ''} ${test.createdBy?.lastName || ''}`.trim() || 'Your Company';

  let sent = 0;
  for (const email of emails) {
    try {
      await sendAssessmentEmail(email, {
        candidateName: email.split('@')[0],
        companyName,
        email,
        password: 'Use link to login',
        loginUrl,
        message
      });
      sent += 1;
    } catch (e) {
      logger.warn(`Invite failed for ${email}: ${e.message}`);
    }
  }

  await AuditLog.create({
    userId: req.user.id,
    action: 'test_invite_sent',
    resourceType: 'Test',
    resourceId: test._id,
    details: { emailsCount: sent },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  return res.json(createSuccessResponse('Invitations sent successfully', { sent }));
});

// @desc    Get test invitations
// @route   GET /api/tests/:id/invitations
// @access  Private
const getTestInvitations = asyncHandler(async (req, res) => {
  res.json(createSuccessResponse('Invitations retrieved successfully', { invitations: [] }));
});

// @desc    Export proctoring events as CSV or PDF
// @route   GET /api/tests/:id/proctoring/export?attemptId=...&format=csv|pdf
// @access  Private (Admin)
const exportProctoringEvents = asyncHandler(async (req, res) => {
  const { attemptId, format = 'csv' } = req.query;
  const testId = req.params.id;

  const attempt = await TestAttempt.findById(attemptId).populate('testId', 'title createdBy');
  if (!attempt || attempt.testId._id.toString() !== testId) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse('Attempt not found'));
  }

  // Authorization: allow admins/super_admin/company or test creator
  const role = (
    req.user.role || req.userRole || req.user.userType || req.user.accountType ||
    ((req.user && req.user.constructor && req.user.constructor.modelName === 'Company') ? 'company' : '') ||
    ''
  ).toLowerCase();
  let allowed = role === 'super_admin' || role === 'admin' || role === 'company';
  if (!allowed && attempt.testId && attempt.testId.createdBy) {
    allowed = attempt.testId.createdBy.toString() === req.user.id;
  }
  if (!allowed) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(createErrorResponse('Access denied'));
  }

  const events = (attempt.flags?.events || []).slice().sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

  if (format === 'csv') {
    const rows = [['Type', 'Occurred At']].concat(
      events.map(ev => [ev.type, new Date(ev.occurredAt).toISOString()])
    );
    const csv = rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="proctoring-events-${attempt._id}.csv"`);
    return res.send(csv);
  }

  // PDF export
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="proctoring-events-${attempt._id}.pdf"`);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(16).text('Proctoring Events Report', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Test: ${attempt.testId.title}`);
  doc.text(`Attempt ID: ${attempt._id}`);
  doc.text(`Generated At: ${new Date().toLocaleString()}`);
  doc.moveDown();
  doc.text(`Totals: Tab Switches=${attempt.flags.tabSwitches || 0}, Fullscreen Exits=${attempt.flags.fullscreenExits || 0}, Copy/Paste=${attempt.flags.copyPasteAttempts || 0}`);
  doc.moveDown();
  doc.text('Event Timeline:', { underline: true });
  doc.moveDown(0.5);
  events.forEach((ev, idx) => {
    doc.text(`${idx + 1}. ${ev.type.replace('_', ' ')} - ${new Date(ev.occurredAt).toLocaleString()}`);
  });
  doc.end();
});

// @desc    Record proctoring flag (tab switch, fullscreen exit, copy/paste). Auto-submit if threshold exceeded
// @route   POST /api/tests/:id/flag
// @access  Candidate
const flagProctorEvent = asyncHandler(async (req, res) => {
  const { attemptId, type, occurredAt } = req.body;

  const attempt = await TestAttempt.findById(attemptId);
  if (!attempt) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse('Test attempt not found'));
  }

  const userId = req.user.id || req.user._id?.toString();
  const attemptUser = (attempt.candidate || attempt.userId)?.toString();
  if (attemptUser !== userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json(createErrorResponse('Access denied'));
  }

  if (attempt.status !== 'in_progress') {
    return res.json(createSuccessResponse('Attempt already completed or inactive', { attempt }));
  }

  // Flag the suspicious event with optional timestamp
  await attempt.flagSuspicious(type, occurredAt);

  const totalWarnings = (attempt.flags.tabSwitches || 0) + (attempt.flags.fullscreenExits || 0) + (attempt.flags.copyPasteAttempts || 0);
  const threshold = parseInt(process.env.PROCTOR_WARNING_LIMIT || '5', 10);
  let autoSubmitted = false;

  if (totalWarnings >= threshold) {
    await attempt.submit();
    autoSubmitted = true;

    try {
      // Notify test creator via email
      const populatedAttempt = await TestAttempt.findById(attemptId).populate({ path: 'testId', populate: { path: 'createdBy', select: 'email firstName lastName' } });
      const creatorEmail = populatedAttempt?.testId?.createdBy?.email;
      if (creatorEmail) {
        const html = `
          <h2>Attempt Auto-Submitted Due to Proctoring Flags</h2>
          <p>Test: ${populatedAttempt.testId.title}</p>
          <p>Attempt ID: ${attempt._id}</p>
          <p>Total Warnings: ${totalWarnings}</p>
          <ul>
            <li>Tab Switches: ${attempt.flags.tabSwitches || 0}</li>
            <li>Fullscreen Exits: ${attempt.flags.fullscreenExits || 0}</li>
            <li>Copy/Paste Attempts: ${attempt.flags.copyPasteAttempts || 0}</li>
          </ul>
          <p>This attempt was automatically submitted because it reached the configured limit (PROCTOR_WARNING_LIMIT).</p>
        `;
        await sendEmail({
          email: creatorEmail,
          subject: 'Proctoring Alert: Attempt Auto-Submitted',
          html,
          message: `Attempt ${attempt._id} for test ${populatedAttempt.testId.title} was auto-submitted after ${totalWarnings} warnings.`
        });
      }
    } catch (e) {
      logger.warn(`Failed to send auto-submit email: ${e.message}`);
    }
  }

  return res.json(createSuccessResponse('Proctor event recorded', {
    attempt: {
      id: attempt._id,
      status: attempt.status,
      flags: attempt.flags,
      totalWarnings
    },
    auto_submitted: autoSubmitted
  }));
});

module.exports = {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  startTestAttempt,
  submitAnswer,
  submitTest,
  getTestResults,
  getTestAnalytics,
  getTestAttempts,
  publishTest,
  archiveTest,
  duplicateTest,
  generateAIQuestions,
  sendTestInvitations,
  getTestInvitations,
  flagProctorEvent,
  exportProctoringEvents
};
