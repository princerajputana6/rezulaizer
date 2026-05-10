const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getInterviews,
  getInterview,
  createInterview,
  updateInterview,
  deleteInterview,
  getUpcomingInterviews,
  getInterviewStats,
  rescheduleInterview,
  cancelInterview,
  submitFeedback,
  addAttendee,
  removeAttendee,
  confirmAttendance
} = require('../controllers/interviewController');

router.use(protect);

router.route('/')
  .get(authorize(['SuperAdmin', 'Company', 'HR']), getInterviews)
  .post(authorize(['SuperAdmin', 'Company', 'HR']), createInterview);

router.route('/upcoming')
  .get(authorize(['SuperAdmin', 'Company', 'HR']), getUpcomingInterviews);

router.route('/stats')
  .get(authorize(['SuperAdmin', 'Company', 'HR']), getInterviewStats);

router.route('/:id')
  .get(authorize(['SuperAdmin', 'Company', 'HR']), getInterview)
  .put(authorize(['SuperAdmin', 'Company', 'HR']), updateInterview)
  .delete(authorize(['SuperAdmin', 'Company', 'HR']), deleteInterview);

router.route('/:id/reschedule')
  .put(authorize(['SuperAdmin', 'Company', 'HR']), rescheduleInterview);

router.route('/:id/cancel')
  .put(authorize(['SuperAdmin', 'Company', 'HR']), cancelInterview);

router.route('/:id/feedback')
  .post(authorize(['SuperAdmin', 'Company', 'HR']), submitFeedback);

router.route('/:id/attendees')
  .post(authorize(['SuperAdmin', 'Company', 'HR']), addAttendee);

router.route('/:id/attendees/:attendeeId')
  .delete(authorize(['SuperAdmin', 'Company', 'HR']), removeAttendee);

router.route('/:id/attendees/:attendeeId/confirm')
  .put(authorize(['SuperAdmin', 'Company', 'HR']), confirmAttendance);

module.exports = router;
