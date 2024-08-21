import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    console.error('Error decoding token:', e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [preferredManufacturers, setPreferredManufacturers] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const decodedToken = decodeToken(token);
          if (decodedToken && decodedToken.user) {
            setUser(decodedToken.user);
            setIsAuthenticated(true);
            setIsAdmin(decodedToken.user.isAdmin || false);
          
            // Fetch user details including preferredManufacturers
            const response = await api.get('/user/me');
            setPreferredManufacturers(response.data.preferredManufacturers || []);
          } else {
            throw new Error('Invalid token');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      
      if (response.data && response.data.token) {
        const { token, isAdmin, preferredManufacturers } = response.data;
        
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const decodedToken = decodeToken(token);
        if (decodedToken && decodedToken.user) {
          const userData = decodedToken.user;

          setUser(userData);
          setIsAuthenticated(true);
          setIsAdmin(isAdmin);
          setPreferredManufacturers(preferredManufacturers || []);

          return userData;
        } else {
          throw new Error('Invalid token in login response');
        }
      } else {
        throw new Error('Invalid login response: missing token');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.msg || error.message || 'Login failed. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setPreferredManufacturers([]);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isAdmin, 
      loading, 
      user, 
      preferredManufacturers, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);