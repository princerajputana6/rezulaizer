/**
 * Assessment Generator Service
 * Generates AI-powered assessment questions from candidate resume + job description.
 * Output: 3 MCQ + 1 output-based + 1 practical = 5 questions stored in Test.questions[]
 */

const aiService = require('../config/ai');
const logger = require('../utils/logger');

/**
 * Build a readable resume summary from a Candidate document
 */
function buildResumeSummary(candidate) {
  const lines = [];

  lines.push(`Candidate: ${candidate.firstName} ${candidate.lastName}`);

  if (candidate.summary) lines.push(`Summary: ${candidate.summary}`);
  if (candidate.currentPosition) lines.push(`Current Role: ${candidate.currentPosition}`);

  // Skills
  const skills = candidate.skills;
  if (Array.isArray(skills) && skills.length > 0) {
    lines.push(`Skills: ${skills.slice(0, 20).join(', ')}`);
  } else if (skills && typeof skills === 'object') {
    const techSkills = (skills.technical || []).map(s => (typeof s === 'string' ? s : s.name)).filter(Boolean);
    if (techSkills.length) lines.push(`Technical Skills: ${techSkills.slice(0, 20).join(', ')}`);
  }

  // Work Experience
  if (Array.isArray(candidate.workExperience) && candidate.workExperience.length > 0) {
    lines.push('\nWork Experience:');
    candidate.workExperience.slice(0, 3).forEach(exp => {
      lines.push(`- ${exp.title || exp.position || 'Role'} at ${exp.company || 'Company'} (${exp.startDate || ''} - ${exp.endDate || 'Present'})`);
      if (exp.description) lines.push(`  ${exp.description.substring(0, 200)}`);
    });
  }

  // Education
  if (Array.isArray(candidate.education) && candidate.education.length > 0) {
    lines.push('\nEducation:');
    candidate.education.slice(0, 2).forEach(edu => {
      lines.push(`- ${edu.degree || 'Degree'} in ${edu.field || edu.fieldOfStudy || 'Field'} from ${edu.institution || 'Institution'}`);
    });
  }

  // Certifications
  if (Array.isArray(candidate.certifications) && candidate.certifications.length > 0) {
    const certs = candidate.certifications.map(c => c.name).filter(Boolean);
    if (certs.length) lines.push(`Certifications: ${certs.join(', ')}`);
  }

  // Projects
  if (Array.isArray(candidate.projects) && candidate.projects.length > 0) {
    lines.push('\nKey Projects:');
    candidate.projects.slice(0, 2).forEach(proj => {
      lines.push(`- ${proj.name}: ${(proj.description || '').substring(0, 150)}`);
    });
  }

  return lines.join('\n');
}

/**
 * Build the AI prompt for generating the 5 questions
 */
