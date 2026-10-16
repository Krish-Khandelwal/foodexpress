import express from 'express';
import { createOrder, updateOrderStatus } from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, restrictTo('USER'), createOrder);
router.put('/:orderId/status', protect, restrictTo('OWNER', 'DELIVERY_BOY'), updateOrderStatus);

export default router;