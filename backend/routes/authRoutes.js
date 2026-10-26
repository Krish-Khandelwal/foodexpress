import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerUser,
  loginUser,
  googleAuth,
  getGoogleConfig,
  refreshAccessToken,
  logoutUser,
  getMyShop,
  upsertMyShop,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/google-config', getGoogleConfig);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', protect, logoutUser);

// Restaurant Owner routes
router.get('/my-shop', protect, getMyShop);
router.put('/my-shop', protect, upsertMyShop);

export default router;