import express from 'express';
import {
    addToCart,
    getCart,
    removeFromCart,
} from '../controller/cartController.js';
import { authenticateToken, isCustomer } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart routes require customer authentication
router.post('/add', authenticateToken, isCustomer, addToCart);
router.get('/', authenticateToken, isCustomer, getCart);
router.delete('/remove/:productId', authenticateToken, isCustomer, removeFromCart);

export default router;
