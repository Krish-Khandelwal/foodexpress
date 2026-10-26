import API from './axios';

export const loginUser = (credentials) => API.post('/auth/login', credentials);

export const registerUser = (userData) => API.post('/auth/register', userData);

export const googleAuthLogin = (googleData) => API.post('/auth/google', googleData);

export const getMyShop = () => API.get('/auth/my-shop');

export const upsertMyShop = (shopData) => API.put('/auth/my-shop', shopData);

export const updateProfile = (userData) => API.put('/auth/profile', userData);

export default {
  loginUser,
  registerUser,
  googleAuthLogin,
  getMyShop,
  upsertMyShop,
  updateProfile,
};