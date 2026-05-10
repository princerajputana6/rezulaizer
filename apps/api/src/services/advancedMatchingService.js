const logger = require('../utils/logger');

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

/**
 * 🧱 STEP 1: STRUCTURED EXTRACTION
 * Convert resume/JD to strict JSON format
 */
async function extractStructuredData(text, type = 'resume') {
  const schema = {
    skills: [],
    experience_years: 0,
    roles: [],
    education: [],
    tools: [],
    projects: [],
    seniority: '', // junior, mid, senior, lead, principal
    location: '',
    certifications: [],
    domain_expertise: [],
    soft_skills: []
  };

  const prompt = type === 'resume' 
    ? `You are a strict resume parser. Extract ONLY factual information from this resume.

CRITICAL RULES:
- Extract ONLY skills explicitly mentioned with evidence
- Calculate experience_years from actual work history dates
- Identify seniority from titles (Junior/Mid/Senior/Lead/Principal)
- List projects with actual names
- NO assumptions, NO inferences

Resume:
${text}

Output STRICT JSON matching this schema:
${JSON.stringify(schema, null, 2)}

IMPORTANT: 
- skills: Only technical skills with evidence in experience/projects
- experience_years: Calculate from work history (current year - start year)
- seniority: Derive from most recent title
- Reject vague information`
    : `You are a strict job description parser. Extract ONLY explicit requirements.

CRITICAL RULES:
- Extract ONLY mandatory skills (not "nice to have")
- Get minimum experience required
- Identify required seniority level
- List hard requirements only

Job Description:
${text}

Output STRICT JSON matching this schema:
${JSON.stringify(schema, null, 2)}

IMPORTANT:
- skills: Only REQUIRED skills
- experience_years: MINIMUM required
- seniority: Required level
- Separate mandatory vs optional`;

  try {
    const response = await callClaude([{
      role: 'user',
      content: prompt
    }], 3000);

    const parsed = JSON.parse(stripFence(response));
    
    // Validate structure
    if (!Array.isArray(parsed.skills)) {
      throw new Error('Invalid structured output: skills must be array');
    }
    
    return parsed;
  } catch (error) {
    logger.error(`[AdvancedMatching] Structured extraction failed: ${error.message}`);
    throw error;
  }
}

/**
 * 🧠 STEP 2: SEMANTIC MATCHING
 * Use embeddings for synonym/context matching
 */
async function calculateSemanticSimilarity(resumeData, jdData) {
  try {
    // Create text representations
    const resumeText = [
      ...resumeData.skills,
      ...resumeData.roles,
      ...resumeData.projects,
      ...resumeData.domain_expertise
    ].join(' ');

    const jdText = [
      ...jdData.skills,
      ...jdData.roles,
      ...jdData.domain_expertise
    ].join(' ');

    // Use Claude to evaluate semantic similarity
    const prompt = `Compare these two texts for semantic similarity.

Candidate Profile:
${resumeText}

Job Requirements:
${jdText}

Rate similarity 0-100 based on:
1. Skill synonyms (e.g., "Node.js" = "Backend JavaScript")
2. Role equivalence (e.g., "Software Engineer" = "Developer")
3. Domain overlap

Output JSON:
{
  "similarity_score": number (0-100),
  "matched_concepts": [],
  "reasoning": ""
}`;

    const response = await callClaude([{
      role: 'user',
      content: prompt
    }], 1500);

    const result = JSON.parse(stripFence(response));
    return result.similarity_score || 0;
  } catch (error) {
    logger.error(`[AdvancedMatching] Semantic matching failed: ${error.message}`);
    return 0;
  }
}

/**
 * ⚙️ STEP 3: HARD FILTERS (ANTI-LOOPHOLE)
 * Strict validation before scoring
 */
