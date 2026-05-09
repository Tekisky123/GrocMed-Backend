import express from 'express';
import {
    createDeliveryPartner,
    getAllDeliveryPartners,
    getDeliveryPartnerById,
    updateDeliveryPartner,
    deleteDeliveryPartner,
    loginDeliveryPartner,
    updateFcmToken,
    getAssignedOrders,
    getDashboardStats,
    getNotifications,
    getPartnerProfile,
    updateOrderStatusWithScreenshot,
} from '../controller/deliveryPartnerController.js';
import { authenticateToken, isAdmin, isDeliveryPartner } from '../middleware/authMiddleware.js';
import { validateCreateDeliveryPartner, validateUpdateDeliveryPartner } from '../middleware/validationMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public Routes
router.post('/loginDeliveryPartner', loginDeliveryPartner);

// Admin Only Routes
router.post('/createDeliveryPartner', authenticateToken, isAdmin, validateCreateDeliveryPartner, createDeliveryPartner);
router.get('/getAllDeliveryPartners', authenticateToken, isAdmin, getAllDeliveryPartners);
router.get('/getDeliveryPartnerById/:id', authenticateToken, isAdmin, getDeliveryPartnerById);
router.put('/updateDeliveryPartner/:id', authenticateToken, isAdmin, validateUpdateDeliveryPartner, updateDeliveryPartner);
router.delete('/deleteDeliveryPartner/:id', authenticateToken, isAdmin, deleteDeliveryPartner);

// Partner Only Routes
router.post('/update-fcm-token', authenticateToken, isDeliveryPartner, updateFcmToken);
router.get('/assigned-orders', authenticateToken, isDeliveryPartner, getAssignedOrders);
router.get('/dashboard-stats', authenticateToken, isDeliveryPartner, getDashboardStats);
router.get('/notifications', authenticateToken, isDeliveryPartner, getNotifications);
router.get('/profile', authenticateToken, isDeliveryPartner, getPartnerProfile);
router.put('/update-order-status/:id', authenticateToken, isDeliveryPartner, updateOrderStatusWithScreenshot);

export default router;
