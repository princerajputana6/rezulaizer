const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Embedding Service - Generate vector embeddings for text
 * Supports OpenAI and Anthropic (via text conversion)
 */
class EmbeddingService {
  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || 'openai';
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate embedding vector for text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Truncate if too long (max 8000 chars for safety)
      const truncatedText = text.substring(0, 8000);

      if (this.provider === 'openai' && this.openaiKey) {
        return await this.generateOpenAIEmbedding(truncatedText);
      } else if (this.anthropicKey) {
        // Fallback: Use simple TF-IDF style embedding
        return this.generateSimpleEmbedding(truncatedText);
      } else {
        throw new Error('No embedding provider configured. Set OPENAI_API_KEY or use fallback.');
      }
    } catch (error) {
      logger.error(`[EmbeddingService] Error generating embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embedding using OpenAI API
   */
  async generateOpenAIEmbedding(text) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-small', // 1536 dimensions, cost-effective
          input: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      logger.error(`[OpenAI Embedding] Error: ${error.message}`);
      throw new Error('Failed to generate OpenAI embedding');
    }
  }

  /**
   * Simple fallback embedding using keyword frequency
   * Returns a 100-dimensional vector based on common tech skills
   */
  generateSimpleEmbedding(text) {
    const lowerText = text.toLowerCase();
    
    // Common tech keywords (100 dimensions)
    const keywords = [
      'javascript', 'python', 'java', 'react', 'node', 'angular', 'vue',
      'typescript', 'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'devops',
      'machine learning', 'ai', 'data science', 'tensorflow', 'pytorch',
      'rest', 'api', 'graphql', 'microservices', 'agile', 'scrum',
      'git', 'github', 'gitlab', 'testing', 'jest', 'cypress', 'selenium',
      'express', 'django', 'flask', 'spring', 'laravel', 'rails',
      'frontend', 'backend', 'fullstack', 'mobile', 'ios', 'android',
      'swift', 'kotlin', 'flutter', 'react native', 'redux', 'webpack',
      'sass', 'tailwind', 'bootstrap', 'material ui', 'figma', 'sketch',
      'leadership', 'communication', 'teamwork', 'problem solving',
      'project management', 'analytical', 'creative', 'detail oriented',
      'c++', 'c#', '.net', 'php', 'ruby', 'go', 'rust', 'scala',
      'redis', 'elasticsearch', 'kafka', 'rabbitmq', 'nginx', 'apache',
      'linux', 'unix', 'windows', 'bash', 'powershell', 'terraform',
      'ansible', 'jenkins', 'circleci', 'travis', 'security', 'oauth',
      'jwt', 'encryption', 'blockchain', 'web3', 'solidity', 'smart contracts'
    ];

    // Generate vector based on keyword presence and frequency
    const vector = keywords.map(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;
      
      // Normalize: log scale to prevent single keyword dominance
      return count > 0 ? Math.log(count + 1) : 0;
    });

    // Normalize vector (L2 normalization)
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vec1 - First vector
   * @param {number[]} vec2 - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }

  /**
   * Batch generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async generateBatchEmbeddings(texts) {
    try {
      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text))
      );
      return embeddings;
    } catch (error) {
      logger.error(`[EmbeddingService] Batch embedding error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new EmbeddingService();
