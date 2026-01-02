import express from 'express';
import {
    getAllCategoriesController,
    getProductsByCategoryController,
} from '../controller/categoryController.js';

const router = express.Router();

// Public Routes
// Get all unique categories with representative image
router.get('/getAllCategories', getAllCategoriesController);

// Get products by specific category
router.get('/getProductsByCategory/:category', getProductsByCategoryController);

export default router;
