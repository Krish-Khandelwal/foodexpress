import api from './axios';

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const googleAuth = (tokenData) => api.post('/auth/google', tokenData);
export const getMyShop = () => api.get('/auth/my-shop');
export const upsertMyShop = (shopData) => api.put('/auth/my-shop', shopData);