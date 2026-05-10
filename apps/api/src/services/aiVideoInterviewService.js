const axios = require('axios');
const logger = require('../utils/logger');

class AIVideoInterviewService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    this.baseURL = 'https://api.anthropic.com/v1';
  }

  async callClaude(messages, maxTokens = 2000, temperature = 0.7) {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: systemMessage?.content || 'You are an expert AI interviewer.',
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

      return response.data.content[0].text;
    } catch (error) {
      logger.error(`Claude API error: ${error.message}`);
      throw new Error('Failed to communicate with AI interviewer');
    }
  }

  /**
   * Generate interview questions based on candidate profile and job description
   */
  async generateInterviewQuestions(candidateProfile, jobDescription, round = 1) {
    try {
      const prompt = `Generate ${round === 1 ? '5-7' : '3-5'} interview questions for a ${round === 1 ? 'first' : 'second'} round AI video interview.

Candidate Profile:
- Name: ${candidateProfile.firstName} ${candidateProfile.lastName}
- Skills: ${candidateProfile.skills?.map(s => s.name || s).join(', ') || 'N/A'}
- Experience: ${candidateProfile.experience || 'N/A'} years
- Current Position: ${candidateProfile.currentPosition || 'N/A'}

Job Description:
${jobDescription || 'General technical position'}

${round === 1 ? `
First Round Focus:
- Basic technical knowledge
- Communication skills
- Cultural fit
- Problem-solving approach
` : `
Second Round Focus:
- Deep technical expertise
- System design and architecture
- Leadership and collaboration
- Complex problem-solving scenarios
`}

Return a JSON array with this exact structure:
[
  {
    "question": "The interview question",
    "category": "technical/behavioral/situational",
    "difficulty": "easy/medium/hard",
    "expectedDuration": 120,
    "evaluationCriteria": ["criteria1", "criteria2"],
    "followUpQuestions": ["follow-up1", "follow-up2"]
  }
]`;

      const messages = [
        {
          role: 'system',
          content: 'You are an expert technical interviewer with years of experience in candidate evaluation. Generate thoughtful, relevant interview questions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callClaude(messages, 2000, 0.6);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      logger.error(`Error generating interview questions: ${error.message}`);
      throw new Error('Failed to generate interview questions');
    }
  }

  /**
   * Analyze candidate's video interview response
   */
  async analyzeResponse(question, candidateAnswer, transcriptText) {
    try {
      const prompt = `Analyze the candidate's response to an interview question.

Question: ${question}

Candidate's Answer (transcript): ${transcriptText || candidateAnswer}

Provide a detailed analysis in JSON format:
{
  "score": 0-100,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "technicalAccuracy": 0-100,
  "communicationClarity": 0-100,
  "relevance": 0-100,
  "confidence": 0-100,
  "feedback": "Detailed feedback for the candidate",
  "redFlags": ["flag1", "flag2"] or [],
  "recommendation": "proceed/review/reject"
}`;

      const messages = [
        {
          role: 'system',
          content: 'You are an expert interviewer analyzing candidate responses. Be fair, objective, and constructive in your evaluation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callClaude(messages, 1500, 0.3);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      logger.error(`Error analyzing response: ${error.message}`);
      throw new Error('Failed to analyze candidate response');
    }
  }

  /**
   * Generate follow-up questions based on candidate's answer
   */
  async generateFollowUpQuestions(originalQuestion, candidateAnswer, count = 2) {
    try {
      const prompt = `Based on the candidate's answer, generate ${count} relevant follow-up questions to probe deeper.

Original Question: ${originalQuestion}

Candidate's Answer: ${candidateAnswer}

Generate follow-up questions that:
- Dig deeper into their answer
- Clarify ambiguous points
- Test their depth of knowledge
- Explore edge cases or challenges

Return a JSON array:
["follow-up question 1", "follow-up question 2"]`;

      const messages = [
        {
          role: 'system',
          content: 'You are an expert interviewer skilled at asking insightful follow-up questions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callClaude(messages, 800, 0.7);
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      logger.error(`Error generating follow-up questions: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate overall interview assessment
   */
  async generateInterviewAssessment(interviewData) {
    try {
      const { candidate, questions, responses, round } = interviewData;

      const prompt = `Generate a comprehensive assessment for a ${round === 1 ? 'first' : 'second'} round AI video interview.

Candidate: ${candidate.firstName} ${candidate.lastName}
Position Applied: ${candidate.currentPosition || 'N/A'}

Interview Performance:
${responses.map((r, i) => `
Question ${i + 1}: ${questions[i]?.question || 'N/A'}
Answer Score: ${r.analysis?.score || 0}/100
Key Points: ${r.analysis?.strengths?.join(', ') || 'N/A'}
`).join('\n')}

Average Score: ${responses.reduce((sum, r) => sum + (r.analysis?.score || 0), 0) / responses.length}

Provide a comprehensive assessment in JSON format:
{
  "overallScore": 0-100,
  "recommendation": "strong_proceed/proceed/review/reject",
  "summary": "Brief overall summary",
  "technicalSkills": {
    "score": 0-100,
    "assessment": "detailed assessment"
  },
  "communication": {
    "score": 0-100,
    "assessment": "detailed assessment"
  },
  "problemSolving": {
    "score": 0-100,
    "assessment": "detailed assessment"
  },
  "culturalFit": {
    "score": 0-100,
    "assessment": "detailed assessment"
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2"],
  "nextSteps": ["step1", "step2"],
  "interviewerNotes": "Additional notes and observations",
  "proceedToNextRound": true/false,
  "estimatedFitScore": 0-100
}`;

      const messages = [
        {
          role: 'system',
          content: 'You are a senior hiring manager with extensive experience in candidate evaluation. Provide thorough, balanced, and actionable assessments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callClaude(messages, 2500, 0.4);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      logger.error(`Error generating interview assessment: ${error.message}`);
      throw new Error('Failed to generate interview assessment');
    }
  }

  /**
   * Analyze video interview body language and non-verbal cues (placeholder for future video analysis)
   */
  async analyzeNonVerbalCues(videoMetadata) {
    // Placeholder for future implementation with video analysis APIs
    // This would integrate with services like AWS Rekognition, Azure Video Indexer, etc.
    return {
      eyeContact: 'good',
      posture: 'professional',
      facialExpressions: 'engaged',
      confidence: 75,
      notes: 'Video analysis feature coming soon'
    };
  }

  /**
   * Generate personalized feedback for candidate
   */
  async generateCandidateFeedback(assessment, includeScore = false) {
    try {
      const prompt = `Generate constructive, encouraging feedback for a candidate based on their interview assessment.

Assessment Summary:
- Overall Performance: ${assessment.overallScore}/100
- Recommendation: ${assessment.recommendation}
- Strengths: ${assessment.strengths?.join(', ') || 'N/A'}
- Areas for Improvement: ${assessment.areasForImprovement?.join(', ') || 'N/A'}

Generate professional, constructive feedback that:
- Acknowledges their strengths
- Provides actionable improvement suggestions
- Maintains a positive, encouraging tone
- ${includeScore ? 'Includes their score' : 'Does NOT mention specific scores'}

Return plain text feedback (not JSON).`;

      const messages = [
        {
          role: 'system',
          content: 'You are a compassionate HR professional skilled at providing constructive feedback that motivates candidates.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      return await this.callClaude(messages, 1000, 0.6);
    } catch (error) {
      logger.error(`Error generating candidate feedback: ${error.message}`);
      return 'Thank you for participating in the interview. We will review your responses and get back to you soon.';
    }
  }
}

module.exports = new AIVideoInterviewService();
