import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOwnerMenu,
  getAllMenu
} from '../controllers/menuController.js';

const router = express.Router();

router.get('/', getAllMenu);
router.get('/my-menu', protect, getOwnerMenu);
router.post('/', protect, createMenuItem);
router.put('/:id', protect, updateMenuItem);
router.delete('/:id', protect, deleteMenuItem);

export default router;