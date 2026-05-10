const Match = require('../models/Match');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');
const { performAdvancedMatching } = require('../services/advancedMatchingService');
const logger = require('../utils/logger');

// @desc    Run AI matching for a specific job (redirects to advanced matching)
// @route   POST /api/matching/run/:jobId
// @access  Private (Company, HR)
const runMatching = asyncHandler(async (req, res) => {
  // Redirect to advanced matching
  logger.info('[Matching] Redirecting to advanced 4-level matching');
  return runAdvancedMatching(req, res);
});

// @desc    Get ranked candidates for a job
// @route   GET /api/matching/job/:jobId
// @access  Private (Company, HR)
const getRankedCandidates = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { minScore = 0, status, limit = 50, page = 1 } = req.query;

  // Build query
  const query = { job: jobId, matchScore: { $gte: parseInt(minScore) } };
  if (status) query.status = status;

  // Check authorization
  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Job not found'
    });
  }

  const companyId = req.user._id;
  if (job.company.toString() !== companyId.toString() && req.user.role !== 'SuperAdmin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [matches, total] = await Promise.all([
    Match.find(query)
      .populate('candidate', 'firstName lastName email currentPosition experience skills')
      .sort({ matchScore: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Match.countDocuments(query)
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      jobId,
      jobTitle: job.title,
      matches,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get match details for a specific candidate-job pair
// @route   GET /api/matching/candidate/:candidateId/job/:jobId
// @access  Private (Company, HR)
const getMatchDetails = asyncHandler(async (req, res) => {
  const { candidateId, jobId } = req.params;

  const match = await Match.findOne({
    candidate: candidateId,
    job: jobId
  })
    .populate('candidate', 'firstName lastName email currentPosition experience skills education workExperience')
    .populate('job', 'title description requiredSkills minExperience maxExperience');

  if (!match) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Match not found. Run matching first.'
    });
  }

  // Check authorization
  const companyId = req.user._id;
  if (match.company.toString() !== companyId.toString() && req.user.role !== 'SuperAdmin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: match
  });
});

// @desc    Update match status (shortlist, reject, etc.)
// @route   PATCH /api/matching/:matchId/status
// @access  Private (Company, HR)
const updateMatchStatus = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { status, hrNotes } = req.body;

  const match = await Match.findById(matchId);
  if (!match) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Match not found'
    });
  }

  // Check authorization
  const companyId = req.user._id;
  if (match.company.toString() !== companyId.toString() && req.user.role !== 'SuperAdmin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (status) match.status = status;
  if (hrNotes) match.hrNotes = hrNotes;
  match.reviewedBy = req.user._id;
  match.reviewedAt = new Date();

  await match.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Match status updated',
    data: match
  });
});

// @desc    Get all matches for a candidate across jobs
// @route   GET /api/matching/candidate/:candidateId
// @access  Private (Company, HR)
const getCandidateMatches = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  const companyId = req.user._id;

  const matches = await Match.find({
    candidate: candidateId,
    company: companyId
  })
    .populate('job', 'title description location')
    .sort({ matchScore: -1 })
    .lean();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: matches
  });
});

// @desc    Get matching statistics for a job
// @route   GET /api/matching/job/:jobId/stats
// @access  Private (Company, HR)
const getMatchingStats = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  // Check authorization
  const job = await Job.findById(jobId);
  if (!job) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Job not found'
    });
  }

  const companyId = req.user._id;
  if (job.company.toString() !== companyId.toString() && req.user.role !== 'SuperAdmin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  const stats = await Match.aggregate([
    { $match: { job: job._id } },
    {
      $facet: {
        scoreDistribution: [
          {
            $bucket: {
              groupBy: '$matchScore',
              boundaries: [0, 40, 60, 80, 100],
              default: 'Other',
              output: {
                count: { $sum: 1 },
                avgScore: { $avg: '$matchScore' }
              }
            }
          }
        ],
        statusBreakdown: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        recommendationBreakdown: [
          {
            $group: {
              _id: '$recommendation',
              count: { $sum: 1 }
            }
          }
        ],
        overall: [
          {
            $group: {
              _id: null,
              totalMatches: { $sum: 1 },
              avgScore: { $avg: '$matchScore' },
              maxScore: { $max: '$matchScore' },
              minScore: { $min: '$matchScore' }
            }
          }
        ]
      }
    }
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      jobId,
      jobTitle: job.title,
      statistics: stats[0]
    }
  });
});

