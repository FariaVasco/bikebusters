import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api', // adjust this to your API URL
});

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');
  
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // convert to milliseconds
    const currentTime = Date.now();

    if (expirationTime - currentTime < 5 * 60 * 1000) { // less than 5 minutes left
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('http://localhost:5001/api/auth/refresh-token', { refreshToken });
        token = response.data.token;
        localStorage.setItem('token', token);
      } catch (error) {
        console.error('Error refreshing token:', error);
        // Handle refresh token failure (e.g., logout user)
      }
    }

    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;