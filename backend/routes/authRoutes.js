import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerUser,
  loginUser,
  googleAuth,
  getCurrentUser,
  refreshAccessToken,
  logoutUser,
  getMyShop,
  upsertMyShop,
  updateUserProfile,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logoutUser);

router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateUserProfile);

router.get('/my-shop', protect, getMyShop);
router.put('/my-shop', protect, upsertMyShop);

export default router;