import express from 'express';
import {
    placeOrder,
    getMyOrders,
    getOrderById,
    trackOrder,
} from '../controller/orderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All order routes require customer authentication
router.post('/placeOrder', authenticateToken, placeOrder);
router.get('/myOrders', authenticateToken, getMyOrders);
router.get('/:id', authenticateToken, getOrderById);
router.get('/track/:id', authenticateToken, trackOrder);

export default router;
