import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE_URL = `${BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    // config.headers.Authorization = `Bearer ${token}`;
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('Response error:', error.response.status, error.response.data);
      
      if (error.response.status === 429) {
        throw new Error('Too many requests. Please slow down.');
      } else if (error.response.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.response.status === 404) {
        throw new Error('Resource not found.');
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response received:', error.request);
      throw new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    throw error;
  }
);

// API Methods
export const api = {
  // Health check
  checkHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Status checks
  getStatusChecks: async (page = 1, pageSize = 20, clientName = null) => {
    const params = { page, page_size: pageSize };
    if (clientName) params.client_name = clientName;
    const response = await apiClient.get('/status', { params });
    return response.data;
  },

  getStatusCheck: async (id) => {
    const response = await apiClient.get(`/status/${id}`);
    return response.data;
  },

  createStatusCheck: async (data) => {
    const response = await apiClient.post('/status', data);
    return response.data;
  },

  deleteStatusCheck: async (id) => {
    const response = await apiClient.delete(`/status/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/status/stats');
    return response.data;
  },
};

export default api;
