import axios from 'axios';

// Backend URL strictly from environment variables per platform rules
const ENV_URL = process.env.REACT_APP_BACKEND_URL || '';

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
console.log('🔍 DEBUG - API_BASE being used for axios:', API_BASE);
console.log('🔍 DEBUG - BACKEND_URL value:', BACKEND_URL);
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 second timeout
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
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const makeRequest = async (requestFn, retries = 2, attempt = 0) => {
  try {
    return await requestFn();
  } catch (error) {
    const status = error?.response?.status;
    const retriable = error.code === 'ECONNABORTED' || !error.response || [502, 503, 504].includes(status);
    if (retries > 0 && retriable) {
      const backoff = 500 * Math.pow(2, attempt); // 500ms, 1000ms, ...
      await sleep(backoff);
      return makeRequest(requestFn, retries - 1, attempt + 1);
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
    
    // Credit Notes
    creditNotes: {
      list: (params = {}) => makeRequest(() => apiClient.get('/sales/credit-notes', { params })),
      create: (data) => makeRequest(() => apiClient.post('/sales/credit-notes', data)),
      get: (id) => makeRequest(() => apiClient.get(`/sales/credit-notes/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/sales/credit-notes/${id}`, data)),
      delete: (id) => makeRequest(() => apiClient.delete(`/sales/credit-notes/${id}`)),
      stats: () => makeRequest(() => apiClient.get('/sales/credit-notes/stats/overview')),
    },
  },

  // Buying
  buying: {
    // Debit Notes
    debitNotes: {
      list: (params = {}) => makeRequest(() => apiClient.get('/buying/debit-notes', { params })),
      create: (data) => makeRequest(() => apiClient.post('/buying/debit-notes', data)),
      get: (id) => makeRequest(() => apiClient.get(`/buying/debit-notes/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/buying/debit-notes/${id}`, data)),
      delete: (id) => makeRequest(() => apiClient.delete(`/buying/debit-notes/${id}`)),
      stats: () => makeRequest(() => apiClient.get('/buying/debit-notes/stats/overview')),
    },
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

  // Master Data - Items
  items: {
    list: (search = '', limit = 100) => makeRequest(() => apiClient.get('/stock/items', { params: { search, limit } })),
    create: (itemData) => makeRequest(() => apiClient.post('/stock/items', itemData)),
    get: (itemId) => makeRequest(() => apiClient.get(`/stock/items/${itemId}`)),
    update: (itemId, itemData) => makeRequest(() => apiClient.put(`/stock/items/${itemId}`, itemData)),
    delete: (itemId) => makeRequest(() => apiClient.delete(`/stock/items/${itemId}`)),
  },

  // Master Data - General
  master: {
    customers: {
      list: (search = '', limit = 100) => makeRequest(() => apiClient.get('/master/customers', { params: { search, limit } })),
      create: (data) => makeRequest(() => apiClient.post('/master/customers', data)),
      get: (id) => makeRequest(() => apiClient.get(`/master/customers/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/master/customers/${id}`, data)),
      delete: (id) => makeRequest(() => apiClient.delete(`/master/customers/${id}`)),
    },
    suppliers: {
      list: (search = '', limit = 100) => makeRequest(() => apiClient.get('/master/suppliers', { params: { search, limit } })),
      create: (data) => makeRequest(() => apiClient.post('/master/suppliers', data)),
      get: (id) => makeRequest(() => apiClient.get(`/master/suppliers/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/master/suppliers/${id}`, data)),
      delete: (id) => makeRequest(() => apiClient.delete(`/master/suppliers/${id}`)),
    },
  },

  // General Settings
  settings: {
    getGeneral: () => makeRequest(() => apiClient.get('/settings/general')),
    updateGeneral: (data) => makeRequest(() => apiClient.put('/settings/general', data)),
  },

  // Financial Management
  financial: {
    // Chart of Accounts
    accounts: {
      list: (params = {}) => makeRequest(() => apiClient.get('/financial/accounts', { params })),
      create: (data) => makeRequest(() => apiClient.post('/financial/accounts', data)),
      get: (id) => makeRequest(() => apiClient.get(`/financial/accounts/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/financial/accounts/${id}`, data)),
      delete: (id) => makeRequest(() => apiClient.delete(`/financial/accounts/${id}`)),
    },
    
    // Journal Entries
    journalEntries: {
      list: (params = {}) => makeRequest(() => apiClient.get('/financial/journal-entries', { params })),
      create: (data) => makeRequest(() => apiClient.post('/financial/journal-entries', data)),
      get: (id) => makeRequest(() => apiClient.get(`/financial/journal-entries/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/financial/journal-entries/${id}`, data)),
      post: (id) => makeRequest(() => apiClient.post(`/financial/journal-entries/${id}/post`)),
    },
    
    // Payments
    payments: {
      list: (params = {}) => makeRequest(() => apiClient.get('/financial/payments', { params })),
      create: (data) => makeRequest(() => apiClient.post('/financial/payments', data)),
      get: (id) => makeRequest(() => apiClient.get(`/financial/payments/${id}`)),
      update: (id, data) => makeRequest(() => apiClient.put(`/financial/payments/${id}`, data)),
    },
    
    // Reports
    reports: {
      trialBalance: (params = {}) => makeRequest(() => apiClient.get('/financial/reports/trial-balance', { params })),
      profitLoss: (params = {}) => makeRequest(() => apiClient.get('/financial/reports/profit-loss', { params })),
      balanceSheet: (params = {}) => makeRequest(() => apiClient.get('/financial/reports/balance-sheet', { params })),
    },
    
    // Settings
    settings: {
      get: () => makeRequest(() => apiClient.get('/financial/settings')),
      update: (data) => makeRequest(() => apiClient.post('/financial/settings', data)),
    },
    
    // Initialization
    initialize: () => makeRequest(() => apiClient.post('/financial/initialize')),
  },
  get: (endpoint, config = {}) => makeRequest(() => apiClient.get(endpoint, config)),
  post: (endpoint, data, config = {}) => makeRequest(() => apiClient.post(endpoint, data, config)),
  put: (endpoint, data, config = {}) => makeRequest(() => apiClient.put(endpoint, data, config)),
  delete: (endpoint, config = {}) => makeRequest(() => apiClient.delete(endpoint, config)),
};

export default api;