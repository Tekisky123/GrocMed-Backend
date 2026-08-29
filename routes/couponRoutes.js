import express from 'express';
import {
  createCoupon,
  getAllCoupons,
  toggleCouponStatus,
  deleteCoupon,
  applyCoupon,
  getAvailableCoupons,
} from '../controller/couponController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin Routes
router.post('/create', authenticateToken, isAdmin, createCoupon);
router.get('/all', authenticateToken, isAdmin, getAllCoupons);
router.put('/toggle/:id', authenticateToken, isAdmin, toggleCouponStatus);
router.delete('/:id', authenticateToken, isAdmin, deleteCoupon);

// Customer Routes
router.post('/apply', authenticateToken, applyCoupon);
router.get('/available', getAvailableCoupons);

export default router;
