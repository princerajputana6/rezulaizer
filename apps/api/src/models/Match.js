const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  // Match Score (0-100)
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Similarity score from embeddings (0-1)
  similarityScore: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Detailed breakdown
  breakdown: {
    skillsMatch: {
      score: Number,
      matched: [String],
      missing: [String],
      extra: [String]
    },
    experienceMatch: {
      score: Number,
      candidateYears: Number,
      requiredYears: Number,
      gap: Number
    },
    educationMatch: {
      score: Number,
      details: String
    },
    overallFit: String // 'Excellent', 'Good', 'Fair', 'Poor'
  },
  
  // AI-generated insights
  strengths: [String],
  gaps: [String],
  recommendation: {
    type: String,
    enum: ['Strong Match', 'Good Match', 'Moderate Match', 'Weak Match', 'No Match'],
    default: 'Moderate Match'
  },
  aiExplanation: String,
  
  // Embeddings (stored for future re-ranking)
  candidateEmbedding: [Number],
  jobEmbedding: [Number],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
    default: 'pending'
  },
  
  // HR actions
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  reviewedAt: Date,
  hrNotes: String,
  
  // Metadata
  matchedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
matchSchema.index({ job: 1, matchScore: -1 });
matchSchema.index({ candidate: 1, matchScore: -1 });
matchSchema.index({ company: 1, job: 1, matchScore: -1 });
matchSchema.index({ company: 1, status: 1, matchScore: -1 });

// Prevent duplicate matches
matchSchema.index({ job: 1, candidate: 1 }, { unique: true });

// Update lastUpdated on save
matchSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for match quality
matchSchema.virtual('matchQuality').get(function() {
  if (this.matchScore >= 80) return 'Excellent';
  if (this.matchScore >= 60) return 'Good';
  if (this.matchScore >= 40) return 'Fair';
  return 'Poor';
});

matchSchema.set('toJSON', { virtuals: true });
matchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Match', matchSchema);
