import express from 'express';
import {
  createAdminController,
  getAllAdminsController,
  getAdminByIdController,
  updateAdminController,
  deleteAdminController,
  loginAdminController,
} from '../controller/adminController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateCreateAdmin, validateLogin } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public route - Login (no authentication required)
router.post('/loginAdmin', validateLogin, loginAdminController);

// Protected routes - All require authentication
// Create admin
router.post('/createAdmin', authenticateToken, validateCreateAdmin, createAdminController);

// Get all admins
router.get('/getAllAdmins', authenticateToken, getAllAdminsController);

// Get admin by ID
router.get('/getAdminById/:id', authenticateToken, getAdminByIdController);

// Update admin
router.put('/updateAdmin/:id', authenticateToken, updateAdminController);

// Delete admin
router.delete('/deleteAdmin/:id', authenticateToken, deleteAdminController);

export default router;

