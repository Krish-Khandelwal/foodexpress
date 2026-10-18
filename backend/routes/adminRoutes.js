import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getPendingVendors,
  updateVendorStatus,
  getDashboardStats,
  createAdmin,
  getCategories,
  addCategory,
  deleteCategory,
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/pending-vendors', protect, restrictTo('admin'), getPendingVendors);
router.put('/vendor-status/:id', protect, restrictTo('admin'), updateVendorStatus);
router.get('/stats', protect, restrictTo('admin'), getDashboardStats);
router.get('/categories', getCategories);
router.post('/categories', protect, restrictTo('admin'), addCategory);
router.delete('/categories/:id', protect, restrictTo('admin'), deleteCategory);
router.post('/init', createAdmin);

export default router;