import Product from '../model/productModel.js';

export const getAllCategoriesService = async () => {
    const categories = await Product.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$category',
                image: { $first: { $arrayElemAt: ['$images', 0] } },
                productCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                name: '$_id',
                image: 1,
                productCount: 1
            }
        }
    ]);
    return categories;
};

export const getProductsByCategoryService = async (category) => {
    const products = await Product.find({
        category: { $regex: new RegExp(`^${category}$`, 'i') }, // Case-insensitive exact match
        isActive: true
    }).sort({ createdAt: -1 });

    return products;
};
