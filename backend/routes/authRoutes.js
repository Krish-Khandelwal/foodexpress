import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Ensure you have this middleware
import { 
  registerUser, 
  loginUser, 
  googleAuth, 
  getMyShop, 
  upsertMyShop 
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);

// Restaurant Owner routes
router.get('/my-shop', protect, getMyShop);
router.put('/my-shop', protect, upsertMyShop);

export default router;