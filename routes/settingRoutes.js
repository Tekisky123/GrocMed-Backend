import express from 'express';
import { getSettings, updateSettings } from '../controller/settingController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicly available to query constraints instantly
router.get('/', getSettings);

// Protected update route (Admin only)
router.put('/', authenticateToken, updateSettings);

export default router;
