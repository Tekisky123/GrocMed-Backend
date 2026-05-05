import express from 'express';
import {
    placeOrder,
    getMyOrders,
    getOrderById,
    trackOrder,
} from '../controller/orderController.js';
import { downloadInvoice } from '../controller/invoiceController.js';
import { authenticateToken, isCustomer } from '../middleware/authMiddleware.js';

const router = express.Router();

// All order routes require customer authentication
router.post('/placeOrder', authenticateToken, isCustomer, placeOrder);
router.get('/myOrders', authenticateToken, isCustomer, getMyOrders);
router.get('/:id', authenticateToken, isCustomer, getOrderById);
router.get('/:id/invoice', authenticateToken, downloadInvoice);
router.get('/track/:id', authenticateToken, isCustomer, trackOrder);

export default router;
