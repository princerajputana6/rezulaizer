const mongoose = require('mongoose');
const crypto = require('crypto');

const responseSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  question: { type: String, required: true },
  category: { type: String, default: 'technical' },
  transcriptText: { type: String, default: '' },
  audioUrl: { type: String },
  duration: { type: Number, default: 0 }, // seconds
  analysis: {
    score: { type: Number, min: 0, max: 100, default: 0 },
    technicalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    communicationClarity: { type: Number, min: 0, max: 100, default: 0 },
    relevance: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    strengths: [String],
    weaknesses: [String],
    feedback: String,
    redFlags: [String],
    recommendation: { type: String, enum: ['proceed', 'review', 'reject'], default: 'review' }
  },
  followUpQuestions: [String],
  submittedAt: { type: Date, default: Date.now }
}, { _id: false });

const aiInterviewSchema = new mongoose.Schema({
  // Identity
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    index: true
  },
  // Candidate info (stored inline for cases where no Candidate doc exists yet)
  candidateName: { type: String, required: true, trim: true },
  candidateEmail: { type: String, required: true, lowercase: true, trim: true },

  // Config
  round: { type: Number, default: 1, min: 1, max: 5 },
  interviewType: {
    type: String,
    enum: ['technical', 'hr', 'behavioral', 'final'],
    default: 'technical'
  },
  jobTitle: { type: String, trim: true },
  jobDescription: { type: String },

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'invited', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'scheduled',
    index: true
  },

  // Magic link auth
  secureToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  tokenExpiry: { type: Date },
  tokenUsed: { type: Boolean, default: false },

  // 100ms Video Room
  roomId: { type: String },
  roomCode: { type: String },  // candidate join code
  hostRoomCode: { type: String }, // recruiter join code
  roomEnabled: { type: Boolean, default: false },

  // AI Questions (generated pre-interview)
  questions: [{
    question: { type: String, required: true },
    category: {
      type: String,
      enum: ['technical', 'behavioral', 'situational', 'cultural_fit'],
      default: 'technical'
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    expectedDuration: { type: Number, default: 120 }, // seconds
    evaluationCriteria: [String],
    followUpQuestions: [String]
  }],
  currentQuestionIndex: { type: Number, default: 0 },

  // Candidate Responses
  responses: [responseSchema],

  // Final Evaluation
  evaluation: {
    overallScore: { type: Number, min: 0, max: 100 },
    recommendation: {
      type: String,
      enum: ['strong_proceed', 'proceed', 'review', 'reject'],
      default: 'review'
    },
    summary: String,
    technicalSkills: {
      score: Number,
      assessment: String
    },
    communication: {
      score: Number,
      assessment: String
    },
    problemSolving: {
      score: Number,
      assessment: String
    },
    culturalFit: {
      score: Number,
      assessment: String
    },
    strengths: [String],
    areasForImprovement: [String],
    nextSteps: [String],
    interviewerNotes: String,
    proceedToNextRound: { type: Boolean, default: false },
    evaluatedAt: Date
  },

  // Candidate feedback (sent after completion)
  candidateFeedback: { type: String },
  feedbackSentAt: { type: Date },

  // Proctoring (Phase 3)
  proctoring: {
    tabSwitchCount: { type: Number, default: 0 },
    faceMissingCount: { type: Number, default: 0 },
    flagged: { type: Boolean, default: false },
    flags: [{ reason: String, timestamp: Date }]
  },

  // Scheduling
  scheduledAt: { type: Date, required: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  expiresAt: { type: Date }, // link expiry

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
aiInterviewSchema.virtual('isExpired').get(function () {
  return this.tokenExpiry && new Date() > this.tokenExpiry;
});

aiInterviewSchema.virtual('progress').get(function () {
  if (!this.questions?.length) return 0;
  return Math.round((this.responses?.length / this.questions.length) * 100);
});

aiInterviewSchema.virtual('candidateJoinUrl').get(function () {
  const base = process.env.CLIENT_URL || 'http://localhost:3000';
  return `${base}/interview/join?token=${this.secureToken}`;
});

// Generate secure token
aiInterviewSchema.methods.generateToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.secureToken = token;
  this.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  this.tokenUsed = false;
  return token;
};

// Static: find by valid token
aiInterviewSchema.statics.findByToken = function (token) {
  return this.findOne({
    secureToken: token,
    tokenExpiry: { $gt: new Date() },
    status: { $in: ['invited', 'scheduled', 'in_progress'] }
  }).populate('candidate', 'firstName lastName email skills experience currentPosition')
    .populate('company', 'companyName email logo');
};

// Indexes
aiInterviewSchema.index({ company: 1, status: 1 });
aiInterviewSchema.index({ candidateEmail: 1 });
aiInterviewSchema.index({ scheduledAt: -1 });
aiInterviewSchema.index({ secureToken: 1 }, { sparse: true });

module.exports = mongoose.model('AIInterview', aiInterviewSchema);
