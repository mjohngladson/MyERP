import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Demo users for authentication
  const demoUsers = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@gili.com',
      role: 'System Manager',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      department: 'Administration',
      phone: '+91 9876543210',
      address: '123 Business Street, Mumbai, Maharashtra',
      joining_date: '2023-01-15',
      bio: 'Experienced ERP system administrator with expertise in business process optimization.'
    },
    {
      id: '2',
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'Sales Manager',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      department: 'Sales',
      phone: '+91 9876543211',
      address: '456 Sales Street, Delhi, Delhi',
      joining_date: '2023-03-20',
      bio: 'Dynamic sales professional with proven track record in B2B sales and client relationship management.'
    },
    {
      id: '3',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'Purchase Manager',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b5dc2e65?w=150&h=150&fit=crop&crop=face',
      department: 'Purchase',
      phone: '+91 9876543212',
      address: '789 Purchase Lane, Bangalore, Karnataka',
      joining_date: '2023-02-10',
      bio: 'Strategic procurement specialist focused on vendor management and cost optimization.'
    }
  ];

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      
      console.log('🔐 Attempting login with Railway backend...');
      
      // Get backend URL with proper fallbacks for Railway environment
      const getBackendUrl = () => {
        // Try different environment variable access methods
        if (typeof import !== 'undefined' && import.meta && import.meta.env) {
          return import.meta.env.REACT_APP_BACKEND_URL;
        }
        if (typeof process !== 'undefined' && process.env) {
          return process.env.REACT_APP_BACKEND_URL;
        }
        if (typeof window !== 'undefined' && window.env) {
          return window.env.REACT_APP_BACKEND_URL;
        }
        // Railway production fallback
        return 'https://myerp-production.up.railway.app';
      };
      
      const backendUrl = getBackendUrl();
      console.log('🌐 Using backend URL:', backendUrl);
      
      // Make actual API call to Railway backend
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });
      
      const data = await response.json();
      console.log('🚀 Railway backend response:', data);
      
      if (!response.ok) {
        const errorMessage = data.detail || data.message || 'Login failed';
        console.error('❌ Login failed:', errorMessage);
        return { success: false, error: errorMessage };
      }
      
      if (!data.user || !data.token) {
        console.error('❌ Invalid response format:', data);
        return { success: false, error: 'Invalid server response' };
      }
      
      // Store auth data from Railway backend response
      const { user, token } = data;
      
      // Ensure user object has all required fields with defaults
      const validatedUser = {
        id: user.id || '1',
        name: user.name || 'Unknown User',
        email: user.email || credentials.email,
        role: user.role || 'User',
        avatar: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        department: 'Administration',
        phone: '+91 9876543210',
        address: '123 Business Street, Mumbai, Maharashtra',
        joining_date: '2023-01-15',
        company_id: user.company_id || 'default_company',
        created_at: user.created_at || new Date().toISOString()
      };
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(validatedUser));
      
      setUser(validatedUser);
      setIsAuthenticated(true);
      
      console.log('✅ Login successful with Railway backend');
      return { success: true, user: validatedUser };
      
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message || 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedUser = { ...user, ...profileData };
      
      // Update stored user data
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateProfile,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};