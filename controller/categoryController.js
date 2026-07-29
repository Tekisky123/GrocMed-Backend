import {
    getAllCategoriesService,
    getProductsByCategoryService,
    getAllCategoriesAdminService,
    createCategoryService,
    updateCategoryService,
    deleteCategoryService,
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

// Admin Controllers
export const getAllCategoriesAdminController = async (req, res, next) => {
    try {
        const categories = await getAllCategoriesAdminService();
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

export const createCategoryController = async (req, res, next) => {
    try {
        const file = req.file;
        const category = await createCategoryService(req.body, file);
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

export const updateCategoryController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const file = req.file;
        const category = await updateCategoryService(id, req.body, file);
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategoryController = async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteCategoryService(id);
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
