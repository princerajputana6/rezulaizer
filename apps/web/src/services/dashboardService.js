import { apiClient } from './apiClient';

class DashboardService {
  // Get dashboard statistics
  async getDashboardStats() {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  }

  // Get recent activities
  async getRecentActivities(limit = 10) {
    const response = await apiClient.get(`/dashboard/activities?limit=${limit}`);
    return response.data;
  }

  // Get system status
  async getSystemStatus() {
    const response = await apiClient.get('/dashboard/system-status');
    return response.data;
  }

  // Create new activity
  async createActivity(activityData) {
    const response = await apiClient.post('/dashboard/activities', activityData);
    return response.data;
  }

  // Update system status
  async updateSystemStatus(serviceName, statusData) {
    const response = await apiClient.put(`/dashboard/system-status/${serviceName}`, statusData);
    return response.data;
  }
}

export default new DashboardService();
