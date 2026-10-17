import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getPendingVendors, 
  updateVendorStatus, 
  getDashboardStats, 
  createAdmin 
} from '../controllers/adminController.js';

const router = express.Router();

// You can add an 'admin' middleware next to 'protect' if you have created one
router.get('/pending-vendors', protect, getPendingVendors);
router.put('/vendor-status/:id', protect, updateVendorStatus);
router.get('/stats', protect, getDashboardStats);
router.post('/init', createAdmin);

export default router;