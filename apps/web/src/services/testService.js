import { apiClient } from './apiClient';

class TestService {
  // Get all tests
  async getTests(params = {}) {
    const response = await apiClient.get('/tests', { params });
    return response.data;
  }

  // Get test by ID
  async getTestById(id) {
    const response = await apiClient.get(`/tests/${id}`);
    return response.data;
  }

  // Create new test
  async createTest(testData) {
    const response = await apiClient.post('/tests', testData);
    return response.data;
  }

  // Update test
  async updateTest(id, testData) {
    const response = await apiClient.put(`/tests/${id}`, testData);
    return response.data;
  }

  // Delete test
  async deleteTest(id) {
    const response = await apiClient.delete(`/tests/${id}`);
    return response.data;
  }

  // Publish test
  async publishTest(id) {
    const response = await apiClient.post(`/tests/${id}/publish`);
    return response.data;
  }

  // Archive test
  async archiveTest(id) {
    const response = await apiClient.post(`/tests/${id}/archive`);
    return response.data;
  }

  // Start test attempt
  async startTestAttempt(testId) {
    const response = await apiClient.post(`/tests/${testId}/attempt`);
    return response.data;
  }

  // Get test attempt
  async getTestAttempt(testId) {
    const response = await apiClient.get(`/tests/${testId}/attempt`);
    return response.data;
  }

  // Submit test answer
  async submitAnswer(testId, questionId, answer) {
    const response = await apiClient.post(`/tests/${testId}/answer`, {
      questionId,
      answer
    });
    return response.data;
  }

  // Submit test attempt
  async submitTestAttempt(testId, answers) {
    const response = await apiClient.post(`/tests/${testId}/submit`, { answers });
    return response.data;
  }

  // Get test results
  async getTestResults(testId, attemptId) {
    const response = await apiClient.get(`/tests/${testId}/results/${attemptId}`);
    return response.data;
  }

  // Get test analytics
  async getTestAnalytics(testId) {
    const response = await apiClient.get(`/tests/${testId}/analytics`);
    return response.data;
  }

  // Generate test with AI
  async generateTestWithAI(data) {
    const response = await apiClient.post('/ai/generate-test', data);
    return response.data;
  }

  // Generate questions with AI
  async generateQuestionsWithAI(data) {
    const response = await apiClient.post('/ai/generate-questions', data);
    return response.data;
  }

  // Analyze resume
  async analyzeResume(resumeText) {
    const response = await apiClient.post('/ai/analyze-resume', { resumeText });
    return response.data;
  }

  // Upload resume file
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    
    const response = await apiClient.post('/upload/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Send test invitation
  async sendTestInvitation(testId, invitationData) {
    const response = await apiClient.post(`/tests/${testId}/invite`, invitationData);
    return response.data;
  }

  // Get test invitations
  async getTestInvitations(testId) {
    const response = await apiClient.get(`/tests/${testId}/invitations`);
    return response.data;
  }
}

export default new TestService();
