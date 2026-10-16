import express from 'express';
import { getPendingVendors, updateVendorStatus } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect, restrictTo('ADMIN'));

router.get('/vendors/pending', getPendingVendors);
router.put('/vendors/:shopId/status', updateVendorStatus);

export default router;