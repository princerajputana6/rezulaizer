const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Interview title is required'],
    trim: true,
    maxlength: [200, 'Interview title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['Technical', 'HR', 'Behavioral', 'Final', 'Panel', 'Phone', 'Video'],
    default: 'Technical'
  },
  
  // Participants
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
  
  // Interviewers
  interviewers: [{
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    role: {
      type: String,
      enum: ['Primary', 'Secondary', 'Observer'],
      default: 'Primary'
    },
    name: String,
    email: String,
    title: String
  }],
  
  // Scheduling
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60,
    min: 15,
    max: 480
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Meeting Details
  meetingDetails: {
    platform: {
      type: String,
      enum: ['Zoom', 'Google Meet', 'Microsoft Teams', 'In-Person', 'Phone', 'Other'],
      default: 'Zoom'
    },
    meetingUrl: String,
    meetingId: String,
    password: String,
    location: String, // For in-person interviews
    dialInNumber: String, // For phone interviews
    instructions: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'],
    default: 'Scheduled'
  },
  
  // Interview Structure
  agenda: [{
    topic: String,
    duration: Number, // in minutes
    order: Number,
    notes: String
  }],
  
  // Questions and Evaluation
  questions: [{
    question: String,
    category: {
      type: String,
      enum: ['Technical', 'Behavioral', 'Cultural Fit', 'Experience', 'Problem Solving']
    },
    expectedAnswer: String,
    actualAnswer: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    notes: String
  }],
  
  // Evaluation Criteria
  evaluationCriteria: [{
    criterion: String,
    weight: {
      type: Number,
      min: 0,
      max: 100
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String
  }],
  
  // Results and Feedback
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  recommendation: {
    type: String,
    enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire', 'Strong No Hire'],
    default: 'Maybe'
  },
  
  // Feedback from each interviewer
  interviewerFeedback: [{
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    recommendation: {
      type: String,
      enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire', 'Strong No Hire']
    },
    strengths: [String],
    concerns: [String],
    comments: String,
    submittedAt: Date
  }],
  
  // Candidate Feedback
  candidateFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    experience: {
      type: String,
      enum: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']
    },
    comments: String,
    submittedAt: Date
  },
  
  // Recording and Notes
  recording: {
    url: String,
    duration: Number, // in seconds
    size: Number, // in bytes
    transcription: String,
    isAvailable: {
      type: Boolean,
      default: false
    }
  },
  
  // Session Tracking
  sessionData: {
    startedAt: Date,
    endedAt: Date,
    actualDuration: Number, // in minutes
    attendees: [{
      name: String,
      email: String,
      joinedAt: Date,
      leftAt: Date,
      duration: Number // in minutes
    }]
  },
  
  // Reminders and Notifications
  reminders: [{
    type: {
      type: String,
      enum: ['Email', 'SMS', 'Push']
    },
    sentTo: {
      type: String,
      enum: ['Candidate', 'Interviewer', 'Both']
    },
    sentAt: Date,
    scheduledFor: Date
  }],
  
  // Follow-up Actions
  followUpActions: [{
    action: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending'
    },
    completedAt: Date
  }],
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  round: {
    type: Number,
    default: 1,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Integration Data
  externalMeetingId: String, // For third-party integrations
  calendarEventId: String,
  
  // Notes
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for interview duration in hours
interviewSchema.virtual('durationInHours').get(function() {
  return this.duration ? (this.duration / 60).toFixed(1) : 0;
});

// Virtual for is upcoming
interviewSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.scheduledAt;
});

// Virtual for is overdue
interviewSchema.virtual('isOverdue').get(function() {
  return new Date() > new Date(this.scheduledAt.getTime() + (this.duration * 60 * 1000));
});

// Indexes
interviewSchema.index({ candidate: 1 });
interviewSchema.index({ company: 1 });
interviewSchema.index({ job: 1 });
interviewSchema.index({ scheduledAt: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ type: 1 });
interviewSchema.index({ createdAt: -1 });
interviewSchema.index({ 'interviewers.interviewer': 1 });

module.exports = mongoose.model('Interview', interviewSchema);
