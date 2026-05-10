const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Test = require('../models/Test');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../utils/constants');
const cloudinaryService = require('../services/cloudinaryService');
const logger = require('../utils/logger');
const multer = require('multer');
const { generateAssessmentQuestions } = require('../services/assessmentGeneratorService');

// @desc    Get all candidates
// @route   GET /api/candidates
// @access  Private (SuperAdmin, Company)
const getCandidates = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  
  // Build query
  let query = {};
  
  // Filter by company if not SuperAdmin
  if (req.userType !== 'SuperAdmin') {
    query.company = req.user._id;
  }
  
  // Filter by status
  if (status) {
    query.status = status;
  }
  
  // Search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  const [candidates, total] = await Promise.all([
    Candidate.find(query)
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean(),
    Candidate.countDocuments(query),
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      candidates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// @desc    Get single candidate
// @route   GET /api/candidates/:id
// @access  Private (SuperAdmin, Company)
const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .populate('company', 'name')
    .populate('appliedJobs.job', 'title')
    .populate('testAttempts.test', 'title')
    .populate('interviews', 'title scheduledAt status');
  
  if (!candidate) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Candidate not found'
    });
  }
  
  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company._id.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN
    });
  }
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { candidate }
  });
});

// @desc    Create candidate
// @route   POST /api/candidates
// @access  Private (SuperAdmin, Company)
const createCandidate = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, currentPosition, experience, skills } = req.body;
  
  // Check if candidate already exists
  const existingCandidate = await Candidate.findOne({ email });
  if (existingCandidate) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Candidate with this email already exists'
    });
  }
  
  // Set company
  const companyId = req.userType === 'SuperAdmin' ? req.body.company : req.user._id;
  
  const candidate = await Candidate.create({
    firstName,
    lastName,
    email,
    phone,
    currentPosition,
    experience,
    skills,
    company: companyId
  });
  
  await candidate.populate('company', 'name');
  
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Candidate created successfully',
    data: { candidate }
  });
});

// @desc    Update candidate
// @route   PUT /api/candidates/:id
// @access  Private (SuperAdmin, Company)
const updateCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Candidate not found'
    });
  }
  
  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN
    });
  }
  
  const updatedCandidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('company', 'name');
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Candidate updated successfully',
    data: { candidate: updatedCandidate }
  });
});

// @desc    Delete candidate
// @route   DELETE /api/candidates/:id
// @access  Private (SuperAdmin, Company)
const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Candidate not found'
    });
  }
  
  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN
    });
  }
  
  // Delete resume from Cloudinary if exists
  if (candidate.resume && candidate.resume.path) {
    try {
      await cloudinaryService.deleteFile(candidate.resume.path);
    } catch (error) {
      logger.warn(`Failed to delete resume from Cloudinary: ${error.message}`);
    }
  }
  
  await Candidate.findByIdAndDelete(req.params.id);
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Candidate deleted successfully'
  });
});

// @desc    Upload resume
// @route   POST /api/candidates/:id/resume OR POST /api/candidates/upload-resume
// @access  Private (SuperAdmin, Company)
const uploadResume = asyncHandler(async (req, res) => {
  let candidate;
  
  // Handle both routes: /:id/resume and /upload-resume
  if (req.params.id) {
    // Route: /api/candidates/:id/resume
    candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Candidate not found'
      });
    }
  } else {
    // Route: /api/candidates/upload-resume (create new candidate)
    const { firstName, lastName, email, phone } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }
    
    // Check if candidate already exists
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Candidate with this email already exists'
      });
    }
    
    // Create new candidate
    const companyId = req.userType === 'SuperAdmin' ? req.body.company : req.user._id;
    candidate = await Candidate.create({
      firstName,
      lastName,
      email,
      phone,
      company: companyId
    });
  }
  
  // Check access
  if (req.userType !== 'SuperAdmin' && candidate.company.toString() !== req.user._id.toString()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN
    });
  }
  
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  
  // Delete old resume from Cloudinary if exists
  if (candidate.resume && candidate.resume.path) {
    try {
      await cloudinaryService.deleteFile(candidate.resume.path);
    } catch (error) {
      logger.warn(`Failed to delete old resume: ${error.message}`);
    }
  }
  
  // Upload to Cloudinary with structured folder path
  const uploadResult = await cloudinaryService.uploadResume(
    req.file.buffer,
    req.file.originalname,
    candidate.company.toString(),
    candidate.email
  );
  
  if (!uploadResult.success) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to upload resume',
      error: uploadResult.error
    });
  }
  
  // Update candidate with resume info
  candidate.resume = {
    filename: uploadResult.originalName,
    originalName: uploadResult.originalName,
    path: uploadResult.publicId,
    uploadedAt: new Date(),
    size: uploadResult.bytes,
    url: uploadResult.url
  };
  
  await candidate.save();
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Resume uploaded successfully',
    data: {
      candidate,
      resume: {
        url: uploadResult.fileUrl,
        filename: uploadResult.originalName
      }
    }
  });
});

// @desc    Get candidate stats
// @route   GET /api/candidates/stats
// @access  Private (SuperAdmin, Company)
const getCandidateStats = asyncHandler(async (req, res) => {
  let query = {};
  
  // Filter by company if not SuperAdmin
  if (req.userType !== 'SuperAdmin') {
    query.company = req.user._id;
  }
  
  const [
    totalCandidates,
    activeCandidates,
    candidatesByStatus
  ] = await Promise.all([
    Candidate.countDocuments(query),
    Candidate.countDocuments({ ...query, isActive: true }),
    Candidate.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      totalCandidates,
      activeCandidates,
      candidatesByStatus
    }
  });
});

