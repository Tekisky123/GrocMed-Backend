import express from 'express';
import {
  createProductController,
  getAllProductsController,
  getAllProductsForAdminController,
  getProductByIdController,
  getProductByIdForAdminController,
  updateProductController,
  deleteProductController,
  deleteProductImageController,
} from '../controller/productController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateCreateProduct, validateUpdateProduct } from '../middleware/validationMiddleware.js';
import { uploadMultipleImages } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes - No authentication required
// Get all products (only active products)
router.get('/getAllProducts', getAllProductsController);

// Get product by ID (only active products)
router.get('/getProductById/:id', getProductByIdController);

// Protected routes - All require authentication
// Create product
router.post(
  '/createProduct',
  authenticateToken,
  uploadMultipleImages,
  validateCreateProduct,
  createProductController
);

// Get all products for admin (includes inactive)
router.get('/getAllProductsForAdmin', authenticateToken, getAllProductsForAdminController);

// Get product by ID for admin (includes inactive)
router.get('/getProductByIdForAdmin/:id', authenticateToken, getProductByIdForAdminController);

// Update product
router.put(
  '/updateProduct/:id',
  authenticateToken,
  uploadMultipleImages,
  validateUpdateProduct,
  updateProductController
);

// Delete product
router.delete('/deleteProduct/:id', authenticateToken, deleteProductController);

// Delete product image
router.delete('/deleteProductImage/:id', authenticateToken, deleteProductImageController);

export default router;

