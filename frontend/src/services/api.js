import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API functions
export const api = {
  // Authentication
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    getCurrentUser: (userId = 'default_user') => apiClient.get(`/auth/me?user_id=${userId}`),
    logout: () => apiClient.post('/auth/logout'),
  },

  // Dashboard
  dashboard: {
    getStats: () => apiClient.get('/dashboard/stats'),
    getTransactions: (limit = 10) => apiClient.get(`/dashboard/transactions?limit=${limit}`),
    getNotifications: (userId, limit = 10) => 
      apiClient.get(`/dashboard/notifications?user_id=${userId}&limit=${limit}`),
    getReports: () => apiClient.get('/dashboard/reports'),
  },

  // Sales
  sales: {
    getOrders: (limit = 20) => apiClient.get(`/sales/orders?limit=${limit}`),
    createOrder: (orderData) => apiClient.post('/sales/orders', orderData),
    getCustomers: (limit = 50) => apiClient.get(`/sales/customers?limit=${limit}`),
    createCustomer: (customerData) => apiClient.post('/sales/customers', customerData),
  },

  // Search
  search: {
    global: (query, limit = 20, category = null) => {
      let url = `/search/global?query=${encodeURIComponent(query)}&limit=${limit}`;
      if (category) {
        url += `&category=${category}`;
      }
      return apiClient.get(url);
    },
    suggestions: (query, limit = 8) => 
      apiClient.get(`/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`),
  },

  // Generic API call helper
  get: (endpoint) => apiClient.get(endpoint),
  post: (endpoint, data) => apiClient.post(endpoint, data),
  put: (endpoint, data) => apiClient.put(endpoint, data),
  delete: (endpoint) => apiClient.delete(endpoint),
};

export default api;