// Services
const { processResume: processResumeEnhanced } = require('../services/resumeParserService');
// const { sendAssessmentEmail } = require('../services/emailService');
// const aiService = require('../config/ai');
const crypto = require('crypto');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
  }
};

// Normalize and validate MCQ questions coming from AI
function normalizeMcqItems(items, fallbackCount = 10) {
  const allowedDifficulties = new Set(['easy','medium','hard']);
  const out = [];
  const arr = Array.isArray(items) ? items : [];
  
  for (const raw of arr) {
    const qText = (raw?.question || '').toString().trim();
    if (!qText) continue;
    
    let opts = Array.isArray(raw?.options) ? raw.options.slice(0, 4) : [];
    opts = opts.map(o => (o || '').toString());
    while (opts.length < 4) opts.push('');
    
    const labels = ['A','B','C','D'];
    const normalizedOptions = opts.slice(0,4).map((opt, i) => {
      const clean = opt.replace(/^\s*[A-D]\)\s*/i, '').trim();
      return clean || `Option ${labels[i]}`;
    });

    let letter = (raw?.correctAnswer || '').toString().trim().toUpperCase();
    if (!['A','B','C','D'].includes(letter)) {
      const answerText = (raw?.correctAnswer || '').toString().trim();
      const idx = normalizedOptions.findIndex(o => o.toLowerCase() === answerText.toLowerCase());
      letter = idx >= 0 ? labels[idx] : 'A';
    }
    const correctIndex = letter.charCodeAt(0) - 65;

    let diff = (raw?.difficulty || '').toString().toLowerCase();
    if (!allowedDifficulties.has(diff)) diff = 'medium';

    const explanation = (raw?.explanation || '').toString().trim() || 'Refer to the correct option.';

    out.push({
      question: qText,
      options: normalizedOptions,
      correctLetter: letter,
      correctIndex,
      explanation,
      difficulty: diff,
      type: 'multiple_choice',
      points: Number.isFinite(raw?.points) ? raw.points : 10,
    });
  }
  
  return out.slice(0, Math.max(0, fallbackCount));
}

// @desc    Generate an AI-powered assessment based on candidate resume/profile
// @route   POST /api/candidates/:id/generate-assessment
// @access  Private (Company)
const generateAssessment = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate ID' });
    }

    const companyId = req.user.companyId || req.user._id;
    let candidate = await Candidate.findOne({ _id: req.params.id, company: companyId });
    if (!candidate) {
      candidate = await Candidate.findById(req.params.id);
    }

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Build comprehensive resume text from enhanced parsed data
    const resumeText = buildResumeTextFromProfile(candidate);
    
    const questionCount = Math.max(5, Math.min(20, parseInt(req.body.count) || 10));
    const provider = (req.body.provider || process.env.AI_PROVIDER || 'openai').toLowerCase();
    const model = req.body.model;

    let aiQuestions = [];
    try {
      aiQuestions = await aiService.withOverrides({ provider, model }, async () => {
        return await aiService.generateQuestions(resumeText, 'multiple_choice', questionCount);
      });
    } catch (e) {
      // Generate fallback questions based on skills
      const skills = candidate.skills?.technical?.map(s => s.name) || ['General Knowledge'];
      aiQuestions = skills.slice(0, questionCount).map((skill, idx) => ({
        question: `Which of the following best describes ${skill}?`,
        options: [
          'A) A frontend framework',
          'B) A backend runtime', 
          'C) A programming paradigm',
          'D) A testing library'
        ],
        correctAnswer: 'A',
        explanation: `This is a placeholder question about ${skill}.`,
        difficulty: 'medium',
        type: 'multiple_choice',
        points: 10
      }));
    }

    const normalized = normalizeMcqItems(aiQuestions, questionCount);
    if (normalized.length === 0) {
      return res.status(400).json({ success: false, message: 'AI did not return valid MCQs' });
    }

    // Create Question documents
    const createdQuestions = [];
    for (const q of normalized) {
      const optionsArray = q.options.map((text, idx) => ({ 
        text, 
        isCorrect: idx === q.correctIndex 
      }));

      const questionDoc = new Question({
        question: q.question,
        type: 'multiple-choice',
        domain: 'Aptitude',
        subDomain: '',
        difficulty: q.difficulty,
        points: q.points,
        options: optionsArray,
        correctAnswer: q.correctLetter,
        explanation: q.explanation,
        createdBy: req.user._id,
        companyId: companyId
      });
      await questionDoc.save();
      createdQuestions.push(questionDoc._id);
    }

    // Create Test document
    const testTitle = `Assessment for ${candidate.name}`;
    const test = new Test({
      title: testTitle,
      description: `Auto-generated assessment based on ${candidate.name}'s resume`,
      type: 'technical',
      duration: 30,
      createdBy: req.user._id,
      questions: createdQuestions,
      difficulty: 'mixed',
      settings: { 
        shuffleQuestions: true, 
        shuffleOptions: true, 
        preventCheating: true, 
        timeLimit: true, 
        autoSubmit: true 
      },
      status: 'published',
      publishedAt: new Date()
    });
    await test.save();

    // Assign test to candidate
    candidate.assignedTests = candidate.assignedTests || [];
    candidate.assignedTests.push({ 
      testId: test._id, 
      assignedBy: req.user._id, 
      assignedAt: new Date(), 
      status: 'pending' 
    });
    await candidate.save();

    res.status(201).json({ 
      success: true, 
      data: { 
        testId: test._id, 
        totalQuestions: createdQuestions.length 
      } 
    });
  } catch (error) {
    console.error('Generate assessment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while generating assessment' 
    });
  }
};

