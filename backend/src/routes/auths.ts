import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
// POST /api/auth/register - Register new user
router.post('/register', register);

// POST /api/auth/login - Login user
router.post('/login', login);

// Protected routes (authentication required)
// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, getMe);

// PUT /api/auth/profile - Update user profile
router.put('/profile', requireAuth, updateProfile);

// POST /api/auth/change-password - Change user password
router.post('/change-password', requireAuth, changePassword);

export default router;