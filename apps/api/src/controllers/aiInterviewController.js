const AIInterview = require('../models/AIInterview');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');
const aiVideoInterviewService = require('../services/aiVideoInterviewService');
const { sendInterviewInvite } = require('../services/emailService');
const { provisionRoom, setRoomEnabled } = require('../services/roomService');
const logger = require('../utils/logger');

// ─────────────────────────────────────────
// RECRUITER SIDE
// ─────────────────────────────────────────

// @desc    Schedule an AI interview and send invite
// @route   POST /api/ai-interviews
// @access  Private (Company, HR)
const scheduleInterview = asyncHandler(async (req, res) => {
  const {
    candidateId,
    candidateName,
    candidateEmail,
    jobTitle,
    jobDescription,
    round = 1,
    interviewType = 'technical',
    scheduledAt
  } = req.body;

  if (!candidateEmail || !candidateName) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'candidateName and candidateEmail are required'
    });
  }

  // Resolve company
  const companyId = req.user._id;
  const company = await Company.findById(companyId).select('companyName email');
  if (!company) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Company not found' });
  }

  // Resolve candidate doc (optional)
  let candidate = null;
  if (candidateId) {
    candidate = await Candidate.findOne({ _id: candidateId, company: companyId });
  } else {
    candidate = await Candidate.findOne({ email: candidateEmail, company: companyId });
  }

  // Generate AI questions ahead of time
  const candidateProfile = candidate || { firstName: candidateName.split(' ')[0], lastName: candidateName.split(' ')[1] || '', skills: [], experience: 'N/A', currentPosition: jobTitle };
  const questions = await aiVideoInterviewService.generateInterviewQuestions(
    candidateProfile,
    jobDescription,
    round
  );

  // Create interview doc
  const interview = new AIInterview({
    company: companyId,
    candidate: candidate?._id,
    candidateName,
    candidateEmail,
    jobTitle,
    jobDescription,
    round,
    interviewType,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    questions,
    status: 'scheduled',
    createdBy: companyId
  });

  interview.generateToken();

  // Provision 100ms room (non-blocking on failure)
  try {
    const { roomId, candidateCode, hostCode } = await provisionRoom(interview._id.toString());
    interview.roomId = roomId;
    interview.roomCode = candidateCode;
    interview.hostRoomCode = hostCode;
    interview.roomEnabled = true;
  } catch (roomErr) {
    logger.warn(`[aiInterview] Room provisioning skipped: ${roomErr.message}`);
  }

  await interview.save();

  // Send invite email (non-blocking on failure)
  const interviewUrl = interview.candidateJoinUrl;
  try {
    await sendInterviewInvite(candidateEmail, {
      candidateName,
      companyName: company.companyName,
      jobTitle: jobTitle || 'the position',
      round,
      interviewType,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Flexible',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toDateString(),
      interviewUrl,
      duration: questions.length * 5
    });
    interview.status = 'invited';
    await interview.save();
  } catch (mailErr) {
    logger.warn(`[aiInterview] Email failed: ${mailErr.message}`);
  }

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'AI interview scheduled and invite sent',
    data: {
      interviewId: interview._id,
      interviewUrl,
      roomCode: interview.roomCode,
      hostRoomCode: interview.hostRoomCode,
      totalQuestions: questions.length,
      status: interview.status
    }
  });
});

// @desc    List all AI interviews for a company
// @route   GET /api/ai-interviews
// @access  Private (Company, HR)
const listInterviews = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { company: req.user._id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [interviews, total] = await Promise.all([
    AIInterview.find(query)
      .populate('candidate', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    AIInterview.countDocuments(query)
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: interviews,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
  });
});

// @desc    Get single AI interview (recruiter view with full data)
// @route   GET /api/ai-interviews/:id
// @access  Private (Company, HR)
const getInterview = asyncHandler(async (req, res) => {
  const interview = await AIInterview.findOne({
    _id: req.params.id,
    company: req.user._id
  }).populate('candidate', 'firstName lastName email skills experience');

  if (!interview) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Interview not found' });
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: interview });
});

// @desc    Cancel an AI interview
// @route   DELETE /api/ai-interviews/:id
// @access  Private (Company, HR)
const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await AIInterview.findOne({ _id: req.params.id, company: req.user._id });
  if (!interview) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Interview not found' });
  }

  interview.status = 'cancelled';
  if (interview.roomId) {
    setRoomEnabled(interview.roomId, false).catch(() => {});
  }
  await interview.save();

  res.status(HTTP_STATUS.OK).json({ success: true, message: 'Interview cancelled' });
});