// Helper function to build comprehensive resume text from parsed profile
function buildResumeTextFromProfile(candidate) {
  const sections = [];

  // Personal Information
  if (candidate.name || candidate.email || candidate.phone) {
    sections.push(`Name: ${candidate.name || 'N/A'}`);
    sections.push(`Email: ${candidate.email || 'N/A'}`);
    sections.push(`Phone: ${candidate.phone || 'N/A'}`);
    if (candidate.location) sections.push(`Location: ${candidate.location}`);
  }

  // Professional Summary
  if (candidate.summary) {
    sections.push(`\nPROFESSIONAL SUMMARY:\n${candidate.summary}`);
  }

  // Current Position
  if (candidate.currentPosition?.title || candidate.currentPosition?.company) {
    sections.push(`\nCURRENT POSITION:\n${candidate.currentPosition.title} at ${candidate.currentPosition.company}`);
  }

  // Experience
  if (candidate.experience && candidate.experience.length > 0) {
    sections.push('\nWORK EXPERIENCE:');
    candidate.experience.forEach(exp => {
      sections.push(`\n${exp.title} at ${exp.company} (${exp.location || 'Location N/A'})`);
      if (exp.startDate || exp.endDate) {
        const start = exp.startDate ? new Date(exp.startDate).getFullYear() : 'N/A';
        const end = exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present';
        sections.push(`Duration: ${start} - ${end}`);
      }
      if (exp.description) sections.push(exp.description);
      if (exp.responsibilities && exp.responsibilities.length > 0) {
        sections.push('Responsibilities:');
        exp.responsibilities.forEach(resp => sections.push(`• ${resp}`));
      }
      if (exp.achievements && exp.achievements.length > 0) {
        sections.push('Achievements:');
        exp.achievements.forEach(ach => sections.push(`• ${ach}`));
      }
      if (exp.technologies && exp.technologies.length > 0) {
        sections.push(`Technologies: ${exp.technologies.join(', ')}`);
      }
    });
  }

  // Skills
  if (candidate.skills) {
    sections.push('\nSKILLS:');
    
    if (candidate.skills.technical && candidate.skills.technical.length > 0) {
      sections.push('Technical Skills:');
      candidate.skills.technical.forEach(skill => {
        const skillText = typeof skill === 'object' ? 
          `${skill.name} (${skill.level || 'N/A'}, ${skill.years || 0} years)` : 
          skill;
        sections.push(`• ${skillText}`);
      });
    }
    
    if (candidate.skills.soft && candidate.skills.soft.length > 0) {
      sections.push(`Soft Skills: ${candidate.skills.soft.join(', ')}`);
    }
    
    if (candidate.skills.languages && candidate.skills.languages.length > 0) {
      sections.push('Languages:');
      candidate.skills.languages.forEach(lang => {
        const langText = typeof lang === 'object' ? 
          `${lang.language} (${lang.proficiency || 'N/A'})` : 
          lang;
        sections.push(`• ${langText}`);
      });
    }
  }

  // Education
  if (candidate.education && candidate.education.length > 0) {
    sections.push('\nEDUCATION:');
    candidate.education.forEach(edu => {
      sections.push(`${edu.degree || 'Degree N/A'} in ${edu.fieldOfStudy || 'Field N/A'}`);
      sections.push(`${edu.institution || 'Institution N/A'} (${edu.location || 'Location N/A'})`);
      if (edu.graduationDate) {
        sections.push(`Graduated: ${new Date(edu.graduationDate).getFullYear()}`);
      }
      if (edu.gpa) sections.push(`GPA: ${edu.gpa}${edu.maxGpa ? `/${edu.maxGpa}` : ''}`);
      if (edu.honors && edu.honors.length > 0) {
        sections.push(`Honors: ${edu.honors.join(', ')}`);
      }
      if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
        sections.push(`Relevant Coursework: ${edu.relevantCoursework.join(', ')}`);
      }
    });
  }

  // Projects
  if (candidate.projects && candidate.projects.length > 0) {
    sections.push('\nPROJECTS:');
    candidate.projects.forEach(proj => {
      sections.push(`\n${proj.name || 'Project Name N/A'}`);
      if (proj.description) sections.push(proj.description);
      if (proj.role) sections.push(`Role: ${proj.role}`);
      if (proj.technologies && proj.technologies.length > 0) {
        sections.push(`Technologies: ${proj.technologies.join(', ')}`);
      }
      if (proj.keyFeatures && proj.keyFeatures.length > 0) {
        sections.push('Key Features:');
        proj.keyFeatures.forEach(feature => sections.push(`• ${feature}`));
      }
      if (proj.outcomes && proj.outcomes.length > 0) {
        sections.push('Outcomes:');
        proj.outcomes.forEach(outcome => sections.push(`• ${outcome}`));
      }
    });
  }

  // Certifications
  if (candidate.certifications && candidate.certifications.length > 0) {
    sections.push('\nCERTIFICATIONS:');
    candidate.certifications.forEach(cert => {
      sections.push(`${cert.name || 'Certification N/A'} - ${cert.issuer || 'Issuer N/A'}`);
      if (cert.issueDate) {
        sections.push(`Issued: ${new Date(cert.issueDate).getFullYear()}`);
      }
      if (cert.expiryDate) {
        sections.push(`Expires: ${new Date(cert.expiryDate).getFullYear()}`);
      }
      if (cert.skills && cert.skills.length > 0) {
        sections.push(`Skills Covered: ${cert.skills.join(', ')}`);
      }
    });
  }

  // Career Overview
  if (candidate.careerOverview) {
    const co = candidate.careerOverview;
    sections.push('\nCAREER OVERVIEW:');
    if (co.totalYearsExperience) {
      sections.push(`Total Experience: ${co.totalYearsExperience} years`);
    }
    if (co.careerLevel) sections.push(`Career Level: ${co.careerLevel}`);
    if (co.industryExperience && co.industryExperience.length > 0) {
      sections.push(`Industry Experience: ${co.industryExperience.join(', ')}`);
    }
    if (co.functionalAreas && co.functionalAreas.length > 0) {
      sections.push(`Functional Areas: ${co.functionalAreas.join(', ')}`);
    }
  }

  return sections.join('\n');
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// @desc    Upload and process resume with enhanced AI parsing
// @route   POST /api/candidates/upload-resume
// @access  Private (Company)
const handleResumeUpload = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const testCompanyId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const companyId = req.user?.companyId || req.user?._id || testCompanyId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file uploaded'
      });
    }

    const { file } = req;
    
    // Upload file to Cloudinary
    let uploadResult;
    
    try {
      uploadResult = await cloudinaryService.uploadResume(
        file.buffer,
        file.originalname,
        'temp',
        'temp'
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }
    } catch (uploadError) {
      logger.error('[ERROR] Cloudinary upload failed:', uploadError.message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to upload resume file',
        error: uploadError.message
      });
    }

    // Use the enhanced resume parser
    console.log('[INFO] Starting enhanced AI resume processing...');
    let extractedData;
    
    try {
      extractedData = await processResumeEnhanced(file.buffer, file.mimetype, file.originalname);
      console.log('[SUCCESS] Enhanced AI resume parsing completed');
    } catch (enhancedError) {
      console.warn('[WARN] Enhanced resume parsing failed:', enhancedError.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse resume with enhanced AI. Please ensure the resume is readable and contains proper formatting.',
        error: enhancedError.message,
        data: {
          resumeMeta: {
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype
          }
        }
      });
    }

    // Validate essential data
    if (!extractedData?.email || !extractedData?.name) {
      return res.status(400).json({
        success: false,
        message: 'Unable to extract required details from resume. Please confirm name and email are clearly visible.',
        data: {
          suggested: {
            name: extractedData?.name || '',
            email: extractedData?.email || '',
            phone: extractedData?.phone || ''
          },
          resumeMeta: {
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype
          }
        }
      });
    }

    // Check for existing candidate
    const existingCandidate = await Candidate.findOne({
      email: extractedData.email,
      company: companyId
    });

    if (existingCandidate) {
      return res.status(409).json({
        success: false,
        message: 'Candidate with this email already exists',
        data: { candidateId: existingCandidate._id }
      });
    }

    // Create comprehensive candidate data structure
    const candidateData = {
      // Basic information
      name: extractedData.name,
      email: extractedData.email,
      phone: extractedData.phone || '',
      location: extractedData.location || '',
      
      // Professional details
      linkedinUrl: extractedData.socialProfiles?.linkedin || extractedData.linkedinUrl || '',
      portfolioUrl: extractedData.socialProfiles?.portfolio || extractedData.portfolioUrl || '',
      githubUrl: extractedData.socialProfiles?.github || extractedData.githubUrl || '',
      
      summary: extractedData.summary || extractedData.professionalSummary || '',
      
      // Current position
      currentPosition: {
        title: extractedData.currentPosition?.title || extractedData.careerOverview?.currentRole || '',
        company: extractedData.currentPosition?.company || extractedData.careerOverview?.currentCompany || ''
      },

      // Experience with enhanced details
      experience: (extractedData.experience || []).map(exp => ({
        title: exp.title || '',
        company: exp.company || '',
        location: exp.location || '',
        startDate: exp.startDate ? new Date(exp.startDate) : null,
        endDate: exp.endDate ? new Date(exp.endDate) : null,
        current: exp.current || exp.isCurrentJob || false,
        description: exp.description || '',
        achievements: exp.achievements || [],
        responsibilities: exp.responsibilities || [],
        technologies: exp.technologies || [],
        tools: exp.tools || [],
        employmentType: exp.employmentType || 'Full-time',
        teamSize: exp.teamSize || '',
        industry: exp.industry || '',
        keyProjects: exp.keyProjects || [],
        metrics: exp.metrics || []
      })),

      // Education with comprehensive details
      education: (extractedData.education || []).map(edu => ({
        institution: edu.institution || '',
        degree: edu.degree || '',
        fieldOfStudy: edu.fieldOfStudy || '',
        location: edu.location || '',
        startDate: edu.startDate ? new Date(edu.startDate) : null,
        endDate: edu.endDate ? new Date(edu.endDate) : null,
        graduationDate: edu.graduationDate ? new Date(edu.graduationDate) : null,
        gpa: edu.gpa || '',
        maxGpa: edu.maxGpa || '',
        honors: edu.honors || [],
        relevantCoursework: edu.relevantCoursework || [],
        thesis: edu.thesis || '',
        scholarships: edu.scholarships || []
      })),

      // Skills structure
      skills: {
        technical: (extractedData.skills?.technical || []).map(skill => ({
          name: typeof skill === 'string' ? skill : (skill.name || skill),
          level: typeof skill === 'object' ? (skill.level || 'Intermediate') : 'Intermediate',
          years: typeof skill === 'object' ? (skill.years || 0) : 0,
          category: typeof skill === 'object' ? (skill.category || 'General') : 'General'
        })),
        soft: extractedData.skills?.soft || [],
        languages: (extractedData.skills?.languages || []).map(lang => ({
          language: typeof lang === 'string' ? lang : (lang.language || lang),
          proficiency: typeof lang === 'object' ? (lang.proficiency || 'Intermediate') : 'Intermediate',
          certifications: typeof lang === 'object' ? (lang.certifications || []) : []
        }))
      },

      // Projects with enhanced details
      projects: (extractedData.projects || []).map(proj => ({
        name: proj.name || '',
        description: proj.description || '',
        role: proj.role || '',
        technologies: proj.technologies || [],
        tools: proj.tools || [],
        startDate: proj.startDate ? new Date(proj.startDate) : null,
        endDate: proj.endDate ? new Date(proj.endDate) : null,
        url: proj.url || '',
        githubUrl: proj.githubUrl || '',
        teamSize: proj.teamSize || '',
        keyFeatures: proj.keyFeatures || [],
        challenges: proj.challenges || [],
        outcomes: proj.outcomes || [],
        metrics: proj.metrics || []
      })),

      // Certifications
      certifications: (extractedData.certifications || []).map(cert => ({
        name: cert.name || '',
        issuer: cert.issuer || '',
        issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
        expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
        credentialId: cert.credentialId || '',
        verificationUrl: cert.verificationUrl || '',
        description: cert.description || '',
        skills: cert.skills || []
      })),

      // Awards and Recognition
      awards: (extractedData.awards || []).map(award => ({
        name: award.name || '',
        issuer: award.issuer || '',
        date: award.date ? new Date(award.date) : null,
        description: award.description || '',
        category: award.category || ''
      })),

      // Publications
      publications: (extractedData.publications || []).map(pub => ({
        title: pub.title || '',
        journal: pub.journal || '',
        authors: pub.authors || [],
        publishDate: pub.publishDate ? new Date(pub.publishDate) : null,
        url: pub.url || '',
        doi: pub.doi || '',
        citations: pub.citations || null,
        description: pub.description || ''
      })),

      // Volunteering
      volunteering: (extractedData.volunteering || []).map(vol => ({
        organization: vol.organization || '',
        role: vol.role || '',
        startDate: vol.startDate ? new Date(vol.startDate) : null,
        endDate: vol.endDate ? new Date(vol.endDate) : null,
        description: vol.description || '',
        impact: vol.impact || '',
        skills: vol.skills || []
      })),

      // Additional information
      interests: extractedData.interests || [],
      
      references: (extractedData.references || []).map(ref => ({
        name: ref.name || '',
        title: ref.title || '',
        company: ref.company || '',
        email: ref.email || '',
        phone: ref.phone || '',
        relationship: ref.relationship || ''
      })),

      // Career overview
      careerOverview: {
        totalYearsExperience: extractedData.careerOverview?.totalYearsExperience || 0,
        currentRole: extractedData.careerOverview?.currentRole || extractedData.currentPosition?.title || '',
        currentCompany: extractedData.careerOverview?.currentCompany || extractedData.currentPosition?.company || '',
        careerLevel: extractedData.careerOverview?.careerLevel || 'Mid',
        industryExperience: extractedData.careerOverview?.industryExperience || [],
        functionalAreas: extractedData.careerOverview?.functionalAreas || [],
        managementExperience: extractedData.careerOverview?.managementExperience || false,
        teamLeadershipExperience: extractedData.careerOverview?.teamLeadershipExperience || '',
        budgetManagementExperience: extractedData.careerOverview?.budgetManagementExperience || ''
      },

      // Additional information
      additionalInfo: {
        availability: extractedData.additionalInfo?.availability || '',
        noticePeriod: extractedData.additionalInfo?.noticePeriod || '',
        expectedSalary: extractedData.additionalInfo?.expectedSalary || '',
        currentSalary: extractedData.additionalInfo?.currentSalary || '',
        willingToRelocate: extractedData.additionalInfo?.willingToRelocate || null,
        remoteWorkPreference: extractedData.additionalInfo?.remoteWorkPreference || '',
        workAuthorization: extractedData.additionalInfo?.workAuthorization || '',
        securityClearance: extractedData.additionalInfo?.securityClearance || '',
        militaryService: extractedData.additionalInfo?.militaryService || '',
        visaStatus: extractedData.additionalInfo?.visaStatus || ''
      },

      // Company and application info
      company: companyId,
      resumeInfo: {
        fileName: uploadResult.filePath,
        originalName: file.originalname,
        filePath: uploadResult.fileUrl,
        storagePath: uploadResult.filePath,
        storageBucket: uploadResult.bucket,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadDate: new Date(),
        extractedDate: new Date(),
        extractionStatus: 'completed',
        extractionMethod: extractedData.extractionMethod || 'ai_enhanced',
        completenessScore: extractedData.completenessScore || 0,
        extractionConfidence: extractedData.extractionConfidence || 95
      },
      applicationInfo: {
        appliedDate: new Date(),
        source: 'resume_upload',
        lastActivity: new Date()
      },

      // Store the complete parsed profile for future reference
      aiParsedProfile: extractedData,

      // OpenResume data if available
      openResumeData: extractedData.openResumeData || null
    };

    const candidate = new Candidate(candidateData);
    await candidate.save();

    console.log(`[SUCCESS] Candidate created with ID: ${candidate._id}`);

    res.status(201).json({
      success: true,
      message: 'Resume uploaded and candidate created successfully with enhanced AI parsing',
      data: {
        candidate: {
          id: candidate._id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          extractionMethod: candidateData.resumeInfo.extractionMethod,
          completenessScore: candidateData.resumeInfo.completenessScore,
          extractionConfidence: candidateData.resumeInfo.extractionConfidence
        },
        parsing: {
          method: 'enhanced_ai',
          textLength: extractedData.extractionMetadata?.textLength || 0,
          sectionsExtracted: {
            experience: candidate.experience?.length || 0,
            education: candidate.education?.length || 0,
            skills: candidate.skills?.technical?.length || 0,
            projects: candidate.projects?.length || 0,
            certifications: candidate.certifications?.length || 0
          }
        }
      }
    });
  } catch (error) {
    console.error('[ERROR] Upload resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing resume',
      error: error.message
    });
  }
};


