import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Network status detection
let isOnline = navigator.onLine;
window.addEventListener('online', () => { isOnline = true; });
window.addEventListener('offline', () => { isOnline = false; });

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for auth and network checking
apiClient.interceptors.request.use((config) => {
  // Check if user is offline
  if (!isOnline) {
    throw new axios.Cancel('You are currently offline. Please check your internet connection.');
  }
  
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error handling for network issues
    if (!error.response) {
      // Network error (offline, server down, etc.)
      console.error('Network Error: Unable to connect to server');
      error.networkError = true;
      error.message = 'Network Error: Unable to connect to server. Please check your connection.';
    } else {
      // Server responded with error status
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// Utility functions for network status
export const networkUtils = {
  isOnline: () => isOnline,
  checkConnection: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/`, { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error) {
      return false;
    }
  },
  getConnectionStatus: async () => {
    if (!isOnline) {
      return { online: false, message: 'You are offline. Please check your internet connection.' };
    }
    
    const serverReachable = await networkUtils.checkConnection();
    if (!serverReachable) {
      return { online: false, message: 'Cannot connect to server. The server may be down or unreachable.' };
    }
    
    return { online: true, message: 'Connected' };
  }
};

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

  // Reporting
  reports: {
    salesOverview: (days = 30) => apiClient.get(`/reports/sales-overview?days=${days}`),
    financialSummary: (days = 30) => apiClient.get(`/reports/financial-summary?days=${days}`),
    customerAnalysis: (days = 30) => apiClient.get(`/reports/customer-analysis?days=${days}`),
    inventoryReport: () => apiClient.get(`/reports/inventory-report`),
    performanceMetrics: (days = 30) => apiClient.get(`/reports/performance-metrics?days=${days}`),
    export: (reportType, format = 'pdf', days = 30) => 
      apiClient.post(`/reports/export/${reportType}?format=${format}&days=${days}`),
    download: (exportId) => apiClient.get(`/reports/download/${exportId}`),
  },

  // Generic API call helper
  get: (endpoint) => apiClient.get(endpoint),
  post: (endpoint, data) => apiClient.post(endpoint, data),
  put: (endpoint, data) => apiClient.put(endpoint, data),
  delete: (endpoint) => apiClient.delete(endpoint),
};

export default api;