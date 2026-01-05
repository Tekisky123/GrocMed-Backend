import express from 'express';
import {
    createDeliveryPartner,
    getAllDeliveryPartners,
    getDeliveryPartnerById,
    updateDeliveryPartner,
    deleteDeliveryPartner,
    loginDeliveryPartner,
    updateFcmToken,
} from '../controller/deliveryPartnerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateCreateDeliveryPartner, validateUpdateDeliveryPartner } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public Routes
router.post('/loginDeliveryPartner', loginDeliveryPartner);

// Protected Routes (Admin or Partner)
router.post('/createDeliveryPartner', authenticateToken, validateCreateDeliveryPartner, createDeliveryPartner);
router.get('/getAllDeliveryPartners', authenticateToken, getAllDeliveryPartners);
router.get('/getDeliveryPartnerById/:id', authenticateToken, getDeliveryPartnerById);
router.put('/updateDeliveryPartner/:id', authenticateToken, validateUpdateDeliveryPartner, updateDeliveryPartner);
router.delete('/deleteDeliveryPartner/:id', authenticateToken, deleteDeliveryPartner);
router.post('/update-fcm-token', authenticateToken, updateFcmToken);

export default router;
