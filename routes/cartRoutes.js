import express from 'express';
import {
    addToCart,
    getCart,
    removeFromCart,
    clearCart,
} from '../controller/cartController.js';
import { authenticateToken, isCustomer } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart routes require customer authentication
router.post('/add', authenticateToken, isCustomer, addToCart);
router.get('/', authenticateToken, isCustomer, getCart);
router.delete('/remove/:productId', authenticateToken, isCustomer, removeFromCart);
router.delete('/clear', authenticateToken, isCustomer, clearCart);

export default router;
