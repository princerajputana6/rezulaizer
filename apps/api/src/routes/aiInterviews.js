const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  scheduleInterview,
  listInterviews,
  getInterview,
  cancelInterview,
  evaluateInterview,
  joinByToken,
  getCurrentQuestion,
  submitAnswer,
  getResult,
  logProctoringEvent
} = require('../controllers/aiInterviewController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// ─────────────────────────────────────────
// RECRUITER ROUTES  (authenticated)
// ─────────────────────────────────────────
router.use('/manage', protect);

router.route('/manage')
  .get(authorize(['SuperAdmin', 'Company', 'HR']), listInterviews)
  .post(authorize(['SuperAdmin', 'Company', 'HR']), scheduleInterview);

router.route('/manage/:id')
  .get(authorize(['SuperAdmin', 'Company', 'HR']), getInterview)
  .delete(authorize(['SuperAdmin', 'Company', 'HR']), cancelInterview);

router.post('/manage/:id/evaluate', protect, authorize(['SuperAdmin', 'Company', 'HR']), evaluateInterview);

// ─────────────────────────────────────────
// CANDIDATE ROUTES  (token-gated, no auth)
// ─────────────────────────────────────────

// Verify token + get interview info
router.get('/join/:token', joinByToken);

// Get current question
router.get('/:id/question/:token', getCurrentQuestion);

// Submit answer (text transcript)
router.post('/:id/answer/:token', submitAnswer);

// Get final result
router.get('/:id/result/:token', getResult);

// Proctoring event
router.post('/:id/proctor/:token', logProctoringEvent);

// ─────────────────────────────────────────
// WHISPER STT PROXY
// ─────────────────────────────────────────

/**
 * POST /api/ai-interviews/stt
 * Accepts multipart audio file, proxies to:
 *   - Local Whisper API  (WHISPER_API_URL in .env)   OR
 *   - OpenAI Whisper API (OPENAI_API_KEY in .env)    OR
 *   - Returns transcript from body if pre-processed
 *
 * Field: audio (file)
 */
router.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file provided' });
    }

    // Option 1: Self-hosted Whisper API
    if (process.env.WHISPER_API_URL) {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'audio.webm',
        contentType: req.file.mimetype || 'audio/webm'
      });

      const { data } = await axios.post(process.env.WHISPER_API_URL, form, {
        headers: form.getHeaders(),
        timeout: 60000
      });

      return res.json({ success: true, transcript: data.text || data.transcript || '' });
    }

    // Option 2: OpenAI Whisper API
    if (process.env.OPENAI_API_KEY) {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'audio.webm',
        contentType: req.file.mimetype || 'audio/webm'
      });
      form.append('model', 'whisper-1');
      form.append('language', 'en');

      const { data } = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          timeout: 60000
        }
      );

      return res.json({ success: true, transcript: data.text || '' });
    }

    // Option 3: No STT configured – return empty (browser will use Web Speech API)
    return res.json({
      success: true,
      transcript: '',
      message: 'STT not configured. Use browser Web Speech API or set WHISPER_API_URL / OPENAI_API_KEY.'
    });

  } catch (err) {
    console.error('[STT proxy]', err.message);
    res.status(500).json({ success: false, message: 'STT processing failed', error: err.message });
  }
});

module.exports = router;
