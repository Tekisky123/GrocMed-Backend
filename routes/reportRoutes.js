import express from 'express';
import { downloadSalesReport } from '../controller/reportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require Admin Authentication
router.use(authenticateToken);

// Download sales report
router.get('/sales', downloadSalesReport);

export default router;