function applyHardFilters(resumeData, jdData) {
  const failures = [];

  // 1. Minimum Experience Check
  if (jdData.experience_years > 0 && resumeData.experience_years < jdData.experience_years) {
    failures.push({
      rule: 'minimum_experience',
      required: jdData.experience_years,
      actual: resumeData.experience_years,
      message: `Requires ${jdData.experience_years}+ years, candidate has ${resumeData.experience_years}`
    });
  }

  // 2. Mandatory Skills Check
  const mandatorySkills = jdData.skills.filter(s => s); // All JD skills are mandatory
  const candidateSkills = resumeData.skills.map(s => s.toLowerCase());
  
  const missingCriticalSkills = mandatorySkills.filter(skill => {
    const skillLower = skill.toLowerCase();
    return !candidateSkills.some(cs => 
      cs.includes(skillLower) || skillLower.includes(cs)
    );
  });

  if (missingCriticalSkills.length > mandatorySkills.length * 0.5) {
    failures.push({
      rule: 'mandatory_skills',
      missing: missingCriticalSkills,
      message: `Missing critical skills: ${missingCriticalSkills.join(', ')}`
    });
  }

  // 3. Seniority Mismatch
  const seniorityLevels = {
    'junior': 1,
    'mid': 2,
    'senior': 3,
    'lead': 4,
    'principal': 5,
    'staff': 5
  };

  const requiredLevel = seniorityLevels[jdData.seniority?.toLowerCase()] || 0;
  const candidateLevel = seniorityLevels[resumeData.seniority?.toLowerCase()] || 0;

  if (requiredLevel > 0 && candidateLevel < requiredLevel - 1) {
    failures.push({
      rule: 'seniority_mismatch',
      required: jdData.seniority,
      actual: resumeData.seniority,
      message: `Requires ${jdData.seniority} level, candidate is ${resumeData.seniority}`
    });
  }

  // 4. Location Check (if strict)
  if (jdData.location && !jdData.location.toLowerCase().includes('remote')) {
    const jdLoc = jdData.location.toLowerCase();
    const candLoc = (resumeData.location || '').toLowerCase();
    
    if (candLoc && !candLoc.includes(jdLoc) && !jdLoc.includes(candLoc)) {
      // Location mismatch - warning, not rejection
      failures.push({
        rule: 'location_preference',
        required: jdData.location,
        actual: resumeData.location,
        message: `Preferred location: ${jdData.location}`,
        severity: 'warning'
      });
    }
  }

  return {
    passed: failures.filter(f => f.severity !== 'warning').length === 0,
    failures,
    warnings: failures.filter(f => f.severity === 'warning')
  };
}

/**
 * 🧮 STEP 4: MULTI-DIMENSION SCORING
 */
function calculateComponentScores(resumeData, jdData) {
  const scores = {};

  // A. Skill Match (40%)
  const requiredSkills = jdData.skills.map(s => s.toLowerCase());
  const candidateSkills = resumeData.skills.map(s => s.toLowerCase());
  
  const matchedSkills = requiredSkills.filter(rs =>
    candidateSkills.some(cs => cs.includes(rs) || rs.includes(cs))
  );
  
  scores.skill_match = requiredSkills.length > 0 
    ? (matchedSkills.length / requiredSkills.length) * 100
    : 100;

  // B. Experience Match (20%)
  const idealExp = jdData.experience_years || 3;
  const candidateExp = resumeData.experience_years || 0;
  const diff = Math.abs(candidateExp - idealExp);
  
  if (candidateExp >= idealExp) {
    // Over-qualified is okay but not perfect
    scores.experience_match = Math.max(70, 100 - (diff * 5));
  } else {
    // Under-qualified is penalized more
    scores.experience_match = Math.max(0, 100 - (diff * 15));
  }

  // C. Project Relevance (10%)
  const candidateProjects = resumeData.projects || [];
  const requiredSkillsSet = new Set(requiredSkills);
  
  if (candidateProjects.length > 0) {
    const relevantProjects = candidateProjects.filter(project => {
      const projectLower = project.toLowerCase();
      return Array.from(requiredSkillsSet).some(skill => 
        projectLower.includes(skill)
      );
    });
    scores.project_relevance = (relevantProjects.length / candidateProjects.length) * 100;
  } else {
    scores.project_relevance = 50; // Neutral if no projects
  }

  // D. Education Match (10%)
  const jdEducation = (jdData.education || []).map(e => e.toLowerCase());
  const candidateEducation = (resumeData.education || []).map(e => e.toLowerCase());
  
  if (jdEducation.length === 0) {
    scores.education_match = 100; // No requirement
  } else {
    const hasMatch = jdEducation.some(jdEdu =>
      candidateEducation.some(candEdu => 
        candEdu.includes(jdEdu) || jdEdu.includes(candEdu)
      )
    );
    scores.education_match = hasMatch ? 100 : 50;
  }

  // E. Stability Score (10%)
  // Check for job hopping (roles vs experience years)
  const rolesCount = resumeData.roles?.length || 1;
  const yearsPerRole = candidateExp / rolesCount;
  
  if (yearsPerRole >= 2) {
    scores.stability = 100; // Good stability
  } else if (yearsPerRole >= 1) {
    scores.stability = 70; // Moderate
  } else {
    scores.stability = 40; // Potential job hopper
  }

  return scores;
}

