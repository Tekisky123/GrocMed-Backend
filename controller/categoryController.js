import {
    getAllCategoriesService,
    getProductsByCategoryService,
} from '../services/categoryService.js';

export const getAllCategoriesController = async (req, res, next) => {
    try {
        const categories = await getAllCategoriesService();
        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductsByCategoryController = async (req, res, next) => {
    try {
        const { category } = req.params;
        const products = await getProductsByCategoryService(category);

        res.status(200).json({
            success: true,
            message: `Products for category '${category}' retrieved successfully`,
            count: products.length,
            data: products,
        });
    } catch (error) {
        next(error);
    }
};
