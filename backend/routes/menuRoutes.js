import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getOwnerMenu,
  getAllMenu,
  getApprovedShops,
  getShopMenu,
  getMenuCategories,
} from '../controllers/menuController.js';

const router = express.Router();

router.get('/', getAllMenu);
router.get('/categories', getMenuCategories);
router.get('/shops', getApprovedShops);
router.get('/shops/:shopId/menu', getShopMenu);
router.get('/my-menu', protect, getOwnerMenu);
router.get('/owner', protect, getOwnerMenu);
router.post('/', protect, createMenuItem);
router.put('/:id', protect, updateMenuItem);
router.patch('/:id/toggle', protect, toggleMenuItemAvailability);
router.delete('/:id', protect, deleteMenuItem);

export default router;