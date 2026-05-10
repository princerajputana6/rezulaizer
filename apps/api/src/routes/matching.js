const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  runMatching,
  getRankedCandidates,
  getMatchDetails,
  updateMatchStatus,
  getCandidateMatches,
  getMatchingStats,
  runAdvancedMatching
} = require('../controllers/matchingController');

// All routes require authentication
router.use(protect);

// Run AI matching for a job
router.post(
  '/run/:jobId',
  authorize(['SuperAdmin', 'Company', 'HR']),
  runMatching
);

// Run advanced 4-level matching for a job
router.post(
  '/advanced/:jobId',
  authorize(['SuperAdmin', 'Company', 'HR']),
  runAdvancedMatching
);

// Get ranked candidates for a job
router.get(
  '/job/:jobId',
  authorize(['SuperAdmin', 'Company', 'HR']),
  getRankedCandidates
);

// Get matching statistics for a job
router.get(
  '/job/:jobId/stats',
  authorize(['SuperAdmin', 'Company', 'HR']),
  getMatchingStats
);

// Get match details for specific candidate-job pair
router.get(
  '/candidate/:candidateId/job/:jobId',
  authorize(['SuperAdmin', 'Company', 'HR']),
  getMatchDetails
);

// Get all matches for a candidate
router.get(
  '/candidate/:candidateId',
  authorize(['SuperAdmin', 'Company', 'HR']),
  getCandidateMatches
);

// Update match status
router.patch(
  '/:matchId/status',
  authorize(['SuperAdmin', 'Company', 'HR']),
  updateMatchStatus
);

module.exports = router;
