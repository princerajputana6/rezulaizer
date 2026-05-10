const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const connectDB = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
const { processResume } = require('./src/services/resumeParserService');

// Import routes
const authRoutes = require('./src/routes/auth');
const companyRoutes = require('./src/routes/companies');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const candidatesRoutes = require('./src/routes/candidates');
const analyticsRoutes = require('./src/routes/analytics');
const hrRoutes = require('./src/routes/hr');
const jdTemplatesRoutes = require('./src/routes/jdTemplates');
const jobDescriptionsRoutes = require('./src/routes/jobDescriptions');
const videoInterviewsRoutes = require('./src/routes/videoInterviews');
const profileRoutes = require('./src/routes/profile');
const interviewsRoutes = require('./src/routes/interviews');
const aiInterviewsRoutes = require('./src/routes/aiInterviews');
const matchingRoutes = require('./src/routes/matching');
const testsRoutes = require('./src/routes/tests');

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy
app.set('trust proxy', 1);

// Rate limiting (mounted AFTER CORS below, so 429 responses still carry
// Access-Control-Allow-Origin and don't surface as opaque "Network Error" in
// the browser). Candidate test endpoints skip the limit because answer auto-
// saves fire frequently during an assessment.
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for routes the candidate hits during an active test
    if (req.path.startsWith('/tests/') && /\/(start|answer|submit|flag|results)$/.test(req.path)) return true;
    if (req.path.startsWith('/candidates/assessment/')) return true;
    if (req.path.startsWith('/candidates/video-interview/')) return true;
    return false;
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// Production allow-list. In development we allow any localhost / 127.0.0.1
// origin (and any LAN IP) so dev across multiple ports/devices "just works".
const prodAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://rezulaizer.com",
  "https://www.rezulaizer.com",
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/$/, "")] : []),
];

const isDev = process.env.NODE_ENV !== "production";

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // curl / Postman / server-to-server
  if (prodAllowedOrigins.includes(origin)) return true;
  if (!isDev) return false;
  // Dev: any localhost, any 127.0.0.1, any private LAN IP — any port
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost") return true;
    if (u.hostname === "127.0.0.1") return true;
    if (/^10\./.test(u.hostname)) return true;
    if (/^192\.168\./.test(u.hostname)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(u.hostname)) return true;
  } catch (_) {}
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));
// Critical: preflight must use the same options so the browser sees a matching
// Access-Control-Allow-Origin for the requesting origin.
app.options("*", cors(corsOptions));

// Apply rate limiting AFTER CORS so 429 responses still include CORS headers
// (otherwise browsers surface them as opaque "Network Error" with no detail).
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Data sanitization against NoSQL query injection (Mongo sanitize removed)

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/hr-users', hrRoutes);
app.use('/api/jd-templates', jdTemplatesRoutes);
app.use('/api/job-descriptions', jobDescriptionsRoutes);
app.use('/api/video-interviews', videoInterviewsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/ai-interviews', aiInterviewsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/tests', testsRoutes);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Resume Parser Routes
app.post('/api/parse', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No resume file provided'
      });
    }

    const { buffer, mimetype, originalname } = req.file;
    
    logger.info(`[Parser] Processing file: ${originalname} (${mimetype})`);
    
    const profile = await processResume(buffer, mimetype, originalname);
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    logger.error(`[Parser] Error:`, error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Parse resume endpoint (JSON with base64) - for Cloudflare Worker
app.post('/api/parse-base64', async (req, res) => {
  try {
    const { filename, contentType, dataBase64 } = req.body;
    
    if (!dataBase64) {
      return res.status(400).json({
        success: false,
        error: 'No resume data provided'
      });
    }

    logger.info(`[Parser] Processing base64 file: ${filename} (${contentType})`);
    
    const buffer = Buffer.from(dataBase64, 'base64');
    const profile = await processResume(buffer, contentType, filename);
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    logger.error(`[Parser] Error:`, error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// API routes retired: use Cloudflare Worker for APIs. This server serves only health/static.

// Debug route to test company routes
app.get('/api/companies/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Company routes are working',
    timestamp: new Date().toISOString()
  });
});

// Debug middleware to log all requests
app.use('/api/companies', (req, res, next) => {
  console.log(`[DEBUG] Company route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// SMTP test endpoint — GET /api/test-smtp?to=your@email.com
app.get('/api/test-smtp', async (req, res) => {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpHost = process.env.SMTP_HOST || '';
  const toEmail = req.query.to || smtpUser;

  const config = {
    SMTP_USER: smtpUser || '(not set)',
    SMTP_PASS: smtpPass ? '***' + smtpPass.slice(-4) : '(not set)',
    SMTP_HOST: smtpHost || '(not set — Gmail auto-detect will be used if SMTP_USER is @gmail.com)',
    SMTP_PORT: process.env.SMTP_PORT || '587 (default)',
    detectedMode: smtpUser.toLowerCase().endsWith('@gmail.com') ? 'Gmail service (auto)' : smtpHost ? 'Manual SMTP' : 'Mock (no config)'
  };

  try {
    const { sendEmail } = require('./src/services/emailService');
    await sendEmail({
      to: toEmail,
      subject: 'Rezulyzer SMTP Test ✅',
      html: `<h2>SMTP is working!</h2><p>This is a test email from Rezulyzer sent at ${new Date().toISOString()}</p>`
    });
    res.json({ success: true, message: `Test email sent to ${toEmail}`, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, config });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = app;