/**
 * 🔍 ANTI-GAMING DETECTION
 */
async function detectGamingPatterns(resumeData, resumeText) {
  const issues = [];

  // 1. Keyword Stuffing Detection
  const skillMentions = {};
  resumeData.skills.forEach(skill => {
    const regex = new RegExp(skill, 'gi');
    const matches = (resumeText.match(regex) || []).length;
    skillMentions[skill] = matches;
  });

  const stuffedSkills = Object.entries(skillMentions)
    .filter(([skill, count]) => count > 10)
    .map(([skill]) => skill);

  if (stuffedSkills.length > 0) {
    issues.push({
      type: 'keyword_stuffing',
      skills: stuffedSkills,
      severity: 'high'
    });
  }

  // 2. Skill Depth Check using LLM
  if (resumeData.skills.length > 0) {
    try {
      const prompt = `Analyze if these skills show real usage or just mentions:

Resume excerpt:
${resumeText.substring(0, 3000)}

Skills claimed: ${resumeData.skills.join(', ')}

For each skill, check:
1. Is it used in actual projects/experience?
2. Is there evidence of depth (not just mentioned)?

Output JSON:
{
  "shallow_skills": [],
  "deep_skills": [],
  "reasoning": ""
}`;

      const response = await callClaude([{
        role: 'user',
        content: prompt
      }], 1500);

      const analysis = JSON.parse(stripFence(response));
      
      if (analysis.shallow_skills?.length > resumeData.skills.length * 0.5) {
        issues.push({
          type: 'shallow_skills',
          skills: analysis.shallow_skills,
          severity: 'medium'
        });
      }
    } catch (error) {
      logger.warn(`[AdvancedMatching] Skill depth check failed: ${error.message}`);
    }
  }

  // 3. Timeline Consistency
  const roles = resumeData.roles || [];
  if (roles.length > resumeData.experience_years * 2) {
    issues.push({
      type: 'unrealistic_timeline',
      message: `${roles.length} roles in ${resumeData.experience_years} years`,
      severity: 'medium'
    });
  }

  return issues;
}

/**
 * 🧠 STEP 5: LLM FINAL EVALUATION
 */
async function llmFinalEvaluation(resumeData, jdData, scores, gamingIssues) {
  const prompt = `You are a strict hiring evaluator. Validate this candidate match.

CANDIDATE DATA:
${JSON.stringify(resumeData, null, 2)}

JOB REQUIREMENTS:
${JSON.stringify(jdData, null, 2)}

PRECOMPUTED SCORES:
${JSON.stringify(scores, null, 2)}

DETECTED ISSUES:
${JSON.stringify(gamingIssues, null, 2)}

TASKS:
1. Validate if scores make sense
2. Identify red flags
3. Adjust score if needed (±10 max)
4. Provide clear reasoning

CRITICAL RULES:
- Be strict and realistic
- Penalize gaming attempts
- Consider experience quality, not just quantity
- Check for skill-project alignment

Output STRICT JSON:
{
  "final_score": number (0-100),
  "decision": "reject" | "consider" | "strong_fit",
  "red_flags": [],
  "strengths": [],
  "reasoning": "",
  "score_adjustment": number (-10 to +10),
  "confidence": number (0-100)
}`;

  try {
    const response = await callClaude([{
      role: 'user',
      content: prompt
    }], 2000);

    return JSON.parse(stripFence(response));
  } catch (error) {
    logger.error(`[AdvancedMatching] LLM evaluation failed: ${error.message}`);
    
    // Fallback to rule-based decision
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    return {
      final_score: Math.round(avgScore),
      decision: avgScore >= 70 ? 'consider' : 'reject',
      red_flags: gamingIssues.map(i => i.type),
      strengths: [],
      reasoning: 'LLM evaluation unavailable, using rule-based scoring',
      score_adjustment: 0,
      confidence: 60
    };
  }
}

