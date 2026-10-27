import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const token = parsed?.accessToken || parsed?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        localStorage.removeItem('userInfo');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const storedUser = localStorage.getItem('userInfo');
        if (!storedUser) throw new Error('No stored session');

        const parsed = JSON.parse(storedUser);
        if (!parsed?.refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: parsed.refreshToken,
        });

        const updatedUser = {
          ...parsed,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          token: data.accessToken,
        };

        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('userInfo');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;