function buildPrompt(resumeSummary, jobDescription, mix = { mcqCount: 3, outputCount: 1, practicalCount: 1 }) {
  const jdSection = jobDescription
    ? `\n\nJob Description:\n${jobDescription.substring(0, 800)}`
    : '';
  const total = (mix.mcqCount || 0) + (mix.outputCount || 0) + (mix.practicalCount || 0);

  return `You are an expert technical interviewer. Based on the candidate's resume and job requirements, generate exactly ${total} assessment questions tailored to their background.

${resumeSummary}${jdSection}

Generate EXACTLY this structure (in this order):
1. ${mix.mcqCount || 0} multiple-choice questions (MCQ) testing technical knowledge relevant to the candidate's skills
2. ${mix.outputCount || 0} output-based question(s): show a short code snippet and ask what the output will be
3. ${mix.practicalCount || 0} practical question(s): a short coding/implementation task (written answer, no execution needed)

Return ONLY a valid JSON array. No text before or after. Use this exact format:

[
  {
    "type": "multiple-choice",
    "question": "Question text here",
    "options": [{"text": "Option A", "isCorrect": false}, {"text": "Option B", "isCorrect": true}, {"text": "Option C", "isCorrect": false}, {"text": "Option D", "isCorrect": false}],
    "explanation": "Brief explanation of the correct answer",
    "difficulty": "Medium",
    "points": 10,
    "tags": ["tag1"],
    "order": 1
  },
  {
    "type": "multiple-choice",
    "question": "Second MCQ question",
    "options": [{"text": "Option A", "isCorrect": false}, {"text": "Option B", "isCorrect": false}, {"text": "Option C", "isCorrect": true}, {"text": "Option D", "isCorrect": false}],
    "explanation": "Explanation",
    "difficulty": "Medium",
    "points": 10,
    "tags": ["tag2"],
    "order": 2
  },
  {
    "type": "multiple-choice",
    "question": "Third MCQ question",
    "options": [{"text": "Option A", "isCorrect": true}, {"text": "Option B", "isCorrect": false}, {"text": "Option C", "isCorrect": false}, {"text": "Option D", "isCorrect": false}],
    "explanation": "Explanation",
    "difficulty": "Hard",
    "points": 10,
    "tags": ["tag3"],
    "order": 3
  },
  {
    "type": "essay",
    "question": "What is the output of the following code?\\n\\n\`\`\`\\n[PASTE SHORT CODE SNIPPET HERE]\`\`\`\\n\\nExplain your answer step by step.",
    "code": "[PASTE SAME CODE SNIPPET HERE]",
    "explanation": "Correct output and explanation",
    "difficulty": "Medium",
    "points": 15,
    "tags": ["output-based"],
    "order": 4
  },
  {
    "type": "essay",
    "question": "Write a function/solution for the following problem: [DESCRIBE PRACTICAL TASK RELEVANT TO THEIR SKILLS]. Include the function signature, logic, and any edge cases you'd handle.",
    "explanation": "What a good answer should include",
    "difficulty": "Hard",
    "points": 20,
    "tags": ["practical"],
    "order": 5
  }
]

IMPORTANT: 
- Make questions SPECIFICALLY relevant to this candidate's skills and experience
- For the output-based question, use a real, runnable code snippet in a language from their skill set
- For the practical question, base the task on their actual work/skills
- Ensure exactly ONE option has "isCorrect": true for MCQ questions
- Return ONLY the JSON array, nothing else`;
}

/**
 * Parse and validate the AI-generated questions
 */
function parseQuestions(rawText) {
  // Extract JSON array from response
  const match = rawText.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in AI response');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned empty or invalid questions array');
  }

  // Normalize and validate each question to match Test.js questionSchema
  return parsed.map((q, idx) => {
    const normalized = {
      type: q.type || (q.options ? 'multiple-choice' : 'essay'),
      question: q.question || `Question ${idx + 1}`,
      options: [],
      points: q.points || 10,
      difficulty: q.difficulty || 'Medium',
      tags: Array.isArray(q.tags) ? q.tags : [],
      explanation: q.explanation || '',
      order: q.order || idx + 1
    };

    // Handle options for MCQ
    if (q.options && Array.isArray(q.options)) {
      normalized.options = q.options.map(opt => ({
        text: typeof opt === 'string' ? opt : (opt.text || ''),
        isCorrect: typeof opt === 'object' ? (opt.isCorrect === true) : false
      }));
    }

    // For output/practical questions, embed code if present
    if (q.code) {
      normalized.question = normalized.question; // code is shown in frontend
      normalized.codingDetails = {
        starterCode: q.code,
        language: 'javascript' // default; frontend renders pre block
      };
    }

    return normalized;
  });
}

/**
 * Main export: generate 5 assessment questions for a candidate
 * @param {Object} candidate - Mongoose Candidate document
 * @param {string} [jobDescription] - Optional job description text
 * @returns {Promise<Array>} Array of question objects matching Test.questionSchema
 */
