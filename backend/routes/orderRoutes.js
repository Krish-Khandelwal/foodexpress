import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createRazorpayOrder,
  createOrder,
  getCustomerOrders,
  getOwnerOrders,
  getRiderOrders,
  getOrderById,
  updateOrderStatusByOwner,
  acceptDeliveryByRider,
  verifyPickupOtpByOwner,
  verifyDeliveryOtpByRider
} from '../controllers/orderController.js';

const router = express.Router();

router.post('/create-razorpay-order', protect, createRazorpayOrder);
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getCustomerOrders);
router.get('/owner-orders', protect, getOwnerOrders);
router.get('/rider/available', protect, getRiderOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, updateOrderStatusByOwner);
router.put('/:id/accept-delivery', protect, acceptDeliveryByRider);
router.post('/:id/verify-pickup-otp', protect, verifyPickupOtpByOwner);
router.post('/:id/verify-delivery-otp', protect, verifyDeliveryOtpByRider);

export default router;