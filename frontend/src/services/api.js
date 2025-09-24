import axios from 'axios';

// Backend URL strictly from environment variables per platform rules
const ENV_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_BACKEND_URL)
  || (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL)
  || '';

const BACKEND_URL = ENV_URL;
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

if (!BACKEND_URL) {
  console.warn('⚠️ REACT_APP_BACKEND_URL is not set. Falling back to relative /api.');
} else {
  console.log('🔧 API Service - Using backend URL from env:', BACKEND_URL);
}

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

// Enhanced API call wrapper with retry logic and better error handling
const makeRequest = async (requestFn, retries = 1) => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || !error.response)) {
      // Retry once for timeout or network errors
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return makeRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

// API functions
export const api = {
  // Base configuration
  getBaseUrl: () => BACKEND_URL,
  
  // Authentication
  auth: {
    login: (credentials) => makeRequest(() => apiClient.post('/auth/login', credentials)),
    getCurrentUser: (userId = 'default_user') => makeRequest(() => apiClient.get(`/auth/me?user_id=${userId}`)),
    logout: () => makeRequest(() => apiClient.post('/auth/logout')),
  },

  // Dashboard
  dashboard: {
    getStats: () => makeRequest(() => apiClient.get('/dashboard/stats')),
    getTransactions: (limit = 10) => makeRequest(() => apiClient.get(`/dashboard/transactions?limit=${limit}`)),
    getNotifications: (userId, limit = 10) => 
      makeRequest(() => apiClient.get(`/dashboard/notifications?user_id=${userId}&limit=${limit}`)),
    getReports: () => makeRequest(() => apiClient.get('/dashboard/reports')),
  },

  // Sales
  sales: {
    getOrders: (limit = 20) => makeRequest(() => apiClient.get(`/sales/orders`, { params: { limit } })),
    getOrdersFiltered: (params = {}) => makeRequest(() => apiClient.get('/sales/orders', { params })),
    createOrder: (orderData) => makeRequest(() => apiClient.post('/sales/orders', orderData)),
    getCustomers: (limit = 50) => makeRequest(() => apiClient.get(`/sales/customers`, { params: { limit } })),
    createCustomer: (customerData) => makeRequest(() => apiClient.post('/sales/customers', customerData)),
  },

  // Search
  search: {
    global: (query, limit = 20, category = null) => {
      let url = `/search/global?query=${encodeURIComponent(query)}&limit=${limit}`;
      if (category) {
        url += `&category=${category}`;
      }
      return makeRequest(() => apiClient.get(url));
    },
    suggestions: (query, limit = 8) => 
      makeRequest(() => apiClient.get(`/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`)),
  },

  // Reporting
  reports: {
    salesOverview: (days = 30) => makeRequest(() => apiClient.get(`/reports/sales-overview?days=${days}`)),
    financialSummary: (days = 30) => makeRequest(() => apiClient.get(`/reports/financial-summary?days=${days}`)),
    customerAnalysis: (days = 30) => makeRequest(() => apiClient.get(`/reports/customer-analysis?days=${days}`)),
    inventoryReport: () => makeRequest(() => apiClient.get(`/reports/inventory-report`)),
    performanceMetrics: (days = 30) => makeRequest(() => apiClient.get(`/reports/performance-metrics?days=${days}`)),
    export: (reportType, format = 'pdf', days = 30) => 
      makeRequest(() => apiClient.post(`/reports/export/${reportType}?format=${format}&days=${days}`)),
    download: (exportId) => makeRequest(() => apiClient.get(`/reports/download/${exportId}`)),
  },

  // Stock
  stock: {
    getSettings: () => makeRequest(() => apiClient.get('/stock/settings')),
    updateSettings: (data) => makeRequest(() => apiClient.put('/stock/settings', data)),
    listWarehouses: () => makeRequest(() => apiClient.get('/stock/warehouses')),
    createWarehouse: (data) => makeRequest(() => apiClient.post('/stock/warehouses', data)),
    updateWarehouse: (id, data) => makeRequest(() => apiClient.put(`/stock/warehouses/${id}`, data)),
    deleteWarehouse: (id) => makeRequest(() => apiClient.delete(`/stock/warehouses/${id}`)),
    createEntry: (data) => makeRequest(() => apiClient.post('/stock/entries', data)),
    ledger: (params) => makeRequest(() => apiClient.get('/stock/ledger', { params })),
    valuationReport: () => makeRequest(() => apiClient.get('/stock/valuation/report')),
    reorderReport: () => makeRequest(() => apiClient.get('/stock/reorder/report')),
  },

  // PoS / Items
  pos: {
    products: (search = '', limit = 50) => makeRequest(() => apiClient.get('/pos/products', { params: { search, limit } })),
  },

  // Generic API call helper
  get: (endpoint) => makeRequest(() => apiClient.get(endpoint)),
  post: (endpoint, data) => makeRequest(() => apiClient.post(endpoint, data)),
  put: (endpoint, data) => makeRequest(() => apiClient.put(endpoint, data)),
  delete: (endpoint) => makeRequest(() => apiClient.delete(endpoint)),
};

export default api;