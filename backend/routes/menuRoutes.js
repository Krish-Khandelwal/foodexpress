import express from 'express';
import multer from 'multer';
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

// Store uploaded file in memory buffer so it can be uploaded directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.get('/', getAllMenu);
router.get('/categories', getMenuCategories);
router.get('/shops', getApprovedShops);
router.get('/shops/:shopId/menu', getShopMenu);
router.get('/my-menu', protect, getOwnerMenu);
router.get('/owner', protect, getOwnerMenu);
router.post('/', protect, upload.single('image'), createMenuItem);
router.put('/:id', protect, upload.single('image'), updateMenuItem);
router.patch('/:id/toggle', protect, toggleMenuItemAvailability);
router.delete('/:id', protect, deleteMenuItem);

export default router;