import Category from '../model/categoryModel.js';
import Product from '../model/productModel.js';
import { uploadImageToS3, deleteImageFromS3 } from '../utils/s3Upload.js';
import { cacheService } from '../utils/cacheService.js';

export const getAllCategoriesService = async () => {
    const cached = cacheService.get('categories_public');
    if (cached) return cached;

    const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    if (!categories || categories.length === 0) return [];

    const results = await Promise.all(
        categories.map(async (cat) => {
            let image = cat.image || null;
            const [productCount, firstProduct] = await Promise.all([
                Product.countDocuments({
                    category: { $regex: new RegExp(`^${cat.name}$`, 'i') },
                    isActive: true
                }),
                !image ? Product.findOne({
                    category: { $regex: new RegExp(`^${cat.name}$`, 'i') },
                    isActive: true
                }).select('images').lean() : null
            ]);

            if (!image && firstProduct?.images?.length) {
                image = firstProduct.images[0];
            }

            return {
                _id: cat._id,
                name: cat.name,
                image,
                productCount
            };
        })
    );

    cacheService.set('categories_public', results, 120); // 2 min cache
    return results;
};

export const getProductsByCategoryService = async (category) => {
    const cacheKey = `products_category_${category}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const products = await Product.find({
        category: { $regex: new RegExp(`^${category}$`, 'i') }, // Case-insensitive exact match
        isActive: true
    }).sort({ createdAt: -1 }).lean();

    cacheService.set(cacheKey, products, 60);
    return products;
};

// Admin Services
export const getAllCategoriesAdminService = async () => {
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    if (!categories || categories.length === 0) return [];

    const results = await Promise.all(
        categories.map(async (cat) => {
            const productCount = await Product.countDocuments({
                category: { $regex: new RegExp(`^${cat.name}$`, 'i') }
            });
            return {
                _id: cat._id,
                name: cat.name,
                image: cat.image,
                isActive: cat.isActive,
                productCount,
                createdAt: cat.createdAt,
                updatedAt: cat.updatedAt
            };
        })
    );

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

    const saved = await category.save();
    cacheService.clearPattern('categories');
    return saved;
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

    const updated = await category.save();
    cacheService.clearPattern('categories');
    return updated;
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
    cacheService.clearPattern('categories');
    return { message: 'Category deleted successfully' };
};
