const mongoose = require('mongoose');

const testInvitationSchema = new mongoose.Schema({
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
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  
  // Invitation Details
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  invitationToken: {
    type: String,
    unique: true,
    required: true
  },
  
  // Timing
  expiresAt: {
    type: Date,
    required: true
  },
  scheduledFor: Date, // Optional scheduled time
  
  // Status
  status: {
    type: String,
    enum: ['Sent', 'Opened', 'Started', 'Completed', 'Expired', 'Cancelled'],
    default: 'Sent'
  },
  
  // Attempt Tracking
  attempts: [{
    startedAt: Date,
    completedAt: Date,
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestResult'
    },
    status: {
      type: String,
      enum: ['Started', 'Completed', 'Abandoned', 'Timeout']
    }
  }],
  
  // Custom Settings (override test defaults)
  customSettings: {
    duration: Number, // Custom duration in minutes
    maxAttempts: Number,
    passingScore: Number,
    instructions: String
  },
  
  // Communication
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  remindersSent: [{
    sentAt: Date,
    type: {
      type: String,
      enum: ['First Reminder', 'Second Reminder', 'Final Reminder']
    }
  }],
  
  // Access Tracking
  accessLog: [{
    accessedAt: Date,
    ipAddress: String,
    userAgent: String,
    action: {
      type: String,
      enum: ['Opened Link', 'Started Test', 'Resumed Test', 'Submitted Test']
    }
  }],
  
  // Notes
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining attempts
testInvitationSchema.virtual('remainingAttempts').get(function() {
  const maxAttempts = this.customSettings?.maxAttempts || this.test?.maxAttempts || 1;
  return Math.max(0, maxAttempts - (this.attempts?.length || 0));
});

// Virtual for is expired
testInvitationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Generate unique invitation token
testInvitationSchema.pre('save', function() {
  if (!this.invitationToken) {
    this.invitationToken = require('crypto').randomBytes(32).toString('hex');
  }
});

// Indexes
testInvitationSchema.index({ invitationToken: 1 });
testInvitationSchema.index({ candidate: 1 });
testInvitationSchema.index({ test: 1 });
testInvitationSchema.index({ company: 1 });
testInvitationSchema.index({ status: 1 });
testInvitationSchema.index({ expiresAt: 1 });
testInvitationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('TestInvitation', testInvitationSchema);
