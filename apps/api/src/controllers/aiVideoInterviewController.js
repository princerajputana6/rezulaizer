const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');
const aiVideoInterviewService = require('../services/aiVideoInterviewService');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const logger = require('../utils/logger');

// @desc    Generate AI interview questions
// @route   POST /api/ai-video-interviews/generate-questions
// @access  Private (Company, HR)
const generateInterviewQuestions = asyncHandler(async (req, res) => {
  const { candidateId, jobDescription, round = 1 } = req.body;

  if (!candidateId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Candidate ID is required'
    });
  }

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  const questions = await aiVideoInterviewService.generateInterviewQuestions(
    candidate,
    jobDescription,
    round
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      questions,
      candidateId,
      round,
      totalQuestions: questions.length
    }
  });
});

// @desc    Analyze candidate response
// @route   POST /api/ai-video-interviews/analyze-response
// @access  Private (Company, HR)
const analyzeResponse = asyncHandler(async (req, res) => {
  const { question, answer, transcriptText } = req.body;

  if (!question || !answer) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Question and answer are required'
    });
  }

  const analysis = await aiVideoInterviewService.analyzeResponse(
    question,
    answer,
    transcriptText
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { analysis }
  });
});

// @desc    Generate follow-up questions
// @route   POST /api/ai-video-interviews/follow-up-questions
// @access  Private (Company, HR)
const generateFollowUpQuestions = asyncHandler(async (req, res) => {
  const { originalQuestion, candidateAnswer, count = 2 } = req.body;

  if (!originalQuestion || !candidateAnswer) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Original question and candidate answer are required'
    });
  }

  const followUpQuestions = await aiVideoInterviewService.generateFollowUpQuestions(
    originalQuestion,
    candidateAnswer,
    count
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { followUpQuestions }
  });
});

// @desc    Generate overall interview assessment
// @route   POST /api/ai-video-interviews/generate-assessment
// @access  Private (Company, HR)
const generateAssessment = asyncHandler(async (req, res) => {
  const { candidateId, questions, responses, round = 1 } = req.body;

  if (!candidateId || !questions || !responses) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Candidate ID, questions, and responses are required'
    });
  }

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  const assessment = await aiVideoInterviewService.generateInterviewAssessment({
    candidate,
    questions,
    responses,
    round
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { assessment }
  });
});

// @desc    Generate candidate feedback
// @route   POST /api/ai-video-interviews/generate-feedback
// @access  Private (Company, HR)
const generateFeedback = asyncHandler(async (req, res) => {
  const { assessment, includeScore = false } = req.body;

  if (!assessment) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Assessment data is required'
    });
  }

  const feedback = await aiVideoInterviewService.generateCandidateFeedback(
    assessment,
    includeScore
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { feedback }
  });
});

// @desc    Start AI video interview session
// @route   POST /api/ai-video-interviews/start-session
// @access  Private (Company, HR)
const startInterviewSession = asyncHandler(async (req, res) => {
  const { candidateId, jobDescription, round = 1, interviewType = 'technical' } = req.body;

  if (!candidateId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Candidate ID is required'
    });
  }

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Candidate not found'
    });
  }

  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Generate questions for the interview
  const questions = await aiVideoInterviewService.generateInterviewQuestions(
    candidate,
    jobDescription,
    round
  );

  // Create interview record
  const interview = await Interview.create({
    title: `AI Video Interview - Round ${round}`,
    type: interviewType,
    candidate: candidateId,
    company: req.user._id,
    mode: 'video',
    status: 'scheduled',
    scheduledAt: new Date(),
    duration: questions.length * 5, // 5 minutes per question
    createdBy: req.user._id,
    metadata: {
      isAIInterview: true,
      round,
      questions,
      totalQuestions: questions.length
    }
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'AI video interview session started',
    data: {
      interviewId: interview._id,
      questions,
      round,
      estimatedDuration: questions.length * 5
    }
  });
});

// @desc    Submit interview response
// @route   POST /api/ai-video-interviews/:interviewId/submit-response
// @access  Private (Company, HR, Candidate)
const submitResponse = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { questionIndex, answer, transcriptText, videoUrl, duration } = req.body;

  const interview = await Interview.findById(interviewId);
  if (!interview) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Interview not found'
    });
  }

  const question = interview.metadata?.questions?.[questionIndex];
  if (!question) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid question index'
    });
  }

  // Analyze the response
  const analysis = await aiVideoInterviewService.analyzeResponse(
    question.question,
    answer,
    transcriptText
  );

  // Store response
  if (!interview.metadata.responses) {
    interview.metadata.responses = [];
  }

  interview.metadata.responses.push({
    questionIndex,
    question: question.question,
    answer,
    transcriptText,
    videoUrl,
    duration,
    analysis,
    submittedAt: new Date()
  });

  await interview.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Response submitted successfully',
    data: {
      analysis,
      nextQuestionIndex: questionIndex + 1,
      totalQuestions: interview.metadata.questions.length,
      isComplete: questionIndex + 1 >= interview.metadata.questions.length
    }
  });
});

// @desc    Complete interview and generate final assessment
// @route   POST /api/ai-video-interviews/:interviewId/complete
// @access  Private (Company, HR)
const completeInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  const interview = await Interview.findById(interviewId)
    .populate('candidate', 'firstName lastName email skills experience');

  if (!interview) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Interview not found'
    });
  }

  // Check access
  if (req.userType !== 'SuperAdmin' && interview.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Generate final assessment
  const assessment = await aiVideoInterviewService.generateInterviewAssessment({
    candidate: interview.candidate,
    questions: interview.metadata.questions,
    responses: interview.metadata.responses,
    round: interview.metadata.round
  });

  // Generate candidate feedback
  const feedback = await aiVideoInterviewService.generateCandidateFeedback(assessment, false);

  // Update interview
  interview.status = 'completed';
  interview.completedAt = new Date();
  interview.metadata.assessment = assessment;
  interview.metadata.feedback = feedback;
  interview.feedback = {
    overallRating: assessment.overallScore,
    technicalSkills: assessment.technicalSkills?.score || 0,
    communication: assessment.communication?.score || 0,
    problemSolving: assessment.problemSolving?.score || 0,
    recommendation: assessment.recommendation,
    comments: feedback
  };

  await interview.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview completed successfully',
    data: {
      assessment,
      feedback,
      interviewId: interview._id
    }
  });
});

module.exports = {
  generateInterviewQuestions,
  analyzeResponse,
  generateFollowUpQuestions,
  generateAssessment,
  generateFeedback,
  startInterviewSession,
  submitResponse,
  completeInterview
};
