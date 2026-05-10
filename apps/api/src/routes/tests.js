const express = require('express');
const router = express.Router();
const { protect, candidateAuth } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/testController');

// ── Candidate-facing routes (accept candidate session token OR company JWT) ──
// These are called by CandidateLogin, Precautions, TakeAssessment pages
router.get('/:id', candidateAuth, getTestById);
router.post('/:id/start', candidateAuth, startTestAttempt);
router.post('/:id/answer', candidateAuth, submitAnswer);
router.post('/:id/submit', candidateAuth, submitTest);
router.get('/:id/results', candidateAuth, getTestResults);
router.post('/:id/flag', candidateAuth, flagProctorEvent);

// ── Company/Admin routes (require company JWT) ──
router.use(protect);

router.route('/')
  .get(getTests)
  .post(createTest);

router.route('/:id')
  .put(updateTest)
  .delete(deleteTest);

router.post('/:id/publish', publishTest);
router.post('/:id/archive', archiveTest);
router.post('/:id/duplicate', duplicateTest);
router.post('/:id/generate-questions', generateAIQuestions);
router.post('/:id/invite', sendTestInvitations);
router.get('/:id/invitations', getTestInvitations);
router.get('/:id/analytics', getTestAnalytics);
router.get('/:id/attempts', getTestAttempts);
router.get('/:id/proctoring/export', exportProctoringEvents);

module.exports = router;
