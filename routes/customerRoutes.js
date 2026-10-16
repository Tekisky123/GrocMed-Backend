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
    getCustomerNotifications,
    adminUpdateCustomerPassword,
} from '../controller/customerController.js';
import { authenticateToken, isCustomer, isAdmin } from '../middleware/authMiddleware.js';
import {
    validateRegisterCustomer,
    validateLoginCustomer,
    validateUpdateCustomer
} from '../middleware/validationMiddleware.js';

import { upload } from '../middleware/uploadMiddleware.js';

import {
    sendResetOtpController,
    verifyResetOtpController,
    resetPasswordController,
} from '../controller/passwordResetController.js';

const router = express.Router();

// Public Routes
router.post(
    '/register', 
    upload.fields([
        { name: 'adhaarImage', maxCount: 1 }, 
        { name: 'licenseImage', maxCount: 1 }
    ]), 
    validateRegisterCustomer, 
    registerCustomer
);
router.post('/login', validateLoginCustomer, loginCustomer);

// Password Reset Routes (WhatsApp OTP)
router.post('/forgot-password/send-otp', sendResetOtpController('customer'));
router.post('/forgot-password/verify-otp', verifyResetOtpController('customer'));
router.post('/forgot-password/reset-password', resetPasswordController('customer'));

// Protected Customer Routes
router.post('/logout', authenticateToken, logoutCustomer);
router.get('/profile', authenticateToken, isCustomer, getCustomerProfile);
router.put('/profile', authenticateToken, isCustomer, validateUpdateCustomer, updateCustomerProfile);
router.post('/update-fcm-token', authenticateToken, isCustomer, updateFcmToken);
router.get('/notifications', authenticateToken, isCustomer, getCustomerNotifications);

// Admin Routes for Customer Management
router.get('/getAllCustomers', authenticateToken, isAdmin, getAllCustomers);
router.get('/search', authenticateToken, isAdmin, searchCustomers);
router.get('/getCustomerById/:id', authenticateToken, isAdmin, getCustomerProfile);
router.delete('/deleteCustomer/:id', authenticateToken, isAdmin, deleteCustomer);
router.put('/admin/updateCustomerPassword/:id', authenticateToken, isAdmin, adminUpdateCustomerPassword);

export default router;
