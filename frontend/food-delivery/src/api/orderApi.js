import api from './axios';

export const createOrder = (orderData) => api.post('/orders', orderData);
export const getOrderById = (orderId) => api.get(`/orders/${orderId}`);
export const updateOrderStatus = (orderId, data) => api.put(`/orders/${orderId}/status`, data);