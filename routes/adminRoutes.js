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
router.get('/exportProducts', authenticateToken, exportProductsBackupController);
router.get('/exportOrders', authenticateToken, exportOrdersBackupController);
router.get('/exportCustomers', authenticateToken, exportCustomersBackupController);

// Database JSON Backup & Restore
import { 
  exportAllDataController, 
  restoreAllDataController,
  exportS3BackupController,
  listS3BackupsController,
  restoreS3BackupController,
  deleteS3BackupController
} from '../controller/backupController.js';

router.post('/backup/export', authenticateToken, isSuperAdmin, exportAllDataController);
router.post('/backup/restore', authenticateToken, isSuperAdmin, restoreAllDataController);

// AWS S3 Database Backup & Restore
router.post('/backup/s3/create', authenticateToken, isSuperAdmin, exportS3BackupController);
router.get('/backup/s3/list', authenticateToken, isSuperAdmin, listS3BackupsController);
router.post('/backup/s3/restore', authenticateToken, isSuperAdmin, restoreS3BackupController);
router.delete('/backup/s3/delete', authenticateToken, isSuperAdmin, deleteS3BackupController);

export default router;


