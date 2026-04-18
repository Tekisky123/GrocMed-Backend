 import express from 'express';
import {
    registerCustomer,
    loginCustomer,
    logoutCustomer,
    getAllCustomers,
    getCustomerProfile,
    updateCustomerProfile,
    deleteCustomer,
    updateFcmToken,
    searchCustomers,
} from '../controller/customerController.js';
import { authenticateToken, isCustomer, isAdmin } from '../middleware/authMiddleware.js';
import {
    validateRegisterCustomer,
    validateLoginCustomer,
    validateUpdateCustomer
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public Routes
router.post('/register', validateRegisterCustomer, registerCustomer);
router.post('/login', validateLoginCustomer, loginCustomer);

// Protected Customer Routes
router.post('/logout', authenticateToken, logoutCustomer);
router.get('/profile', authenticateToken, isCustomer, getCustomerProfile);
router.put('/profile', authenticateToken, isCustomer, validateUpdateCustomer, updateCustomerProfile);
router.post('/update-fcm-token', authenticateToken, isCustomer, updateFcmToken);

// Admin Routes for Customer Management
router.get('/getAllCustomers', authenticateToken, isAdmin, getAllCustomers);
router.get('/search', authenticateToken, isAdmin, searchCustomers);
router.get('/getCustomerById/:id', authenticateToken, isAdmin, getCustomerProfile);
router.delete('/deleteCustomer/:id', authenticateToken, isAdmin, deleteCustomer);

export default router;
