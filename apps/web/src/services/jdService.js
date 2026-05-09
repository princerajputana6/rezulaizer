import { apiClient } from './apiClient';

class JDService {
  async create(data) {
    const res = await apiClient.post('/jd', data);
    return res.data;
  }
  async list(params = {}) {
    const res = await apiClient.get('/jd', { params });
    return res.data;
  }
  async get(id) {
    const res = await apiClient.get(`/jd/${id}`);
    return res.data;
  }
  async update(id, data) {
    const res = await apiClient.put(`/jd/${id}`, data);
    return res.data;
  }
  async remove(id) {
    const res = await apiClient.delete(`/jd/${id}`);
    return res.data;
  }
  async matchCandidates(id) {
    const res = await apiClient.get(`/jd/${id}/match-candidates`);
    return res.data;
  }
}

export default new JDService();
