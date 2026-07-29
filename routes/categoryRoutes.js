import express from 'express';
import {
    getAllCategoriesController,
    getProductsByCategoryController,
    getAllCategoriesAdminController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
} from '../controller/categoryController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/getAllCategories', getAllCategoriesController);
router.get('/getProductsByCategory/:category', getProductsByCategoryController);

// Admin protected routes
router.get('/admin/getAllCategories', authenticateToken, isAdmin, getAllCategoriesAdminController);
router.post('/admin', authenticateToken, isAdmin, upload.single('image'), createCategoryController);
router.put('/admin/:id', authenticateToken, isAdmin, upload.single('image'), updateCategoryController);
router.delete('/admin/:id', authenticateToken, isAdmin, deleteCategoryController);

export default router;