// @desc    Parse resume and create candidate automatically
// @route   POST /api/candidates/parse-resume
// @access  Private (SuperAdmin, Company)
const parseResumeAndCreateCandidate = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No resume file uploaded'
      });
    }

    const companyId = req.userType === 'SuperAdmin' ? req.body.company : req.user._id;
    
    // Import resume parser service
    const resumeParserService = require('../services/resumeParserService');
    
    // Parse resume to extract candidate information
    logger.info('[ParseResume] Starting resume parsing for automatic candidate creation');
    
    let parsedData;
    try {
      parsedData = await resumeParserService.processResume(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (parseError) {
      logger.error('[ParseResume] Resume parsing failed:', parseError);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Failed to parse resume: ' + parseError.message,
        error: parseError.message
      });
    }
    
    // Extract required fields with fallbacks
    const firstName = parsedData.name?.split(' ')[0] || 'Unknown';
    const lastName = parsedData.name?.split(' ').slice(1).join(' ') || 'Candidate';
    const email = parsedData.email || `candidate_${Date.now()}@unknown.com`;
    const phone = parsedData.phone || '';
    
    // Check if candidate with this email already exists
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      // Delete old resume from Cloudinary if exists
      if (existingCandidate.resume?.filePath) {
        try {
          await cloudinaryService.deleteFile(existingCandidate.resume.filePath);
        } catch (error) {
          logger.warn(`Failed to delete old resume: ${error.message}`);
        }
      }

      // Upload new resume to Cloudinary
      const uploadResult = await cloudinaryService.uploadResume(
        req.file.buffer,
        req.file.originalname,
        companyId.toString(),
        email
      );
      
      if (uploadResult.success) {
        // Update candidate with new resume info and parsed data
        existingCandidate.resume = {
          fileName: uploadResult.originalName,
          fileUrl: uploadResult.url,
          filePath: uploadResult.publicId,
          uploadDate: new Date()
        };
        
        // Update with newly parsed information
        existingCandidate.phone = phone || existingCandidate.phone;
        existingCandidate.address = parsedData.location || existingCandidate.address;
        existingCandidate.summary = parsedData.summary || existingCandidate.summary;
        existingCandidate.careerObjective = parsedData.careerObjective || existingCandidate.careerObjective;
        
        if (parsedData.experience && parsedData.experience.length > 0) {
          existingCandidate.workExperience = parsedData.experience;
          // Update current position from latest experience
          const latestExp = parsedData.experience[0];
          existingCandidate.currentPosition = latestExp.position || latestExp.title || existingCandidate.currentPosition;
        }
        
        if (parsedData.education && parsedData.education.length > 0) {
          existingCandidate.education = parsedData.education;
        }
        
        if (parsedData.certifications && parsedData.certifications.length > 0) {
          existingCandidate.certifications = parsedData.certifications;
        }
        
        if (parsedData.projects && parsedData.projects.length > 0) {
          existingCandidate.projects = parsedData.projects;
        }
        
        if (parsedData.accomplishments && parsedData.accomplishments.length > 0) {
          existingCandidate.accomplishments = parsedData.accomplishments;
        }
        
        if (parsedData.languages && parsedData.languages.length > 0) {
          existingCandidate.languages = parsedData.languages;
        }
        
        if (parsedData.skills && (parsedData.skills.technical?.length > 0 || parsedData.skills.soft?.length > 0 || parsedData.skills.tools?.length > 0)) {
          existingCandidate.skills = [...(parsedData.skills.technical || []), ...(parsedData.skills.soft || []), ...(parsedData.skills.tools || [])];
        }
        
        await existingCandidate.save();
        
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'Resume uploaded and candidate profile updated successfully',
          data: {
            candidate: existingCandidate,
            isNewCandidate: false,
            parsedData: parsedData
          }
        });
      }
    }
    
    // Extract current position from experience
    let currentPosition = '';
    if (parsedData.experience && parsedData.experience.length > 0) {
      const latestExp = parsedData.experience[0];
      currentPosition = latestExp.position || latestExp.title || '';
    }
    
    // Create new candidate with comprehensive parsed data
    const candidateData = {
      firstName,
      lastName,
      email,
      phone,
      company: companyId,
      address: parsedData.location || '',
      currentPosition,
      summary: parsedData.summary || '',
      careerObjective: parsedData.careerObjective || '',
      workExperience: parsedData.experience || [],
      education: parsedData.education || [],
      certifications: parsedData.certifications || [],
      projects: parsedData.projects || [],
      accomplishments: parsedData.accomplishments || [],
      languages: parsedData.languages || [],
      skills: [...(parsedData.skills?.technical || []), ...(parsedData.skills?.soft || []), ...(parsedData.skills?.tools || [])],
      status: 'active'
    };
    
    const candidate = await Candidate.create(candidateData);
    
    // Get company name for folder structure
    const company = await Company.findById(companyId).select('companyName');
    const companyName = company?.companyName || 'unknown_company';
    const candidateName = `${firstName}_${lastName}`;
    
    // Upload resume to Cloudinary with structured folder path
    // Path: rezulyzer/companies/{companyName}/candidates/{candidateName}/resumes/{filename}
    const uploadResult = await cloudinaryService.uploadResume(
      req.file.buffer,
      req.file.originalname,
      companyName,
      candidateName,
      email
    );
    
    if (!uploadResult.success) {
      // Delete the candidate if file upload fails
      await Candidate.findByIdAndDelete(candidate._id);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to upload resume file',
        error: uploadResult.error
      });
    }
    
    // Update candidate with resume file information
    candidate.resume = {
      filename: uploadResult.originalName,
      originalName: uploadResult.originalName,
      path: uploadResult.publicId,
      uploadedAt: new Date(),
      size: uploadResult.bytes,
      url: uploadResult.fileUrl
    };
    
    await candidate.save();
    
    // Log activity
    logger.info(`[ParseResume] Successfully created candidate: ${email} with resume parsing`);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Candidate created successfully from resume parsing',
      data: {
        candidate,
        isNewCandidate: true,
        parsedData: parsedData,
        fileInfo: {
          fileName: uploadResult.originalName,
          fileUrl: uploadResult.fileUrl,
          candidateFolder: uploadResult.candidateFolder
        }
      }
    });
    
  } catch (error) {
    logger.error('[ParseResume] Error in parseResumeAndCreateCandidate:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      const email = error.keyValue?.email || 'this email';
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: `A candidate with email ${email} already exists. Please use a different email or update the existing candidate.`,
        error: 'DUPLICATE_EMAIL',
        duplicateField: 'email',
        duplicateValue: email
      });
    }
    
    // Handle other errors
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error while processing resume',
      error: error.message
    });
  }
});

