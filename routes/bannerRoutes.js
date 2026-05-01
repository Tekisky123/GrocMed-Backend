import express from 'express';
import {
    getBanners,
    getAllBannersAdmin,
    createBanner,
    updateBanner,
    deleteBanner,
} from '../controller/bannerController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for Customer App
router.get('/', getBanners);

// Protected Admin routes
router.get('/admin', authenticateToken, isAdmin, getAllBannersAdmin);
router.post('/', authenticateToken, isAdmin, createBanner);
router.put('/:id', authenticateToken, isAdmin, updateBanner);
router.delete('/:id', authenticateToken, isAdmin, deleteBanner);

export default router;
