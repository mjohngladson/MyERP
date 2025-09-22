import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useApi = (apiCall, dependencies = [], initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiCall();
        const normalized = (response && response.data !== undefined) ? response.data : response;
        setData(normalized);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      const normalized = (response && response.data !== undefined) ? response.data : response;
      setData(normalized);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.auth.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.auth.login(credentials);
      localStorage.setItem('auth_token', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
      localStorage.removeItem('auth_token');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return { user, loading, login, logout };
};