/**
 * 🎯 MAIN MATCHING FUNCTION
 */
async function performAdvancedMatching(resumeText, jdText, resumeData = null, jdData = null) {
  try {
    logger.info('[AdvancedMatching] Starting 4-level matching process');

    // STEP 1: Structured Extraction
    logger.info('[AdvancedMatching] Step 1: Extracting structured data');
    const extractedResumeData = resumeData || await extractStructuredData(resumeText, 'resume');
    const extractedJdData = jdData || await extractStructuredData(jdText, 'jd');

    // STEP 2: Hard Filters
    logger.info('[AdvancedMatching] Step 2: Applying hard filters');
    const filterResult = applyHardFilters(extractedResumeData, extractedJdData);
    
    if (!filterResult.passed) {
      return {
        match_score: 0,
        decision: 'reject',
        reason: 'Failed hard filters',
        filter_failures: filterResult.failures,
        structured_data: {
          resume: extractedResumeData,
          jd: extractedJdData
        }
      };
    }

    // STEP 3: Component Scoring
    logger.info('[AdvancedMatching] Step 3: Calculating component scores');
    const componentScores = calculateComponentScores(extractedResumeData, extractedJdData);

    // STEP 4: Semantic Matching
    logger.info('[AdvancedMatching] Step 4: Semantic similarity analysis');
    const semanticScore = await calculateSemanticSimilarity(extractedResumeData, extractedJdData);
    componentScores.semantic_similarity = semanticScore;

    // STEP 5: Anti-Gaming Detection
    logger.info('[AdvancedMatching] Step 5: Detecting gaming patterns');
    const gamingIssues = await detectGamingPatterns(extractedResumeData, resumeText);

    // STEP 6: Calculate Base Score
    const baseScore = 
      (componentScores.skill_match * 0.40) +
      (componentScores.experience_match * 0.20) +
      (componentScores.semantic_similarity * 0.20) +
      (componentScores.project_relevance * 0.10) +
      (componentScores.education_match * 0.05) +
      (componentScores.stability * 0.05);

    // STEP 7: LLM Final Evaluation
    logger.info('[AdvancedMatching] Step 6: LLM final evaluation');
    const llmEvaluation = await llmFinalEvaluation(
      extractedResumeData,
      extractedJdData,
      { ...componentScores, base_score: baseScore },
      gamingIssues
    );

    // Final Result
    const finalScore = Math.max(0, Math.min(100, llmEvaluation.final_score));

    return {
      match_score: Math.round(finalScore),
      decision: llmEvaluation.decision,
      component_scores: componentScores,
      base_score: Math.round(baseScore),
      llm_adjustment: llmEvaluation.score_adjustment,
      semantic_score: semanticScore,
      red_flags: llmEvaluation.red_flags,
      strengths: llmEvaluation.strengths,
      reasoning: llmEvaluation.reasoning,
      confidence: llmEvaluation.confidence,
      gaming_issues: gamingIssues,
      filter_warnings: filterResult.warnings,
      structured_data: {
        resume: extractedResumeData,
        jd: extractedJdData
      }
    };

  } catch (error) {
    logger.error(`[AdvancedMatching] Matching failed: ${error.message}`);
    throw error;
  }
}

/**
 * Helper Functions
 */
async function callClaude(messages, maxTokens = 2000) {
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

function stripFence(text = '') {
  return String(text).replace(/```json|```/gi, '').trim();
}

module.exports = {
  performAdvancedMatching,
  extractStructuredData,
  calculateSemanticSimilarity,
  applyHardFilters,
  calculateComponentScores,
  detectGamingPatterns,
  llmFinalEvaluation
};
