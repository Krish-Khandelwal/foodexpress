import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach Access Token to every outgoing request
API.interceptors.request.use(
  (config) => {
    const rawUser = localStorage.getItem('userInfo');
    if (rawUser) {
      try {
        const userInfo = JSON.parse(rawUser);
        const token = userInfo?.accessToken || userInfo?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // ignore JSON parse error
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatically use Refresh Token if Access Token expires (401)
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/auth/login') &&
      !originalRequest?.url?.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const rawUser = localStorage.getItem('userInfo');
        const userInfo = rawUser ? JSON.parse(rawUser) : null;

        if (userInfo?.refreshToken) {
          const { data } = await axios.post(
            'http://localhost:5000/api/auth/refresh-token',
            { refreshToken: userInfo.refreshToken }
          );

          const updatedUser = {
            ...userInfo,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            token: data.accessToken,
          };

          localStorage.setItem('userInfo', JSON.stringify(updatedUser));
          localStorage.setItem('token', data.accessToken);

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;