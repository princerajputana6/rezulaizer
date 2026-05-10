const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../utils/logger');

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

function stripFence(text = '') {
  return String(text).replace(/```json|```/gi, '').trim();
}

function safeJsonParse(text) {
  return JSON.parse(stripFence(text));
}

function fallbackParse(rawText = '', originalName = '') {
  const nameFromFile = originalName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines.find(
    (line) =>
      !/@/.test(line) &&
      !/^\+?\d[\d\s\-()]{6,}$/.test(line) &&
      /^[A-Za-z\s.'-]{3,}$/.test(line)
  );

  const email = (rawText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '';
  const phone =
    (rawText.match(/(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4}/) || [])[0] || '';

  return {
    name: firstLine || nameFromFile || 'Unknown Candidate',
    email,
    phone,
    location: '',
    summary: '',
    skills: { technical: [], soft: [], tools: [] },
    experience: [],
    education: [],
    projects: [],
    extractionMetadata: {
      provider: 'fallback',
      confidence: email ? 0.6 : 0.3,
      textLength: rawText.length
    }
  };
}

async function extractRawText(buffer, mimeType, originalName = '') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid resume file buffer');
  }

  try {
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(originalName)) {
      const parsed = await pdfParse(buffer);
      return parsed?.text || '';
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.docx$/i.test(originalName)
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed?.value || '';
    }

    return buffer.toString('utf8');
  } catch (error) {
    logger.warn(`[resumeParser] Text extraction failed, using utf8 fallback: ${error.message}`);
    return buffer.toString('utf8');
  }
}

async function callClaude(messages, maxTokens = 2200) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Claude API error (${res.status}): ${errBody || res.statusText}`);
  }

  const data = await res.json();
  return (data?.content || []).map((b) => b?.text || '').join('');
}

function normalizeParsed(parsed, rawTextLength = 0) {
  const technical = Array.isArray(parsed?.skills?.technical) ? parsed.skills.technical : [];
  const tools = Array.isArray(parsed?.skills?.tools) ? parsed.skills.tools : [];
  const soft = Array.isArray(parsed?.skills?.soft) ? parsed.skills.soft : [];

  return {
    name: parsed?.name || '',
    email: parsed?.email || '',
    phone: parsed?.phone || '',
    location: parsed?.location || '',
    summary: parsed?.summary || '',
    careerObjective: parsed?.careerObjective || '',
    skills: {
      technical: technical.map((s) => String(s).trim()).filter(Boolean),
      soft: soft.map((s) => String(s).trim()).filter(Boolean),
      tools: tools.map((s) => String(s).trim()).filter(Boolean)
    },
    experience: Array.isArray(parsed?.experience)
      ? parsed.experience.map((exp) => ({
          title: exp?.title || exp?.position || '',
          position: exp?.position || exp?.title || '',
          company: exp?.company || '',
          location: exp?.location || '',
          startDate: exp?.startDate || '',
          endDate: exp?.endDate || '',
          current: exp?.current || false,
          description: exp?.description || '',
          responsibilities: Array.isArray(exp?.responsibilities) ? exp.responsibilities : [],
          achievements: Array.isArray(exp?.achievements) ? exp.achievements : []
        }))
      : [],
    education: Array.isArray(parsed?.education)
      ? parsed.education.map((edu) => ({
          degree: edu?.degree || '',
          field: edu?.field || '',
          institution: edu?.institution || '',
          location: edu?.location || '',
          startDate: edu?.startDate || '',
          endDate: edu?.endDate || '',
          grade: edu?.grade || '',
          description: edu?.description || ''
        }))
      : [],
    certifications: Array.isArray(parsed?.certifications)
      ? parsed.certifications.map((cert) => ({
          name: cert?.name || '',
          issuer: cert?.issuer || '',
          issueDate: cert?.issueDate || '',
          expiryDate: cert?.expiryDate || '',
          credentialId: cert?.credentialId || '',
          url: cert?.url || ''
        }))
      : [],
    projects: Array.isArray(parsed?.projects)
      ? parsed.projects.map((proj) => ({
          name: proj?.name || '',
          description: proj?.description || '',
          role: proj?.role || '',
          technologies: Array.isArray(proj?.technologies) ? proj.technologies : [],
          url: proj?.url || '',
          startDate: proj?.startDate || '',
          endDate: proj?.endDate || ''
        }))
      : [],
    accomplishments: Array.isArray(parsed?.accomplishments)
      ? parsed.accomplishments.map((acc) => ({
          title: acc?.title || '',
          description: acc?.description || '',
          date: acc?.date || ''
        }))
      : [],
    languages: Array.isArray(parsed?.languages)
      ? parsed.languages.map((lang) => ({
          name: lang?.name || '',
          proficiency: lang?.proficiency || ''
        }))
      : [],
    extractionMetadata: {
      provider: 'anthropic',
      confidence: 0.9,
      textLength: rawTextLength
    }
  };
}

async function processResume(buffer, mimeType, originalName = '') {
  const rawText = await extractRawText(buffer, mimeType, originalName);
  if (!rawText || rawText.trim().length < 10) {
    throw new Error('Could not extract sufficient text from resume');
  }

  const fallback = fallbackParse(rawText, originalName);
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(originalName);

  try {
    const promptSchema = JSON.stringify({
      name: "",
      email: "",
      phone: "",
      location: "",
      summary: "",
      careerObjective: "",
      skills: {
        technical: [],
        soft: [],
        tools: []
      },
      experience: [{
        title: "",
        position: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        description: "",
        responsibilities: [],
        achievements: []
      }],
      education: [{
        degree: "",
        field: "",
        institution: "",
        location: "",
        startDate: "",
        endDate: "",
        grade: "",
        description: ""
      }],
      certifications: [{
        name: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        credentialId: "",
        url: ""
      }],
      projects: [{
        name: "",
        description: "",
        role: "",
        technologies: [],
        url: "",
        startDate: "",
        endDate: ""
      }],
      accomplishments: [{
        title: "",
        description: "",
        date: ""
      }],
      languages: [{
        name: "",
        proficiency: ""
      }]
    });

    const contentBlocks = isPdf
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64')
            }
          },
          { type: 'text', text: `Extract resume info as JSON only (no markdown): ${promptSchema}` }
        ]
      : [
          {
            type: 'text',
            text: `File: ${originalName}\nResume text:\n${rawText.slice(
              0,
              20000
            )}\nExtract resume info as JSON only (no markdown): ${promptSchema}`
          }
        ];

    const responseText = await callClaude([{ role: 'user', content: contentBlocks }], 2200);
    const parsed = safeJsonParse(responseText);
    const normalized = normalizeParsed(parsed, rawText.length);

    // Fill required fields from fallback when missing
    normalized.name = normalized.name || fallback.name;
    normalized.email = normalized.email || fallback.email;
    normalized.phone = normalized.phone || fallback.phone;
    normalized.location = normalized.location || fallback.location;

    return normalized;
  } catch (error) {
    logger.warn(`[resumeParser] Anthropic parsing failed. Falling back. Error: ${error.message}`);
    return fallback;
  }
}

module.exports = {
  processResume,
  extractRawText
};
