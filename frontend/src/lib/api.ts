import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://wsms-1.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      Cookies.remove('token');
      // If we are not already on the login page, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response && error.response.status === 403) {
      Cookies.remove('token');
      localStorage.clear();
      const reason = error.response.data?.message || 'Subscription Expired';
      // Only redirect if not already on the subscription expired page
      if (window.location.pathname !== '/subscription-expired') {
        window.location.href = `/subscription-expired?reason=${encodeURIComponent(reason)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