async function generateAssessmentQuestions(candidate, jobDescription = '', mix) {
  logger.info(`[AssessmentGen] Generating questions for candidate: ${candidate._id}`);

  const cleanMix = {
    mcqCount: Math.max(0, parseInt(mix?.mcqCount ?? 3, 10)),
    outputCount: Math.max(0, parseInt(mix?.outputCount ?? 1, 10)),
    practicalCount: Math.max(0, parseInt(mix?.practicalCount ?? 1, 10)),
  };
  const resumeSummary = buildResumeSummary(candidate);
  const prompt = buildPrompt(resumeSummary, jobDescription, cleanMix);

  const messages = [
    {
      role: 'system',
      content: 'You are an expert technical interviewer. Generate assessment questions in valid JSON format only. Return ONLY the JSON array, no explanations or markdown.'
    },
    { role: 'user', content: prompt }
  ];

  let rawResponse;
  try {
    const response = await aiService.chatCompletion(messages, { max_tokens: 3000, temperature: 0.6 });
    rawResponse = response.choices?.[0]?.message?.content || '';
    logger.info(`[AssessmentGen] AI response received (${rawResponse.length} chars)`);
  } catch (aiError) {
    logger.error(`[AssessmentGen] AI call failed: ${aiError.message}`);
    // Return fallback questions so assessment sending never fails
    return getFallbackQuestions(candidate);
  }

  try {
    const questions = parseQuestions(rawResponse);
    logger.info(`[AssessmentGen] Parsed ${questions.length} questions successfully`);
    return questions;
  } catch (parseError) {
    logger.error(`[AssessmentGen] Question parse failed: ${parseError.message}. Raw: ${rawResponse.substring(0, 300)}`);
    return getFallbackQuestions(candidate);
  }
}

/**
 * Fallback questions if AI fails — generic technical questions
 */
function getFallbackQuestions(candidate) {
  logger.warn(`[AssessmentGen] Using fallback questions for candidate ${candidate._id}`);
  return [
    {
      type: 'multiple-choice',
      question: 'Which of the following best describes the principle of DRY in software development?',
      options: [
        { text: 'Do Repeat Yourself — duplicate code for clarity', isCorrect: false },
        { text: "Don't Repeat Yourself — avoid code duplication", isCorrect: true },
        { text: 'Data Retrieval Yield — caching strategy', isCorrect: false },
        { text: 'Dynamic Runtime Yielding — lazy evaluation', isCorrect: false }
      ],
      explanation: 'DRY stands for "Don\'t Repeat Yourself" — a principle of reducing repetition of code patterns.',
      difficulty: 'Easy', points: 10, tags: ['software-engineering'], order: 1
    },
    {
      type: 'multiple-choice',
      question: 'What is the time complexity of binary search on a sorted array of n elements?',
      options: [
        { text: 'O(n)', isCorrect: false },
        { text: 'O(n²)', isCorrect: false },
        { text: 'O(log n)', isCorrect: true },
        { text: 'O(1)', isCorrect: false }
      ],
      explanation: 'Binary search halves the search space at each step, giving O(log n) complexity.',
      difficulty: 'Medium', points: 10, tags: ['algorithms'], order: 2
    },
    {
      type: 'multiple-choice',
      question: 'In a RESTful API, which HTTP method is typically used to update an existing resource?',
      options: [
        { text: 'GET', isCorrect: false },
        { text: 'POST', isCorrect: false },
        { text: 'PUT', isCorrect: true },
        { text: 'DELETE', isCorrect: false }
      ],
      explanation: 'PUT is used to update/replace an existing resource at a known URL.',
      difficulty: 'Easy', points: 10, tags: ['api', 'rest'], order: 3
    },
    {
      type: 'essay',
      question: 'What is the output of the following code?\n\n```javascript\nconst arr = [1, 2, 3];\nconsole.log(arr.map(x => x * 2).filter(x => x > 3).reduce((acc, x) => acc + x, 0));\n```\n\nExplain your answer step by step.',
      codingDetails: { starterCode: 'const arr = [1, 2, 3];\nconsole.log(arr.map(x => x * 2).filter(x => x > 3).reduce((acc, x) => acc + x, 0));', language: 'javascript' },
      explanation: 'map → [2,4,6], filter → [4,6], reduce → 10. Output: 10',
      difficulty: 'Medium', points: 15, tags: ['output-based', 'javascript'], order: 4
    },
    {
      type: 'essay',
      question: 'Write a function that takes an array of integers and returns the two numbers that add up to a given target sum. If no such pair exists, return null. Example: findPair([2, 7, 11, 15], 9) → [2, 7]. Include your approach, time complexity, and any edge cases you handle.',
      explanation: 'Optimal solution uses a hash set for O(n) time. Should handle empty arrays, no match, negative numbers.',
      difficulty: 'Hard', points: 20, tags: ['practical', 'algorithms'], order: 5
    }
  ];
}

module.exports = { generateAssessmentQuestions };
