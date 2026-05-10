const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
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
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'abandoned', 'expired'],
    default: 'not_started',
    index: true
  },
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date,
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    pointsEarned: Number,
    timeSpent: Number // seconds
  }],
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  totalQuestions: Number,
  questionsAttempted: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  skippedQuestions: Number,
  totalTimeSpent: Number, // seconds
  isPassed: {
    type: Boolean,
    default: false
  },
  passingScore: Number,
  feedback: String,
  proctoring: {
    tabSwitches: { type: Number, default: 0 },
    fullScreenExits: { type: Number, default: 0 },
    suspiciousActivity: [String]
  }
}, {
  timestamps: true
});

testAttemptSchema.index({ test: 1, candidate: 1 });
testAttemptSchema.index({ company: 1, status: 1 });
testAttemptSchema.index({ completedAt: -1 });
// Hot path: analytics dashboard reads completed attempts since N
testAttemptSchema.index({ company: 1, status: 1, createdAt: -1 });
testAttemptSchema.index({ company: 1, updatedAt: -1 });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
