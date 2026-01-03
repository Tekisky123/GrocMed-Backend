import express from 'express';
import {
    addToCart,
    getCart,
    removeFromCart,
} from '../controller/cartController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart routes require customer authentication
router.post('/add', authenticateToken, addToCart);
router.get('/', authenticateToken, getCart);
router.delete('/remove/:productId', authenticateToken, removeFromCart);

export default router;
