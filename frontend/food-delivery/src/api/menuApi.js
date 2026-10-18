import api from './axios';

export const getAllMenu = () => api.get('/menu');
export const getApprovedShops = () => api.get('/menu/shops');
export const getShopMenu = (shopId) => api.get(`/menu/shops/${shopId}/menu`);
export const getOwnerMenu = () => api.get('/menu/my-menu');
export const createMenuItem = (data) => api.post('/menu', data);
export const updateMenuItem = (id, data) => api.put(`/menu/${id}`, data);
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`);
export const toggleMenuItemAvailability = (id) => api.patch(`/menu/${id}/toggle`);