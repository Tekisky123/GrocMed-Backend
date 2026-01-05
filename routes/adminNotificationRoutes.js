import express from 'express';
import { sendNotification, getAllNotifications, getNotificationById } from '../controller/adminNotificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected Routes (Admin)
router.post('/send', authenticateToken, sendNotification);
router.get('/all', authenticateToken, getAllNotifications);
router.get('/:id', authenticateToken, getNotificationById);

export default router;