// @desc    Manually trigger evaluation for a completed interview
// @route   POST /api/ai-interviews/:id/evaluate
// @access  Private (Company, HR)
const evaluateInterview = asyncHandler(async (req, res) => {
  const interview = await AIInterview.findOne({ _id: req.params.id, company: req.user._id })
    .populate('candidate', 'firstName lastName email skills experience currentPosition');

  if (!interview) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Interview not found' });
  }

  if (!interview.responses?.length) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'No responses to evaluate' });
  }

  const candidateProfile = interview.candidate || {
    firstName: interview.candidateName.split(' ')[0],
    lastName: interview.candidateName.split(' ')[1] || '',
    skills: [],
    experience: 'N/A'
  };

  const assessment = await aiVideoInterviewService.generateInterviewAssessment({
    candidate: candidateProfile,
    questions: interview.questions,
    responses: interview.responses,
    round: interview.round
  });

  const feedback = await aiVideoInterviewService.generateCandidateFeedback(assessment, false);

  interview.evaluation = { ...assessment, evaluatedAt: new Date() };
  interview.candidateFeedback = feedback;
  if (interview.status !== 'completed') interview.status = 'completed';
  await interview.save();

  res.status(HTTP_STATUS.OK).json({ success: true, data: { evaluation: assessment, feedback } });
});

// ─────────────────────────────────────────
// CANDIDATE SIDE (token-gated, no auth)
// ─────────────────────────────────────────

