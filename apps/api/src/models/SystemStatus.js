const mongoose = require('mongoose');

const systemStatusSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    maxlength: [100, 'Display name cannot exceed 100 characters']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['operational', 'maintenance', 'degraded', 'outage'],
    default: 'operational'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  uptime: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  responseTime: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'systemstatus'
});

// Index for efficient querying
systemStatusSchema.index({ serviceName: 1 });
systemStatusSchema.index({ isActive: 1, order: 1 });
systemStatusSchema.index({ status: 1 });

// Virtual for status color
systemStatusSchema.virtual('statusColor').get(function() {
  const colorMap = {
    'operational': 'bg-green-500',
    'maintenance': 'bg-yellow-500',
    'degraded': 'bg-orange-500',
    'outage': 'bg-red-500'
  };
  return colorMap[this.status] || 'bg-gray-500';
});

// Virtual for status text color
systemStatusSchema.virtual('statusTextColor').get(function() {
  const colorMap = {
    'operational': 'bg-green-100 text-green-700',
    'maintenance': 'bg-yellow-100 text-yellow-700',
    'degraded': 'bg-orange-100 text-orange-700',
    'outage': 'bg-red-100 text-red-700'
  };
  return colorMap[this.status] || 'bg-gray-100 text-gray-700';
});

// Static method to get all active services
systemStatusSchema.statics.getActiveServices = async function() {
  return await this.find({ isActive: true })
    .sort({ order: 1, serviceName: 1 })
    .lean();
};

// Static method to update service status
systemStatusSchema.statics.updateServiceStatus = async function(serviceName, statusData) {
  return await this.findOneAndUpdate(
    { serviceName },
    { 
      ...statusData,
      lastChecked: new Date()
    },
    { 
      new: true,
      upsert: true
    }
  );
};

// Method to check if service is healthy
systemStatusSchema.methods.isHealthy = function() {
  return this.status === 'operational' && this.uptime >= 95;
};

module.exports = mongoose.model('SystemStatus', systemStatusSchema);
