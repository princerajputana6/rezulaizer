const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentActivities,
  getSystemStatus,
  createActivity,
  updateSystemStatus
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// Dashboard statistics
router.get('/stats', authorize(['SuperAdmin', 'Company']), getDashboardStats);
router.get('/company-stats', authorize(['SuperAdmin', 'Company']), getDashboardStats); // Add alias

// Recent activities
router.route('/activities')
  .get(authorize(['SuperAdmin', 'Company']), getRecentActivities)
  .post(authorize(['SuperAdmin', 'Company']), createActivity);

// System status
router.get('/system-status', authorize(['SuperAdmin', 'Company']), getSystemStatus);
router.put('/system-status/:serviceName', authorize(['SuperAdmin']), updateSystemStatus);

module.exports = router;