// @desc    Send assessment invitations to selected candidates
// @route   POST /api/candidates/send-assessment
// @access  Private (Company, SuperAdmin)
const sendAssessmentInvite = asyncHandler(async (req, res) => {
  const { candidateIds, jobId, jobDescription, message } = req.body;

  if (!candidateIds || candidateIds.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Please provide at least one candidate ID'
    });
  }

  const { sendAssessmentEmail } = require('../services/emailService');
  const bcrypt = require('bcryptjs');
  const companyId = req.user._id;

  let company;
  try {
    company = await Company.findById(companyId).select('name');
  } catch (e) {}
  const companyName = company?.name || 'Your Company';

  // Fetch job description text + per-job assessment config (mix + timings)
  let jdText = jobDescription || '';
  let jobAssessmentConfig = null;
  if (jobId) {
    try {
      const Job = require('../models/Job');
      const job = await Job.findById(jobId).select('title description responsibilities qualifications skills assessmentConfig');
      if (job) {
        if (!jdText) {
          jdText = [
            job.title ? `Position: ${job.title}` : '',
            job.description || '',
            Array.isArray(job.responsibilities) ? `Responsibilities: ${job.responsibilities.join(', ')}` : '',
            Array.isArray(job.qualifications) ? `Qualifications: ${job.qualifications.join(', ')}` : '',
            Array.isArray(job.skills) ? `Required Skills: ${job.skills.join(', ')}` : ''
          ].filter(Boolean).join('\n');
        }
        jobAssessmentConfig = job.assessmentConfig || null;
      }
    } catch (e) {
      logger.warn(`[SendAssessment] Could not fetch job ${jobId}: ${e.message}`);
    }
  }
  // Defaults if no job or no config saved
  const cfg = {
    mcqCount: jobAssessmentConfig?.mcqCount ?? 3,
    outputCount: jobAssessmentConfig?.outputCount ?? 1,
    practicalCount: jobAssessmentConfig?.practicalCount ?? 1,
    mcqSeconds: jobAssessmentConfig?.mcqSeconds ?? 60,
    outputSeconds: jobAssessmentConfig?.outputSeconds ?? 120,
    practicalSeconds: jobAssessmentConfig?.practicalSeconds ?? 600,
    passingScore: jobAssessmentConfig?.passingScore ?? 60,
  };
  const totalQ = cfg.mcqCount + cfg.outputCount + cfg.practicalCount;
  const totalSeconds = cfg.mcqCount * cfg.mcqSeconds + cfg.outputCount * cfg.outputSeconds + cfg.practicalCount * cfg.practicalSeconds;
  const totalMinutes = Math.ceil(totalSeconds / 60);

  const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const results = [];
  const errors = [];

  for (const candidateId of candidateIds) {
    try {
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        errors.push({ candidateId, error: 'Candidate not found' });
        continue;
      }

      // === STEP 1: Generate AI assessment questions (using job config mix) ===
      logger.info(`[SendAssessment] Generating ${totalQ} AI questions for candidate ${candidateId}`);
      let questions = [];
      try {
        questions = await generateAssessmentQuestions(candidate, jdText, {
          mcqCount: cfg.mcqCount,
          outputCount: cfg.outputCount,
          practicalCount: cfg.practicalCount,
        });
        logger.info(`[SendAssessment] Generated ${questions.length} questions for ${candidateId}`);
      } catch (genErr) {
        logger.error(`[SendAssessment] AI generation failed for ${candidateId}: ${genErr.message}`);
        errors.push({ candidateId, error: `AI question generation failed: ${genErr.message}` });
        continue;
      }

      // === STEP 2: Create Test document in DB ===
      const testTitle = `Assessment for ${candidate.firstName} ${candidate.lastName}`;
      let test;
      try {
        test = await Test.create({
          title: testTitle,
          description: `AI-generated assessment based on ${candidate.firstName}'s resume${jdText ? ' and job description' : ''}.`,
          type: 'Technical',
          category: 'Programming',
          questions: questions,
          duration: totalMinutes,
          maxAttempts: 1,
          passingScore: cfg.passingScore,
          company: companyId,
          createdBy: companyId,
          status: 'Active',
          isPublic: false,
          settings: {
            shuffleQuestions: false,
            shuffleOptions: true,
            showResults: true,
            allowReview: false,
            preventCheating: true,
            fullScreenMode: true,
            // Persist per-type seconds so the candidate UI can read them
            // even if it doesn't infer from question type/tags.
            timing: {
              mcqSeconds: cfg.mcqSeconds,
              outputSeconds: cfg.outputSeconds,
              practicalSeconds: cfg.practicalSeconds,
            },
          },
          instructions: `Answer all questions carefully. Time limits vary per question type — MCQ: ${cfg.mcqSeconds}s, output: ${cfg.outputSeconds}s, coding: ${cfg.practicalSeconds}s. The test auto-submits when the last question's time ends.`,
          tags: ['ai-generated', 'candidate-assessment'],
          associatedJobs: jobId ? [jobId] : []
        });
        logger.info(`[SendAssessment] Created Test ${test._id} for candidate ${candidateId}`);
      } catch (testErr) {
        logger.error(`[SendAssessment] Test creation failed for ${candidateId}: ${testErr.message}`);
        errors.push({ candidateId, error: `Test creation failed: ${testErr.message}` });
        continue;
      }

      // === STEP 3: Generate token and password ===
      const token = crypto.randomBytes(32).toString('hex');
      const tempPassword = crypto.randomBytes(6).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // === STEP 4: Link test to candidate's testAttempts ===
      candidate.assessmentToken = token;
      candidate.assessmentTokenExpiry = tokenExpiry;
      candidate.assessmentPasswordHash = passwordHash;
      // Remove any stale test entries and add the new one
      candidate.testAttempts = candidate.testAttempts || [];
      candidate.testAttempts.push({ test: test._id });
      await candidate.save();

      // === STEP 5: Send email ===
      const loginUrl = `${base}/assessment-login?token=${token}`;
      await sendAssessmentEmail(candidate.email, {
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        companyName,
        email: candidate.email,
        password: tempPassword,
        loginUrl,
        message: message || ''
      });

      results.push({
        candidateId,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        testId: test._id,
        questionsCount: questions.length,
        status: 'sent'
      });
    } catch (err) {
      logger.error(`[SendAssessment] Failed for ${candidateId}: ${err.message}`);
      errors.push({ candidateId, error: err.message });
    }
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Assessment invitations sent to ${results.length} candidate(s)`,
    data: { sent: results, failed: errors }
  });
});

// @desc    Validate assessment token (public - used by CandidateLogin)
// @route   GET /api/candidates/assessment/validate/:token
// @access  Public
const validateAssessmentToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const candidate = await Candidate.findOne({
    assessmentToken: token,
    assessmentTokenExpiry: { $gt: new Date() }
  })
    .select('firstName lastName email assessmentTokenExpiry testAttempts')
    .populate('testAttempts.test', '_id title status');

  if (!candidate) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired assessment token'
    });
  }

  // Build pendingTests: only include entries with a linked, active test
  const pendingTests = (candidate.testAttempts || [])
    .filter(ta => ta.test && ta.test._id)
    .map(ta => ({
      testId: ta.test._id,
      testTitle: ta.test.title || 'Assessment',
      testStatus: ta.test.status || 'Active',
      invitationId: ta.invitation || null
    }));

  logger.info(`[ValidateToken] Candidate ${candidate._id} has ${pendingTests.length} pending test(s)`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
      tokenExpiry: candidate.assessmentTokenExpiry,
      pendingTests
    }
  });
});

// @desc    Candidate login with assessment token + password
// @route   POST /api/candidates/assessment/login
// @access  Public
const assessmentLogin = asyncHandler(async (req, res) => {
  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Token, email and password are required'
    });
  }

  const candidate = await Candidate.findOne({
    assessmentToken: token,
    email: email.toLowerCase().trim(),
    assessmentTokenExpiry: { $gt: new Date() }
  });

  if (!candidate) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid credentials or expired token'
    });
  }

  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare(password, candidate.assessmentPasswordHash);
  if (!isMatch) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Create session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  candidate.assessmentSessionToken = sessionToken;
  candidate.assessmentSessionExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
  await candidate.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      sessionToken,
      candidateId: candidate._id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email
    }
  });
});

module.exports = {
  getCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  uploadResume,
  getCandidateStats,
  parseResumeAndCreateCandidate,
  sendAssessmentInvite,
  validateAssessmentToken,
  assessmentLogin
};
