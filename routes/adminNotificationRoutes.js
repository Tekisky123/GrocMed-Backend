import express from 'express';
import { sendNotification, getAllNotifications, getNotificationById, sendWhatsAppCampaign } from '../controller/adminNotificationController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected Routes (Admin)
router.post('/send', authenticateToken, sendNotification);
router.get('/all', authenticateToken, getAllNotifications);
router.post('/send-whatsapp-campaign', authenticateToken, isSuperAdmin, sendWhatsAppCampaign);
router.get('/:id', authenticateToken, getNotificationById);

export default router;
