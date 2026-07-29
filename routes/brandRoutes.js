import express from 'express';
import {
  getAllBrandsController,
  getAllBrandsAdminController,
  createBrandController,
  updateBrandController,
  deleteBrandController,
} from '../controller/brandController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (for dropdowns, etc.)
router.get('/getAllBrands', getAllBrandsController);

// Admin protected routes
router.get('/admin/getAllBrands', authenticateToken, isAdmin, getAllBrandsAdminController);
router.post('/admin', authenticateToken, isAdmin, createBrandController);
router.put('/admin/:id', authenticateToken, isAdmin, updateBrandController);
router.delete('/admin/:id', authenticateToken, isAdmin, deleteBrandController);

export default router;
