const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Basic Information
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: [
      'Applied',
      'Under Review',
      'Screening',
      'Test Invited',
      'Test Completed',
      'Interview Scheduled',
      'Interview Completed',
      'Final Review',
      'Offer Extended',
      'Offer Accepted',
      'Offer Declined',
      'Hired',
      'Rejected',
      'Withdrawn'
    ],
    default: 'Applied'
  },
  
  // Application Pipeline Stage
  currentStage: {
    type: String,
    enum: ['Application', 'Screening', 'Testing', 'Interview', 'Decision', 'Offer', 'Onboarding'],
    default: 'Application'
  },
  stageHistory: [{
    stage: String,
    status: String,
    enteredAt: Date,
    exitedAt: Date,
    duration: Number, // in hours
    notes: String
  }],
  
  // Application Details
  coverLetter: {
    type: String,
    maxlength: [5000, 'Cover letter cannot exceed 5000 characters']
  },
  customAnswers: [{
    question: String,
    answer: String,
    required: Boolean
  }],
  
  // Source and Referral
  source: {
    type: String,
    enum: ['Company Website', 'Job Board', 'LinkedIn', 'Referral', 'Social Media', 'Direct', 'Other'],
    default: 'Direct'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  },
  referralCode: String,
  
  // Test and Interview Tracking
  assignedTests: [{
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test'
    },
    invitation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestInvitation'
    },
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestResult'
    },
    status: {
      type: String,
      enum: ['Pending', 'Invited', 'In Progress', 'Completed', 'Expired'],
      default: 'Pending'
    },
    assignedAt: Date,
    completedAt: Date
  }],
  
  scheduledInterviews: [{
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview'
    },
    round: Number,
    type: String,
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled'
    },
    scheduledAt: Date,
    completedAt: Date
  }],
  
  // Scoring and Evaluation
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  scores: {
    resume: {
      type: Number,
      min: 0,
      max: 100
    },
    tests: {
      type: Number,
      min: 0,
      max: 100
    },
    interviews: {
      type: Number,
      min: 0,
      max: 100
    },
    cultural_fit: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Decision Making
  recommendation: {
    type: String,
    enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire', 'Strong No Hire']
  },
  decisionMakers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    recommendation: {
      type: String,
      enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire', 'Strong No Hire']
    },
    comments: String,
    submittedAt: Date
  }],
  
  // Communication History
  communications: [{
    type: {
      type: String,
      enum: ['Email', 'Phone', 'SMS', 'In-Person', 'Video Call', 'System Message']
    },
    direction: {
      type: String,
      enum: ['Inbound', 'Outbound']
    },
    subject: String,
    content: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    sentAt: Date,
    readAt: Date,
    attachments: [{
      filename: String,
      url: String,
      size: Number
    }]
  }],
  
  // Documents and Attachments
  documents: [{
    type: {
      type: String,
      enum: ['Resume', 'Cover Letter', 'Portfolio', 'Certificate', 'Reference', 'Other']
    },
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    uploadedAt: Date,
    uploadedBy: {
      type: String,
      enum: ['Candidate', 'Company']
    }
  }],
  
  // Timeline and Activities
  activities: [{
    type: {
      type: String,
      enum: ['Applied', 'Status Changed', 'Test Assigned', 'Test Completed', 'Interview Scheduled', 'Interview Completed', 'Note Added', 'Document Uploaded']
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Notes and Comments
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    tags: [String]
  }],
  
  // Rejection Details
  rejectionReason: {
    category: {
      type: String,
      enum: ['Qualifications', 'Experience', 'Skills', 'Cultural Fit', 'Test Performance', 'Interview Performance', 'Other']
    },
    details: String,
    feedback: String
  },
  
  // Offer Details (if applicable)
  offer: {
    position: String,
    salary: {
      amount: Number,
      currency: String,
      period: String
    },
    startDate: Date,
    benefits: [String],
    extendedAt: Date,
    expiresAt: Date,
    respondedAt: Date,
    response: {
      type: String,
      enum: ['Accepted', 'Declined', 'Negotiating']
    },
    negotiations: [{
      item: String,
      candidateRequest: String,
      companyResponse: String,
      status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined']
      },
      date: Date
    }]
  },
  
  // Compliance and Legal
  gdprConsent: {
    type: Boolean,
    default: false
  },
  dataRetentionDate: Date,
  
  // Metadata
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  appliedAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for application duration
applicationSchema.virtual('applicationDuration').get(function() {
  const now = new Date();
  const applied = this.appliedAt || this.createdAt;
  const diffTime = Math.abs(now - applied);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
});

// Virtual for current stage duration
applicationSchema.virtual('currentStageDuration').get(function() {
  if (!this.stageHistory || this.stageHistory.length === 0) return 0;
  const currentStageEntry = this.stageHistory[this.stageHistory.length - 1];
  if (!currentStageEntry.enteredAt) return 0;
  
  const now = new Date();
  const diffTime = Math.abs(now - currentStageEntry.enteredAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
});

// Update lastActivityAt on save
applicationSchema.pre('save', function() {
  this.lastActivityAt = new Date();
});

// Compound indexes for efficient queries
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });
applicationSchema.index({ company: 1, status: 1 });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ lastActivityAt: -1 });
applicationSchema.index({ currentStage: 1 });
applicationSchema.index({ overallScore: -1 });

module.exports = mongoose.model('Application', applicationSchema);
