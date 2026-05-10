const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  
  // Professional Information
  currentPosition: {
    type: String,
    trim: true
  },
  experience: {
    type: Number, // Years of experience
    min: 0,
    max: 50
  },
  skills: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  
  // Comprehensive Resume Data
  summary: {
    type: String,
    trim: true
  },
  careerObjective: {
    type: String,
    trim: true
  },
  workExperience: [{
    title: String,
    position: String,
    company: String,
    location: String,
    startDate: String,
    endDate: String,
    current: Boolean,
    description: String,
    responsibilities: [String],
    achievements: [String]
  }],
  education: [{
    degree: String,
    field: String,
    institution: String,
    location: String,
    startDate: String,
    endDate: String,
    grade: String,
    description: String
  }],
  certifications: [{
    name: String,
    issuer: String,
    issueDate: String,
    expiryDate: String,
    credentialId: String,
    url: String
  }],
  projects: [{
    name: String,
    description: String,
    role: String,
    technologies: [String],
    url: String,
    startDate: String,
    endDate: String
  }],
  accomplishments: [{
    title: String,
    description: String,
    date: String
  }],
  languages: [{
    name: String,
    proficiency: String
  }],
  address: {
    type: String,
    trim: true
  },
  
  // Resume and Portfolio
  resume: {
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: Date,
    size: Number
  },
  portfolioUrl: {
    type: String,
    trim: true
  },
  linkedinUrl: {
    type: String,
    trim: true
  },
  githubUrl: {
    type: String,
    trim: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['Applied', 'Screening', 'Testing', 'Interview', 'Hired', 'Rejected', 'Withdrawn', 'active', 'inactive'],
    default: 'Applied'
  },
  
  // Company Association
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Application Details
  appliedJobs: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Applied', 'Screening', 'Testing', 'Interview', 'Hired', 'Rejected'],
      default: 'Applied'
    }
  }],
  
  // Test History
  testAttempts: [{
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
    }
  }],
  
  // Interview History
  interviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview'
  }],
  
  // Additional Information
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'notes.addedByModel'
    },
    addedByModel: {
      type: String,
      enum: ['Company', 'HR', 'SuperAdmin']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Assessment invite fields
  assessmentToken: { type: String },
  assessmentTokenExpiry: { type: Date },
  assessmentPasswordHash: { type: String },
  assessmentSessionToken: { type: String },
  assessmentSessionExpiry: { type: Date },

  // Hiring pipeline workflow status — drives the new Assessment / Schedule
  // Interview / Video Interview / Interview Reports list pages.
  workflowStage: {
    type: String,
    enum: [
      'invited',            // assessment email sent
      'assessment_passed',
      'assessment_failed',
      'video_interview_invited',
      'video_interview_appeared',
      'video_interview_passed',
      'video_interview_failed',
      'selected',           // ready for offer
      'offer_released',
      'rejected',
    ],
    default: 'invited',
  },
  // Latest assessment numbers (denormalized for fast list views)
  latestAssessmentScore: { type: Number, default: null },
  latestAssessmentPercentage: { type: Number, default: null },
  latestAssessmentPassed: { type: Boolean, default: null },
  latestAssessmentAt: { type: Date, default: null },
  // Video interview tracking
  videoInterviewToken: { type: String },
  videoInterviewSentAt: { type: Date, default: null },
  videoInterviewAppearedAt: { type: Date, default: null },
  videoInterviewPassed: { type: Boolean, default: null },
  // Offer
  offerReleasedAt: { type: Date, default: null },

  // Metadata
  source: {
    type: String,
    enum: ['Direct Application', 'Job Portal', 'Referral', 'LinkedIn', 'Other'],
    default: 'Direct Application'
  },
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

// Virtual for full name
candidateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for total test attempts
candidateSchema.virtual('totalTests').get(function() {
  return this.testAttempts ? this.testAttempts.length : 0;
});

// Indexes
candidateSchema.index({ email: 1 });
candidateSchema.index({ company: 1 });
candidateSchema.index({ status: 1 });
candidateSchema.index({ appliedAt: -1 });
candidateSchema.index({ 'skills.name': 1 });
// Hot path: paginated company list sorted by createdAt
candidateSchema.index({ company: 1, createdAt: -1 });
candidateSchema.index({ company: 1, status: 1 });
candidateSchema.index({ assessmentToken: 1 });
candidateSchema.index({ company: 1, workflowStage: 1 });
candidateSchema.index({ videoInterviewToken: 1 });

// Update lastActivityAt on save
candidateSchema.pre('save', function() {
  this.lastActivityAt = new Date();
});

module.exports = mongoose.model('Candidate', candidateSchema);
