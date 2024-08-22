import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [preferredManufacturers, setPreferredManufacturers] = useState([]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/user/me');
        setUser(response.data);
        setIsAuthenticated(true);
        setIsAdmin(response.data.isAdmin);
        setPreferredManufacturers(response.data.preferredManufacturers || []);
      } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        setPreferredManufacturers([]);
      }
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      setPreferredManufacturers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(user.isAdmin);
      setPreferredManufacturers(user.preferredManufacturers || []);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setPreferredManufacturers([]);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isAdmin, 
      loading, 
      user, 
      preferredManufacturers, 
      login, 
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);