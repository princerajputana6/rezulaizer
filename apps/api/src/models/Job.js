const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  department: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  workType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
    default: 'Full-time'
  },
  workMode: {
    type: String,
    enum: ['Remote', 'On-site', 'Hybrid'],
    default: 'On-site'
  },
  
  // Requirements
  requiredSkills: [{
    name: String,
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate'
    },
    mandatory: {
      type: Boolean,
      default: false
    }
  }],
  experienceRequired: {
    min: {
      type: Number,
      min: 0,
      default: 0
    },
    max: {
      type: Number,
      min: 0,
      default: 10
    }
  },
  education: {
    type: String,
    trim: true
  },
  
  // Compensation
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['Hourly', 'Monthly', 'Yearly'],
      default: 'Yearly'
    }
  },
  benefits: [String],
  
  // Company Information
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Application Settings
  applicationDeadline: Date,
  maxApplications: {
    type: Number,
    default: 100
  },
  
  // Status
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Closed', 'Filled'],
    default: 'Draft'
  },
  
  // Associated Tests
  requiredTests: [{
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test'
    },
    mandatory: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 1
    }
  }],
  
  // Statistics
  stats: {
    totalApplications: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    hiredCount: {
      type: Number,
      default: 0
    }
  },
  
  // SEO and Visibility
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Per-job assessment customization. When unset, defaults are used.
  assessmentConfig: {
    mcqCount: { type: Number, default: 3, min: 0, max: 20 },
    outputCount: { type: Number, default: 1, min: 0, max: 10 },
    practicalCount: { type: Number, default: 1, min: 0, max: 5 },
    mcqSeconds: { type: Number, default: 60, min: 15, max: 600 },
    outputSeconds: { type: Number, default: 120, min: 30, max: 1200 },
    practicalSeconds: { type: Number, default: 600, min: 60, max: 3600 },
    passingScore: { type: Number, default: 60, min: 0, max: 100 },
  },

  // Timestamps
  publishedAt: Date,
  closedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for applications count
jobSchema.virtual('applicationsCount', {
  ref: 'Candidate',
  localField: '_id',
  foreignField: 'appliedJobs.job',
  count: true
});

// Generate slug from title
jobSchema.pre('save', function() {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();
  }
});

// Indexes
jobSchema.index({ company: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ publishedAt: -1 });
jobSchema.index({ slug: 1 });
jobSchema.index({ 'requiredSkills.name': 1 });
// Hot path: company-scoped list view
jobSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
