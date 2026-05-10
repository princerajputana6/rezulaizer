const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'coding', 'essay', 'true-false', 'fill-blank'],
    required: true
  },
  
  // Answer Data
  answer: mongoose.Schema.Types.Mixed, // Can be string, array, or object
  
  // For coding questions
  codeSubmission: {
    code: String,
    language: String,
    executionResults: [{
      testCase: Number,
      input: String,
      expectedOutput: String,
      actualOutput: String,
      passed: Boolean,
      executionTime: Number, // in milliseconds
      memoryUsed: Number // in bytes
    }],
    compilationError: String,
    runtimeError: String
  },
  
  // Scoring
  pointsEarned: {
    type: Number,
    default: 0
  },
  maxPoints: {
    type: Number,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  
  // Timing
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  answeredAt: Date,
  
  // AI Analysis (for essay/coding questions)
  aiAnalysis: {
    score: Number,
    feedback: String,
    strengths: [String],
    improvements: [String],
    confidence: Number // 0-1
  }
});

const testResultSchema = new mongoose.Schema({
  // Basic Information
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  invitation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestInvitation',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  
  // Test Session
  sessionId: {
    type: String,
    unique: true,
    required: true
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Answers
  answers: [answerSchema],
  
  // Scoring
  totalScore: {
    type: Number,
    default: 0
  },
  maxPossibleScore: {
    type: Number,
    required: true
  },
  percentageScore: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    default: 'F'
  },
  
  // Timing
  startedAt: {
    type: Date,
    required: true
  },
  completedAt: Date,
  totalTimeSpent: {
    type: Number, // in seconds
    default: 0
  },
  timeLimit: {
    type: Number, // in seconds
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Timeout', 'Abandoned', 'Under Review'],
    default: 'In Progress'
  },
  
  // Proctoring Data
  proctoringData: {
    violations: [{
      type: {
        type: String,
        enum: ['Tab Switch', 'Full Screen Exit', 'Multiple Faces', 'No Face Detected', 'Suspicious Activity']
      },
      timestamp: Date,
      description: String,
      severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
      }
    }],
    screenshots: [{
      timestamp: Date,
      imageUrl: String,
      flagged: Boolean,
      reason: String
    }],
    totalViolations: {
      type: Number,
      default: 0
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Browser and Environment
  browserInfo: {
    userAgent: String,
    browser: String,
    version: String,
    os: String,
    screenResolution: String,
    ipAddress: String
  },
  
  // Analytics
  analytics: {
    questionsAttempted: {
      type: Number,
      default: 0
    },
    questionsSkipped: {
      type: Number,
      default: 0
    },
    averageTimePerQuestion: {
      type: Number,
      default: 0
    },
    difficultyBreakdown: {
      easy: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      },
      medium: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      },
      hard: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      }
    }
  },
  
  // Review and Feedback
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  reviewedAt: Date,
  feedback: {
    type: String,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters']
  },
  
  // AI Generated Report
  aiReport: {
    overallAssessment: String,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    skillsAssessment: [{
      skill: String,
      level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
      },
      confidence: Number
    }],
    generatedAt: Date
  },
  
  // Metadata
  isPublic: {
    type: Boolean,
    default: false
  },
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
testResultSchema.virtual('completionPercentage').get(function() {
  if (!this.answers || this.answers.length === 0) return 0;
  const totalQuestions = this.test?.questions?.length || this.answers.length;
  return Math.round((this.answers.length / totalQuestions) * 100);
});

// Calculate scores before saving
testResultSchema.pre('save', function() {
  if (this.answers && this.answers.length > 0) {
    this.totalScore = this.answers.reduce((total, answer) => total + (answer.pointsEarned || 0), 0);
    this.percentageScore = this.maxPossibleScore > 0 ? Math.round((this.totalScore / this.maxPossibleScore) * 100) : 0;
    
    // Determine if passed
    const passingScore = this.test?.passingScore || 60;
    this.passed = this.percentageScore >= passingScore;
    
    // Assign grade
    if (this.percentageScore >= 97) this.grade = 'A+';
    else if (this.percentageScore >= 93) this.grade = 'A';
    else if (this.percentageScore >= 90) this.grade = 'B+';
    else if (this.percentageScore >= 87) this.grade = 'B';
    else if (this.percentageScore >= 83) this.grade = 'C+';
    else if (this.percentageScore >= 80) this.grade = 'C';
    else if (this.percentageScore >= 70) this.grade = 'D';
    else this.grade = 'F';
  }
});

// Generate unique session ID
testResultSchema.pre('save', function() {
  if (!this.sessionId) {
    this.sessionId = require('crypto').randomBytes(16).toString('hex');
  }
});

// Indexes
testResultSchema.index({ test: 1 });
testResultSchema.index({ candidate: 1 });
testResultSchema.index({ company: 1 });
testResultSchema.index({ sessionId: 1 });
testResultSchema.index({ status: 1 });
testResultSchema.index({ percentageScore: -1 });
testResultSchema.index({ completedAt: -1 });
testResultSchema.index({ passed: 1 });

module.exports = mongoose.model('TestResult', testResultSchema);
