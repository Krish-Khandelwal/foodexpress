import express from 'express';
import { 
  getApprovedShops, 
  getShopMenu, 
  getOwnerMenu, 
  createMenuItem, 
  deleteMenuItem, 
  toggleMenuItemAvailability 
} from '../controllers/menuController.js';
import { protect, restrictTo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public Customer routes
router.get('/shops', getApprovedShops);
router.get('/shops/:shopId/menu', getShopMenu);

// Restaurant Owner routes
router.get('/owner', protect, restrictTo('OWNER'), getOwnerMenu);
router.post('/', protect, restrictTo('OWNER'), createMenuItem);
router.delete('/:id', protect, restrictTo('OWNER'), deleteMenuItem);
router.patch('/:id/toggle', protect, restrictTo('OWNER'), toggleMenuItemAvailability);

export default router;