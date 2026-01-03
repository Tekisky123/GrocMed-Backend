import express from 'express';
import {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    searchOrders,
} from '../controller/adminOrderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require Admin Authentication
router.use(authenticateToken);

router.get('/getAllOrders', getAllOrders);
router.get('/search', searchOrders);
router.get('/getOrderById/:id', getOrderById);
router.put('/updateStatus/:id', updateOrderStatus);

export default router;
