import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
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

// Ensure backend/public directory exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Step 1: Save uploaded food image to backend/public folder first
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, publicDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `food-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
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