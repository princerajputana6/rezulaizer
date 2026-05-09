import axios from 'axios';

// Prefer Vite env, fallback to CRA env, then window origin, then localhost
const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window?.location?.origin
    ? `${window.location.origin.replace(/\/$/, '')}/api`
    : 'http://localhost:8000/api');

const normalizedBase = (rawBaseUrl || '').replace(/\/$/, '');
const API_BASE_URL = normalizedBase.endsWith('/api')
  ? normalizedBase
  : `${normalizedBase}/api`;

export const candidateApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for AI operations and file uploads
});

candidateApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('candidate_token');
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer') ? token : `Bearer ${token}`;
  }
  return config;
});
