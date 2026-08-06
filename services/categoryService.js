import Category from '../model/categoryModel.js';
import Product from '../model/productModel.js';
import { uploadImageToS3, deleteImageFromS3 } from '../utils/s3Upload.js';

export const getAllCategoriesService = async () => {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    const results = [];
    
    for (const cat of categories) {
        const productCount = await Product.countDocuments({ 
            category: { $regex: new RegExp(`^${cat.name}$`, 'i') }, 
            isActive: true 
        });
        let image = cat.image || null;
        if (!image) {
            const firstProduct = await Product.findOne({ 
                category: { $regex: new RegExp(`^${cat.name}$`, 'i') }, 
                isActive: true 
            }).select('images');
            image = firstProduct?.images?.[0] || null;
        }
        results.push({
            _id: cat._id,
            name: cat.name,
            image,
            productCount
        });
    }
    return results;
};

export const getProductsByCategoryService = async (category) => {
    const products = await Product.find({
        category: { $regex: new RegExp(`^${category}$`, 'i') }, // Case-insensitive exact match
        isActive: true
    }).sort({ createdAt: -1 });

    return products;
};

// Admin Services
export const getAllCategoriesAdminService = async () => {
    const categories = await Category.find({}).sort({ name: 1 });
    const results = [];

    for (const cat of categories) {
        const productCount = await Product.countDocuments({ 
            category: { $regex: new RegExp(`^${cat.name}$`, 'i') } 
        });
        results.push({
            _id: cat._id,
            name: cat.name,
            image: cat.image,
            isActive: cat.isActive,
            productCount,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt
        });
    }
    return results;
};

export const createCategoryService = async (categoryData, file) => {
    const { name, isActive } = categoryData;
    const normalizedName = name.trim();

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
    if (existing) {
        throw new Error('Category with this name already exists');
    }

    let imageUrl = '';
    if (file) {
        imageUrl = await uploadImageToS3(file, 'categories');
    }

    const category = new Category({
        name: normalizedName,
        image: imageUrl || undefined,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
    });

    return await category.save();
};

export const updateCategoryService = async (id, categoryData, file) => {
    const { name, isActive, removeImage } = categoryData;
    const category = await Category.findById(id);
    if (!category) {
        throw new Error('Category not found');
    }

    if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const normalizedName = name.trim();
        const existing = await Category.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }, _id: { $ne: id } });
        if (existing) {
            throw new Error('Category with this name already exists');
        }
        
        // Also update any products associated with this category to keep data consistent
        await Product.updateMany({ category: category.name }, { category: normalizedName });
        category.name = normalizedName;
    }

    if (isActive !== undefined) {
        category.isActive = isActive === 'true' || isActive === true;
    }

    if (removeImage === 'true' || removeImage === true) {
        if (category.image) {
            try {
                await deleteImageFromS3(category.image);
            } catch (err) {
                console.error('Failed to delete old category image from S3:', err);
            }
            category.image = undefined;
        }
    }

    if (file) {
        // Delete old image if it exists
        if (category.image) {
            try {
                await deleteImageFromS3(category.image);
            } catch (err) {
                console.error('Failed to delete old category image from S3:', err);
            }
        }
        category.image = await uploadImageToS3(file, 'categories');
    }

    return await category.save();
};

export const deleteCategoryService = async (id) => {
    const category = await Category.findById(id);
    if (!category) {
        throw new Error('Category not found');
    }

    // Delete image from S3 if exists
    if (category.image) {
        try {
            await deleteImageFromS3(category.image);
        } catch (err) {
            console.error('Failed to delete category image from S3:', err);
        }
    }

    await Category.findByIdAndDelete(id);
    return { message: 'Category deleted successfully' };
};
