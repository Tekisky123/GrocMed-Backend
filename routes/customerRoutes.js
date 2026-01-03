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
import { authenticateToken } from '../middleware/authMiddleware.js';
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
router.get('/profile', authenticateToken, getCustomerProfile);
router.put('/profile', authenticateToken, validateUpdateCustomer, updateCustomerProfile);
router.post('/update-fcm-token', authenticateToken, updateFcmToken);

// Admin Routes for Customer Management
// Admin Routes for Customer Management
router.get('/getAllCustomers', authenticateToken, getAllCustomers);
router.get('/search', authenticateToken, searchCustomers);
router.get('/getCustomerById/:id', authenticateToken, getCustomerProfile);
router.delete('/deleteCustomer/:id', authenticateToken, deleteCustomer);

export default router;
