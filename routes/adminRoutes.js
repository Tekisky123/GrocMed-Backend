import express from 'express';
import {
  createAdminController,
  getAllAdminsController,
  getAdminByIdController,
  updateAdminController,
  deleteAdminController,
  loginAdminController,
  exportProductsBackupController,
  exportOrdersBackupController,
  exportCustomersBackupController,
} from '../controller/adminController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/authMiddleware.js';
import { validateCreateAdmin, validateLogin } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public route - Login (no authentication required)
router.post('/loginAdmin', validateLogin, loginAdminController);

// Protected routes - All require authentication and super_admin privileges
// Create admin
router.post('/createAdmin', authenticateToken, isSuperAdmin, validateCreateAdmin, createAdminController);

// Get all admins
router.get('/getAllAdmins', authenticateToken, isSuperAdmin, getAllAdminsController);

// Get admin by ID
router.get('/getAdminById/:id', authenticateToken, isSuperAdmin, getAdminByIdController);

// Update admin
router.put('/updateAdmin/:id', authenticateToken, isSuperAdmin, updateAdminController);

// Delete admin
router.delete('/deleteAdmin/:id', authenticateToken, isSuperAdmin, deleteAdminController);

// Database CSV Backups
router.get('/exportProducts', authenticateToken, isSuperAdmin, exportProductsBackupController);
router.get('/exportOrders', authenticateToken, isSuperAdmin, exportOrdersBackupController);
router.get('/exportCustomers', authenticateToken, isSuperAdmin, exportCustomersBackupController);

export default router;

