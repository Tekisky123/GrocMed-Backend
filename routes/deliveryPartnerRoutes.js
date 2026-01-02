import express from 'express';
import {
    createDeliveryPartner,
    getAllDeliveryPartners,
    getDeliveryPartnerById,
    updateDeliveryPartner,
    deleteDeliveryPartner,
} from '../controller/deliveryPartnerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateCreateDeliveryPartner, validateUpdateDeliveryPartner } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Protected Routes (Admin only)
router.post('/createDeliveryPartner', authenticateToken,  validateCreateDeliveryPartner, createDeliveryPartner);
router.get('/getAllDeliveryPartners', authenticateToken,  getAllDeliveryPartners);
router.get('/getDeliveryPartnerById/:id', authenticateToken, getDeliveryPartnerById);
router.put('/updateDeliveryPartner/:id', authenticateToken, validateUpdateDeliveryPartner, updateDeliveryPartner);
router.delete('/deleteDeliveryPartner/:id', authenticateToken, deleteDeliveryPartner);

export default router;
