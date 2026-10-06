import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: attach accessToken from cookies or localStorage if available
apiClient.interceptors.request.use(
  (config) => {
    let token = Cookies.get('auth_token');
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token') || undefined;
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: unwraps the { success: true, data } envelope into response.data
apiClient.interceptors.response.use(
  (response) => {
    // If our backend returns { success: true, data: ... }, extract the data into response.data
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear auth cookies with root path and clear localStorage
      Cookies.remove('auth_token', { path: '/' });
      Cookies.remove('auth_user', { path: '/' });
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch {
        // Ignore localStorage errors
      }
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
