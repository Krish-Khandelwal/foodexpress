import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');

    if (!token || token === 'null' || token === 'undefined') {
      const userInfo = localStorage.getItem('userInfo') || localStorage.getItem('user');
      if (userInfo) {
        try {
          const parsed = JSON.parse(userInfo);
          token = parsed?.token;
        } catch {
          token = null;
        }
      }
    }

    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;