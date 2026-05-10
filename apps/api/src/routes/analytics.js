const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAdminKpis, getCompanyKpis } = require('../controllers/analyticsController');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');
const Company = require('../models/Company');
const Candidate = require('../models/Candidate');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');

router.use(protect);

router.get('/kpi/admin', authorize(['SuperAdmin']), getAdminKpis);
router.get('/kpi/company', authorize(['SuperAdmin', 'Company', 'HR']), getCompanyKpis);

// Aggregate dashboard analytics consumed by the Analytics screen.
// Scope: SuperAdmin sees everything; Company/HR sees only its own data.
router.get('/dashboard', asyncHandler(async (req, res) => {
  const isSuper = req.userType === 'SuperAdmin';
  const companyFilter = isSuper ? {} : { company: req.user._id };

  const [
    totalCompanies,
    activeCompanies,
    totalCandidates,
    totalTests,
    totalAttempts,
    suspiciousAttempts,
  ] = await Promise.all([
    isSuper ? Company.countDocuments({}) : Promise.resolve(1),
    isSuper ? Company.countDocuments({ isActive: true }) : Promise.resolve(1),
    Candidate.countDocuments(companyFilter),
    Test.countDocuments(companyFilter),
    TestAttempt.countDocuments(companyFilter),
    TestAttempt.countDocuments({ ...companyFilter, $or: [{ flagged: true }, { 'proctoring.suspicious': true }] }),
  ]);

  // Build last-12-months histograms for candidates / tests / revenue (revenue is a placeholder)
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const monthLabels = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    monthLabels.push({ label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() });
  }

  const histogram = (docs, dateField = 'createdAt') => {
    const buckets = monthLabels.map((m) => ({ label: m.label, value: 0 }));
    for (const doc of docs) {
      const dt = new Date(doc[dateField]);
      const idx = monthLabels.findIndex((m) => m.year === dt.getFullYear() && m.month === dt.getMonth());
      if (idx >= 0) buckets[idx].value += 1;
    }
    return buckets;
  };

  const [candidateDocs, testDocs, attemptDocs] = await Promise.all([
    Candidate.find({ ...companyFilter, createdAt: { $gte: since } }).select('createdAt').lean(),
    Test.find({ ...companyFilter, createdAt: { $gte: since } }).select('createdAt').lean(),
    TestAttempt.find({ ...companyFilter, createdAt: { $gte: since }, status: 'completed' })
      .select('createdAt score passed')
      .lean(),
  ]);

  const candidatesByMonth = histogram(candidateDocs);
  const testsByMonth = histogram(testDocs);

  // Pass-rate per month
  const passRateBuckets = monthLabels.map((m) => ({ label: m.label, total: 0, passed: 0 }));
  for (const a of attemptDocs) {
    const dt = new Date(a.createdAt);
    const idx = monthLabels.findIndex((m) => m.year === dt.getFullYear() && m.month === dt.getMonth());
    if (idx >= 0) {
      passRateBuckets[idx].total += 1;
      if (a.passed) passRateBuckets[idx].passed += 1;
    }
  }
  const passRateByMonth = passRateBuckets.map((b) => ({
    label: b.label,
    value: b.total ? Math.round((b.passed / b.total) * 100) : 0,
  }));

  // Top companies (by candidate count) — only for SuperAdmin
  let topCompanies = [];
  if (isSuper) {
    topCompanies = await Candidate.aggregate([
      { $group: { _id: '$company', candidates: { $sum: 1 } } },
      { $sort: { candidates: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: '$company.name', candidates: 1 } },
    ]);
  }

  // Recent activity = latest 8 completed attempts
  const recentAttempts = await TestAttempt.find({ ...companyFilter, status: 'completed' })
    .sort({ updatedAt: -1 })
    .limit(8)
    .populate('candidate', 'firstName lastName name')
    .populate('test', 'title')
    .populate('company', 'name')
    .lean();
  const recentActivity = recentAttempts.map((a) => ({
    candidateId: { name: `${a.candidate?.firstName || ''} ${a.candidate?.lastName || a.candidate?.name || ''}`.trim() },
    testId: { testName: a.test?.title || 'Test' },
    companyId: { companyName: a.company?.name || '' },
    score: a.score,
    completedAt: a.updatedAt,
  }));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      overview: {
        totalCompanies,
        activeCompanies,
        totalCandidates,
        totalTests,
        totalRevenue: 0,
        totalVideoInterviews: 0,
        growthRate: 0,
      },
      charts: {
        companyGrowth: [],
        revenueByMonth: monthLabels.map((m) => ({ label: m.label, value: 0 })),
        testsByMonth,
        candidatesByMonth,
        industryDistribution: [],
        geographicData: [],
        passRateByMonth,
        domainPerformance: [],
      },
      top: { companies: topCompanies },
      proctoring: {
        suspiciousAttempts,
        topFlaggedAttempts: [],
      },
      recentActivity,
    },
  });
}));

module.exports = router;
