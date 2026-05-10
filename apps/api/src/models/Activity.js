const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Activity description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: ['company_registration', 'user_activity', 'system_maintenance', 'assessment_activity', 'interview_activity', 'admin_action', 'other'],
    default: 'other'
  },
  icon: {
    type: String,
    required: [true, 'Activity icon is required'],
    enum: ['CheckCircle', 'Activity', 'ClipboardList', 'Video', 'Users', 'Building2', 'Settings', 'AlertCircle'],
    default: 'Activity'
  },
  color: {
    type: String,
    required: [true, 'Activity color is required'],
    enum: ['bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-yellow-600', 'bg-indigo-600'],
    default: 'bg-blue-600'
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Company', 'User', 'Admin', 'HR', 'SuperAdmin', 'Assessment', 'Interview', 'System'],
      default: 'System'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedEntity.entityType'
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  }
}, {
  timestamps: true,
  collection: 'activities'
});

// Index for efficient querying
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ isVisible: 1, createdAt: -1 });
activitySchema.index({ priority: -1, createdAt: -1 });

// Static method to create activity
activitySchema.statics.createActivity = async function(activityData) {
  return await this.create(activityData);
};

// Static method to get recent activities
activitySchema.statics.getRecentActivities = async function(limit = 10) {
  return await this.find({ isVisible: true })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .populate('relatedEntity.entityId', 'firstName lastName email name')
    .lean();
};

module.exports = mongoose.model('Activity', activitySchema);
