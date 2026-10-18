import api from './axios';

export const createRazorpayOrder = (amount) => api.post('/orders/create-razorpay-order', { amount });
export const createOrder = (orderData) => api.post('/orders', orderData);
export const getOrderById = (orderId) => api.get(`/orders/${orderId}`);
export const getCustomerOrders = () => api.get('/orders/my-orders');
export const getOwnerOrders = () => api.get('/orders/owner-orders');
export const getRiderOrders = () => api.get('/orders/rider/available');
export const updateOrderStatus = (orderId, data) => api.put(`/orders/${orderId}/status`, data);
export const acceptDelivery = (orderId) => api.put(`/orders/${orderId}/accept-delivery`);
export const verifyPickupOtp = (orderId, otp) => api.post(`/orders/${orderId}/verify-pickup-otp`, { otp });
export const verifyDeliveryOtp = (orderId, otp) => api.post(`/orders/${orderId}/verify-delivery-otp`, { otp });