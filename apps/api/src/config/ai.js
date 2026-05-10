const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
    if (this.provider === 'anthropic') {
      // Anthropic Claude
      this.apiKey = process.env.ANTHROPIC_API_KEY;
      this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
      this.baseURL = 'https://api.anthropic.com/v1';
    } else if (this.provider === 'groq') {
      // Groq: OpenAI compatible API surface
      this.apiKey = process.env.GROQ_API_KEY;
      this.model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
      this.baseURL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    } else {
      // Default: OpenAI
      this.apiKey = process.env.OPENAI_API_KEY;
      this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
      this.baseURL = 'https://api.openai.com/v1';
    }
  }

  async withOverrides({ provider, model } = {}, fn) {
    const prev = {
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      baseURL: this.baseURL,
    };
    try {
      if (provider) {
        const p = provider.toLowerCase();
        this.provider = p;
        if (p === 'anthropic') {
          this.apiKey = process.env.ANTHROPIC_API_KEY;
          this.model = model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
          this.baseURL = 'https://api.anthropic.com/v1';
        } else if (p === 'groq') {
          this.apiKey = process.env.GROQ_API_KEY;
          this.model = model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
          this.baseURL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
        } else {
          this.apiKey = process.env.OPENAI_API_KEY;
          this.model = model || process.env.AI_MODEL || 'gpt-3.5-turbo';
          this.baseURL = 'https://api.openai.com/v1';
        }
      } else if (model) {
        this.model = model;
      }
      return await fn();
    } finally {
      this.provider = prev.provider;
      this.apiKey = prev.apiKey;
      this.model = prev.model;
      this.baseURL = prev.baseURL;
    }
  }

  async chatCompletion(messages, { max_tokens = 2000, temperature = 0.7 } = {}, attempt = 0) {
    try {
      if (this.provider === 'anthropic') {
        // Anthropic Claude API format
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        
        const response = await axios.post(
          `${this.baseURL}/messages`,
          {
            model: this.model,
            max_tokens,
            temperature,
            system: systemMessage?.content || 'You are a helpful AI assistant.',
            messages: userMessages
          },
          {
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Convert Anthropic response to OpenAI format
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: response.data.content[0].text
            }
          }]
        };
      } else {
        // OpenAI/Groq API format
        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          { model: this.model, messages, max_tokens, temperature },
          { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      // Retry on 429/5xx with exponential backoff up to 3 tries
      if ((status === 429 || (status >= 500 && status < 600)) && attempt < 3) {
        const delay = 500 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        return this.chatCompletion(messages, { max_tokens, temperature }, attempt + 1);
      }
      throw error;
    }
  }

  async generateQuestions(resumeText, testType, questionCount = 10) {
    try {
      const prompt = this.buildQuestionPrompt(resumeText, testType, questionCount);
      const messages = [
        { role: 'system', content: 'You are an expert test creator. Generate relevant questions based on the provided resume and test type.' },
        { role: 'user', content: prompt }
      ];
      const response = await this.chatCompletion(messages, { max_tokens: 2000, temperature: 0.5 });
      const generatedText = response.choices?.[0]?.message?.content || '';
      return this.parseQuestions(generatedText);
    } catch (error) {
      logger.error(`AI question generation error: ${error.message}`);
      throw new Error('Failed to generate questions using AI');
    }
  }

  async analyzeResume(resumeText) {
    try {
      const prompt = `Analyze the following resume and extract key information:
      
      Resume:
      ${resumeText}
      
      Please provide a JSON response with the following structure:
      {
        "skills": ["skill1", "skill2", ...],
        "experience": "years of experience",
        "education": "highest education level",
        "technologies": ["tech1", "tech2", ...],
        "summary": "brief professional summary"
      }`;

      const messages = [
        { role: 'system', content: 'You are an expert resume analyzer. Extract structured information from resumes.' },
        { role: 'user', content: prompt }
      ];
      const response = await this.chatCompletion(messages, { max_tokens: 1000, temperature: 0.2 });
      const analysisText = response.choices?.[0]?.message?.content || '{}';
      return JSON.parse(analysisText);
    } catch (error) {
      logger.error(`AI resume analysis error: ${error.message}`);
      throw new Error('Failed to analyze resume using AI');
    }
  }

  buildQuestionPrompt(resumeText, testType, questionCount) {
    const basePrompt = `Based on the following resume, generate exactly ${questionCount} high-quality ${testType} questions suitable for assessment.

Resume:
${resumeText}

Requirements:
- Generate questions relevant to the candidate's skills and experience.
- Each question must be multiple-choice with exactly 4 options (A, B, C, D) as strings.
- Provide the correctAnswer as a single uppercase letter among A, B, C, D.
- Provide a short explanation.
- Distribute difficulty roughly as: 40% easy, 40% medium, 20% hard.
- Return a STRICT JSON array only, with no commentary before/after.

Expected JSON format:
[
  {
    "question": "Question text",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": "A",
    "explanation": "Why this answer is correct",
    "difficulty": "medium",
    "type": "multiple_choice",
    "points": 10
  }
]`;

    return basePrompt;
  }

  parseQuestions(generatedText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: try to parse the entire response
      return JSON.parse(generatedText);
    } catch (error) {
      logger.error(`Error parsing AI-generated questions: ${error.message}`);
      throw new Error('Failed to parse AI-generated questions');
    }
  }

  async generateTestSuggestions(skills, experience) {
    try {
      const prompt = `Based on the following candidate profile, suggest appropriate test types and topics:
      
      Skills: ${skills.join(', ')}
      Experience: ${experience}
      
      Provide suggestions for:
      1. Technical test topics
      2. Aptitude test areas
      3. Behavioral assessment areas
      4. Recommended difficulty level
      
      Format as JSON.`;

      const messages = [
        {
          role: 'system',
          content: 'You are an expert in creating personalized assessments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.chatCompletion(messages, { max_tokens: 800, temperature: 0.5 });
      const suggestionsText = response.choices[0].message.content;
      return JSON.parse(suggestionsText);
    } catch (error) {
      logger.error(`AI test suggestions error: ${error.message}`);
      throw new Error('Failed to generate test suggestions using AI');
    }
  }

  async analyzeTestResults(testResult, candidateProfile) {
    try {
      const prompt = `Analyze the following test results and provide detailed insights:

Test Results:
- Total Score: ${testResult.totalScore}/${testResult.maxPossibleScore}
- Percentage: ${testResult.percentageScore}%
- Questions Attempted: ${testResult.analytics?.questionsAttempted || 0}
- Questions Skipped: ${testResult.analytics?.questionsSkipped || 0}
- Time Spent: ${Math.round((testResult.totalTimeSpent || 0) / 60)} minutes

Candidate Profile:
- Skills: ${candidateProfile.skills?.map(s => s.name || s).join(', ') || 'N/A'}
- Experience: ${candidateProfile.experience || 'N/A'} years

Provide analysis in JSON format:
{
  "overallAssessment": "Brief overall assessment",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "skillsGaps": ["gap1", "gap2"],
  "nextSteps": ["step1", "step2"],
  "hiringRecommendation": "proceed/review/reject with reasoning"
}`;

      const messages = [
        {
          role: 'system',
          content: 'You are an expert HR analyst specializing in candidate assessment and evaluation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.chatCompletion(messages, { max_tokens: 1500, temperature: 0.3 });
      const analysisText = response.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(analysisText);
    } catch (error) {
      logger.error(`AI result analysis error: ${error.message}`);
      throw new Error('Failed to analyze test results using AI');
    }
  }
}

module.exports = new AIService();
