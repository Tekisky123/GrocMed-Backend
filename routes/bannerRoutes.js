import express from 'express';
import {
    getBanners,
    getAllBannersAdmin,
    createBanner,
    updateBanner,
    deleteBanner,
} from '../controller/bannerController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for Customer App
router.get('/', getBanners);

// Protected Admin routes (Super Admin only)
router.get('/admin', authenticateToken, isSuperAdmin, getAllBannersAdmin);
router.post('/', authenticateToken, isSuperAdmin, createBanner);
router.put('/:id', authenticateToken, isSuperAdmin, updateBanner);
router.delete('/:id', authenticateToken, isSuperAdmin, deleteBanner);

export default router;