// @desc    Candidate verifies token and gets interview info
// @route   GET /api/ai-interviews/join/:token
// @access  Public
const joinByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const interview = await AIInterview.findByToken(token);

    if (!interview) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Interview link is invalid or has expired.'
      });
    }

    // Mark as in_progress on first use
    if (!interview.tokenUsed) {
      interview.tokenUsed = true;
      if (interview.status === 'invited' || interview.status === 'scheduled') {
        interview.status = 'in_progress';
        interview.startedAt = new Date();
      }
      await interview.save();
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        interviewId: interview._id,
        candidateName: interview.candidateName,
        companyName: interview.company?.companyName || '',
        jobTitle: interview.jobTitle,
        round: interview.round,
        interviewType: interview.interviewType,
        totalQuestions: interview.questions.length,
        currentQuestionIndex: interview.currentQuestionIndex,
        status: interview.status,
        roomCode: interview.roomCode,
        // Send first question immediately
        currentQuestion: interview.questions[interview.currentQuestionIndex] || null
      }
    });
  } catch (err) {
    logger.error(`[joinByToken] ${err.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

// @desc    Candidate gets current question (by interview id + token)
// @route   GET /api/ai-interviews/:id/question/:token
// @access  Public (token-gated)
const getCurrentQuestion = async (req, res) => {
  try {
    const interview = await AIInterview.findOne({
      _id: req.params.id,
      secureToken: req.params.token,
      status: { $in: ['in_progress', 'invited', 'scheduled'] }
    });

    if (!interview) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Session not found' });
    }

    const idx = interview.currentQuestionIndex;
    const question = interview.questions[idx];

    if (!question) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { finished: true, totalQuestions: interview.questions.length }
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        questionIndex: idx,
        totalQuestions: interview.questions.length,
        question: question.question,
        category: question.category,
        difficulty: question.difficulty,
        expectedDuration: question.expectedDuration,
        finished: false
      }
    });
  } catch (err) {
    logger.error(`[getCurrentQuestion] ${err.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

// @desc    Candidate submits answer (transcript from Whisper/browser)
// @route   POST /api/ai-interviews/:id/answer/:token
// @access  Public (token-gated)
const submitAnswer = async (req, res) => {
  try {
    const { transcriptText, audioUrl, duration } = req.body;
    const interview = await AIInterview.findOne({
      _id: req.params.id,
      secureToken: req.params.token,
      status: 'in_progress'
    });

    if (!interview) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Session not found or not active' });
    }

    const idx = interview.currentQuestionIndex;
    const question = interview.questions[idx];

    if (!question) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'No active question' });
    }

    // Duplicate submission guard
    const alreadyAnswered = interview.responses.some(r => r.questionIndex === idx);
    if (alreadyAnswered) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Question already answered' });
    }

    // Analyse with Claude
    let analysis = {};
    try {
      analysis = await aiVideoInterviewService.analyzeResponse(
        question.question,
        transcriptText,
        transcriptText
      );
    } catch (aiErr) {
      logger.warn(`[submitAnswer] AI analysis failed: ${aiErr.message}`);
    }

    // Generate dynamic follow-ups if score is low
    let followUpQuestions = [];
    if (analysis.score < 50 && idx < interview.questions.length - 1) {
      try {
        followUpQuestions = await aiVideoInterviewService.generateFollowUpQuestions(
          question.question, transcriptText, 1
        );
      } catch (_) {}
    }

    // Store response
    interview.responses.push({
      questionIndex: idx,
      question: question.question,
      category: question.category,
      transcriptText: transcriptText || '',
      audioUrl: audioUrl || '',
      duration: duration || 0,
      analysis,
      followUpQuestions,
      submittedAt: new Date()
    });

    // Advance question pointer
    interview.currentQuestionIndex = idx + 1;
    const isFinished = interview.currentQuestionIndex >= interview.questions.length;

    if (isFinished) {
      interview.status = 'completed';
      interview.completedAt = new Date();

      // Kick off async evaluation (fire & forget)
      setImmediate(async () => {
        try {
          const candidateProfile = await Candidate.findById(interview.candidate) || {
            firstName: interview.candidateName.split(' ')[0],
            lastName: interview.candidateName.split(' ')[1] || '',
            skills: [], experience: 'N/A'
          };

          const assessment = await aiVideoInterviewService.generateInterviewAssessment({
            candidate: candidateProfile,
            questions: interview.questions,
            responses: interview.responses,
            round: interview.round
          });

          const feedback = await aiVideoInterviewService.generateCandidateFeedback(assessment, false);
          interview.evaluation = { ...assessment, evaluatedAt: new Date() };
          interview.candidateFeedback = feedback;
          await interview.save();

          if (interview.roomId) {
            setRoomEnabled(interview.roomId, false).catch(() => {});
          }
        } catch (evalErr) {
          logger.error(`[submitAnswer] async eval error: ${evalErr.message}`);
        }
      });
    }

    await interview.save();

    const nextQuestion = isFinished ? null : interview.questions[interview.currentQuestionIndex];

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        analysis,
        followUpQuestions,
        finished: isFinished,
        nextQuestionIndex: isFinished ? null : interview.currentQuestionIndex,
        nextQuestion: nextQuestion ? {
          questionIndex: interview.currentQuestionIndex,
          question: nextQuestion.question,
          category: nextQuestion.category,
          difficulty: nextQuestion.difficulty,
          expectedDuration: nextQuestion.expectedDuration
        } : null,
        progress: `${interview.responses.length}/${interview.questions.length}`
      }
    });
  } catch (err) {
    logger.error(`[submitAnswer] ${err.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

// @desc    Candidate gets final result (only after completion)
// @route   GET /api/ai-interviews/:id/result/:token
// @access  Public (token-gated)
const getResult = async (req, res) => {
  try {
    const interview = await AIInterview.findOne({
      _id: req.params.id,
      secureToken: req.params.token
    });

    if (!interview) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Not found' });
    }

    if (interview.status !== 'completed') {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { status: interview.status, evaluationReady: false }
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        evaluationReady: !!interview.evaluation?.overallScore,
        feedback: interview.candidateFeedback,
        overallScore: interview.evaluation?.overallScore,
        recommendation: interview.evaluation?.recommendation,
        strengths: interview.evaluation?.strengths,
        areasForImprovement: interview.evaluation?.areasForImprovement,
        proceedToNextRound: interview.evaluation?.proceedToNextRound
      }
    });
  } catch (err) {
    logger.error(`[getResult] ${err.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

// @desc    Proctoring event (tab switch / face missing)
// @route   POST /api/ai-interviews/:id/proctor/:token
// @access  Public (token-gated)
const logProctoringEvent = async (req, res) => {
  try {
    const { eventType, reason } = req.body; // eventType: 'tab_switch' | 'face_missing'
    const interview = await AIInterview.findOne({
      _id: req.params.id,
      secureToken: req.params.token,
      status: 'in_progress'
    });

    if (!interview) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false });

    if (eventType === 'tab_switch') interview.proctoring.tabSwitchCount += 1;
    if (eventType === 'face_missing') interview.proctoring.faceMissingCount += 1;

    const threshold = parseInt(process.env.PROCTORING_FLAG_THRESHOLD) || 5;
    if (
      interview.proctoring.tabSwitchCount >= threshold ||
      interview.proctoring.faceMissingCount >= threshold
    ) {
      interview.proctoring.flagged = true;
    }

    interview.proctoring.flags.push({ reason: reason || eventType, timestamp: new Date() });
    await interview.save();

    res.status(HTTP_STATUS.OK).json({ success: true, flagged: interview.proctoring.flagged });
  } catch (err) {
    logger.error(`[logProctoringEvent] ${err.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

module.exports = {
  scheduleInterview,
  listInterviews,
  getInterview,
  cancelInterview,
  evaluateInterview,
  joinByToken,
  getCurrentQuestion,
  submitAnswer,
  getResult,
  logProctoringEvent
};
