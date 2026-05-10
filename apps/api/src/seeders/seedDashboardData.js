const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const SystemStatus = require('../models/SystemStatus');
const logger = require('../utils/logger');
require('dotenv').config();

const seedDashboardData = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    logger.info('Connected to MongoDB for dashboard seeding');

    // Clear existing data
    await Activity.deleteMany({});
    await SystemStatus.deleteMany({});
    logger.info('Cleared existing dashboard data');

    // Seed Activities
    const activities = [
      {
        title: 'New company registered',
        description: 'TechCorp Inc. - 2 hours ago',
        type: 'company_registration',
        icon: 'CheckCircle',
        color: 'bg-green-600',
        priority: 8
      },
      {
        title: 'System maintenance completed',
        description: 'Database optimization - 4 hours ago',
        type: 'system_maintenance',
        icon: 'Activity',
        color: 'bg-blue-600',
        priority: 6
      },
      {
        title: 'High assessment activity',
        description: '250+ assessments today - 6 hours ago',
        type: 'assessment_activity',
        icon: 'ClipboardList',
        color: 'bg-purple-600',
        priority: 7
      },
      {
        title: 'Video interview completed',
        description: 'AI interviewer session - 8 hours ago',
        type: 'interview_activity',
        icon: 'Video',
        color: 'bg-orange-600',
        priority: 5
      },
      {
        title: 'New HR manager added',
        description: 'Sarah Johnson joined InnovateTech - 1 day ago',
        type: 'user_activity',
        icon: 'Users',
        color: 'bg-indigo-600',
        priority: 4
      },
      {
        title: 'Company subscription upgraded',
        description: 'DataSystems Inc. upgraded to Premium - 1 day ago',
        type: 'admin_action',
        icon: 'Building2',
        color: 'bg-green-600',
        priority: 6
      },
      {
        title: 'Bulk assessment created',
        description: '50 technical assessments for DevCorp - 2 days ago',
        type: 'assessment_activity',
        icon: 'ClipboardList',
        color: 'bg-purple-600',
        priority: 3
      },
      {
        title: 'System backup completed',
        description: 'Weekly automated backup successful - 3 days ago',
        type: 'system_maintenance',
        icon: 'Activity',
        color: 'bg-blue-600',
        priority: 2
      }
    ];

    await Activity.insertMany(activities);
    logger.info(`Seeded ${activities.length} activities`);

    // Seed System Status
    const systemServices = [
      {
        serviceName: 'api_services',
        displayName: 'API Services',
        status: 'operational',
        description: 'All API endpoints are responding normally',
        uptime: 99.9,
        responseTime: 120,
        order: 1
      },
      {
        serviceName: 'database',
        displayName: 'Database',
        status: 'operational',
        description: 'MongoDB cluster is healthy',
        uptime: 99.8,
        responseTime: 45,
        order: 2
      },
      {
        serviceName: 'video_services',
        displayName: 'Video Services',
        status: 'maintenance',
        description: 'Scheduled maintenance in progress',
        uptime: 95.2,
        responseTime: 200,
        order: 3
      },
      {
        serviceName: 'file_storage',
        displayName: 'File Storage',
        status: 'operational',
        description: 'Cloud storage is functioning normally',
        uptime: 99.5,
        responseTime: 80,
        order: 4
      },
      {
        serviceName: 'ai_processing',
        displayName: 'AI Processing',
        status: 'operational',
        description: 'AI models are processing requests normally',
        uptime: 98.7,
        responseTime: 350,
        order: 5
      },
      {
        serviceName: 'notification_service',
        displayName: 'Notifications',
        status: 'operational',
        description: 'Email and SMS notifications are working',
        uptime: 99.1,
        responseTime: 150,
        order: 6
      }
    ];

    await SystemStatus.insertMany(systemServices);
    logger.info(`Seeded ${systemServices.length} system services`);

    logger.info('Dashboard data seeding completed successfully');

  } catch (error) {
    logger.error('Error seeding dashboard data:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
};

// Run if called directly
if (require.main === module) {
  seedDashboardData();
}

module.exports = seedDashboardData;
