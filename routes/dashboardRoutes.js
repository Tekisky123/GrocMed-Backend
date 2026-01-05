import express from 'express';
import { getDashboardStats } from '../controller/dashboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require Admin Authentication
router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

export default router;
