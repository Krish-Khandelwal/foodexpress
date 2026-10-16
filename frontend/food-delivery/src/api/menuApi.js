import api from './axios';

export const getApprovedShops = () => api.get('/menu/shops');
export const getShopMenu = (shopId) => api.get(`/menu/shops/${shopId}/menu`);
export const getOwnerMenu = () => api.get('/menu/owner');
export const createMenuItem = (data) => api.post('/menu', data);
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`);
export const toggleMenuItemAvailability = (id) => api.patch(`/menu/${id}/toggle`);