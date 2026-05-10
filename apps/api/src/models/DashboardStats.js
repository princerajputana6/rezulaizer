const mongoose = require('mongoose');

const dashboardStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: 'daily'
  },
  stats: {
    totalCompanies: {
      type: Number,
      default: 0
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    totalAssessments: {
      type: Number,
      default: 0
    },
    totalInterviews: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    monthlyRevenue: {
      type: Number,
      default: 0
    },
    newCompanies: {
      type: Number,
      default: 0
    },
    newUsers: {
      type: Number,
      default: 0
    },
    completedAssessments: {
      type: Number,
      default: 0
    },
    completedInterviews: {
      type: Number,
      default: 0
    }
  },
  trends: {
    companiesGrowth: {
      type: Number,
      default: 0
    },
    usersGrowth: {
      type: Number,
      default: 0
    },
    assessmentsGrowth: {
      type: Number,
      default: 0
    },
    revenueGrowth: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'dashboardstats'
});

// Compound index for efficient querying
dashboardStatsSchema.index({ type: 1, date: -1 });
dashboardStatsSchema.index({ date: -1 });

// Static method to get latest stats
dashboardStatsSchema.statics.getLatestStats = async function(type = 'daily') {
  return await this.findOne({ type })
    .sort({ date: -1 })
    .lean();
};

// Static method to update or create stats
dashboardStatsSchema.statics.updateStats = async function(type, statsData, trendsData = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await this.findOneAndUpdate(
    { 
      type,
      date: { $gte: today }
    },
    {
      type,
      date: new Date(),
      stats: statsData,
      trends: trendsData
    },
    {
      new: true,
      upsert: true
    }
  );
};

// Static method to calculate trends
dashboardStatsSchema.statics.calculateTrends = async function(currentStats, type = 'daily') {
  const previousPeriod = new Date();
  
  switch (type) {
    case 'daily':
      previousPeriod.setDate(previousPeriod.getDate() - 1);
      break;
    case 'weekly':
      previousPeriod.setDate(previousPeriod.getDate() - 7);
      break;
    case 'monthly':
      previousPeriod.setMonth(previousPeriod.getMonth() - 1);
      break;
    case 'yearly':
      previousPeriod.setFullYear(previousPeriod.getFullYear() - 1);
      break;
  }

  const previousStats = await this.findOne({
    type,
    date: { $lte: previousPeriod }
  }).sort({ date: -1 });

  if (!previousStats) {
    return {
      companiesGrowth: 0,
      usersGrowth: 0,
      assessmentsGrowth: 0,
      revenueGrowth: 0
    };
  }

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    companiesGrowth: calculateGrowth(currentStats.totalCompanies, previousStats.stats.totalCompanies),
    usersGrowth: calculateGrowth(currentStats.totalUsers, previousStats.stats.totalUsers),
    assessmentsGrowth: calculateGrowth(currentStats.totalAssessments, previousStats.stats.totalAssessments),
    revenueGrowth: calculateGrowth(currentStats.monthlyRevenue, previousStats.stats.monthlyRevenue)
  };
};

module.exports = mongoose.model('DashboardStats', dashboardStatsSchema);
