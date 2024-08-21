import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('Interceptor - token from localStorage:', token);
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    console.log('Sending request with Authorization header:', config.headers['Authorization']);
  } else {
    console.log('No token found in localStorage');
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add this response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      console.log('Token is invalid or expired. Clearing localStorage...');
      localStorage.removeItem('token');
      // You might want to redirect to login page or refresh the token here
    }
    return Promise.reject(error);
  }
);

export default api;