// @desc    Run advanced 4-level matching for a job
// @route   POST /api/matching/advanced/:jobId
// @access  Private (Company, HR)
const runAdvancedMatching = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { candidateIds, saveResults = true } = req.body;

  // Get job with full details
  const job = await Job.findById(jobId).lean();
  if (!job) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Job not found'
    });
  }

  // Check authorization
  const companyId = req.user._id;
  if (job.company.toString() !== companyId.toString() && req.user.role !== 'SuperAdmin') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Prepare JD text
  const jdText = `
Title: ${job.title}
Description: ${job.description || ''}
Required Skills: ${(job.requiredSkills || []).map(s => typeof s === 'string' ? s : s.name).join(', ')}
Experience: ${job.experienceRequired?.min || 0}-${job.experienceRequired?.max || 10} years
Education: ${job.education || 'Not specified'}
Location: ${job.location || 'Not specified'}
Work Type: ${job.workType || 'Full-time'}
  `.trim();

  // Get candidates
  let query = { company: companyId };
  if (candidateIds && candidateIds.length > 0) {
    query._id = { $in: candidateIds };
  }

  const candidates = await Candidate.find(query).lean();

  if (candidates.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No candidates found to match'
    });
  }

  const results = [];
  const errors = [];

  logger.info(`[AdvancedMatching] Processing ${candidates.length} candidates for job ${jobId}`);

  // Match each candidate
  for (const candidate of candidates) {
    try {
      // Prepare resume text
      const resumeText = `
Name: ${candidate.firstName} ${candidate.lastName}
Email: ${candidate.email}
Phone: ${candidate.phone || ''}
Location: ${candidate.address || ''}
Current Position: ${candidate.currentPosition || ''}
Summary: ${candidate.summary || ''}
Career Objective: ${candidate.careerObjective || ''}

Skills: ${(candidate.skills || []).join(', ')}

Work Experience:
${(candidate.workExperience || []).map(exp => `
- ${exp.position || exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})
  ${exp.description || ''}
  Responsibilities: ${(exp.responsibilities || []).join(', ')}
  Achievements: ${(exp.achievements || []).join(', ')}
`).join('\n')}

Education:
${(candidate.education || []).map(edu => `
- ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startDate} - ${edu.endDate})
  Grade: ${edu.grade || 'N/A'}
`).join('\n')}

Certifications:
${(candidate.certifications || []).map(cert => `
- ${cert.name} by ${cert.issuer} (${cert.issueDate})
`).join('\n')}

Projects:
${(candidate.projects || []).map(proj => `
- ${proj.name}: ${proj.description}
  Technologies: ${(proj.technologies || []).join(', ')}
  Role: ${proj.role || 'N/A'}
`).join('\n')}

Accomplishments:
${(candidate.accomplishments || []).map(acc => `
- ${acc.title}: ${acc.description} (${acc.date})
`).join('\n')}

Languages:
${(candidate.languages || []).map(lang => `
- ${lang.name}: ${lang.proficiency}
`).join('\n')}
      `.trim();

      // Run advanced 4-level matching
      const matchResult = await performAdvancedMatching(resumeText, jdText);

      // Save to database if requested
      if (saveResults) {
        const existingMatch = await Match.findOne({
          job: jobId,
          candidate: candidate._id
        });

        const matchData = {
          job: jobId,
          candidate: candidate._id,
          company: companyId,
          matchScore: matchResult.match_score,
          similarityScore: matchResult.semantic_score,
          breakdown: matchResult.component_scores,
          strengths: matchResult.strengths,
          gaps: matchResult.red_flags,
          recommendation: matchResult.decision,
          aiExplanation: matchResult.reasoning,
          metadata: {
            baseScore: matchResult.base_score,
            llmAdjustment: matchResult.llm_adjustment,
            confidence: matchResult.confidence,
            gamingIssues: matchResult.gaming_issues,
            filterWarnings: matchResult.filter_warnings,
            structuredData: matchResult.structured_data
          }
        };

        if (existingMatch) {
          Object.assign(existingMatch, matchData);
          await existingMatch.save();
        } else {
          await Match.create(matchData);
        }
      }

      results.push({
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        matchScore: matchResult.match_score,
        decision: matchResult.decision,
        componentScores: matchResult.component_scores,
        redFlags: matchResult.red_flags,
        strengths: matchResult.strengths,
        reasoning: matchResult.reasoning,
        confidence: matchResult.confidence,
        gamingIssues: matchResult.gaming_issues
      });

    } catch (error) {
      logger.error(`[AdvancedMatching] Error matching candidate ${candidate._id}: ${error.message}`);
      errors.push({
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        error: error.message
      });
    }
  }

  // Sort by match score
  results.sort((a, b) => b.matchScore - a.matchScore);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Advanced matching completed for ${results.length} candidates`,
    data: {
      jobId,
      jobTitle: job.title,
      totalCandidates: candidates.length,
      successfulMatches: results.length,
      failedMatches: errors.length,
      results,
      errors,
      summary: {
        strongFit: results.filter(r => r.decision === 'strong_fit').length,
        consider: results.filter(r => r.decision === 'consider').length,
        reject: results.filter(r => r.decision === 'reject').length,
        avgScore: results.length > 0 
          ? Math.round(results.reduce((sum, r) => sum + r.matchScore, 0) / results.length)
          : 0
      }
    }
  });
});

module.exports = {
  runMatching,
  getRankedCandidates,
  getMatchDetails,
  updateMatchStatus,
  getCandidateMatches,
  getMatchingStats,
  runAdvancedMatching
};
