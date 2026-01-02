import {
  createProductService,
  getAllProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  deleteProductImageService,
  searchProductsService,
  getSuggestedProductsService,
} from '../services/productService.js';

export const createProductController = async (req, res, next) => {
  try {
    // Remove images from body if they exist (they should be in req.files)
    const { images: bodyImages, ...productData } = req.body;
    const images = req.files || (req.file ? [req.file] : []);
    const adminId = req.admin._id;

    // Check if images are in body instead of files (React Native FormData issue)
    if (bodyImages && bodyImages.length > 0 && (!images || images.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Images are not being sent as file uploads. Please ensure images are appended to FormData correctly.',
        details: 'Images were received as form fields instead of file uploads. Make sure to append images to FormData using the correct format: formData.append("images", { uri, type, name })',
        help: 'In React Native, ensure you are using: formData.append("images", { uri: imageUri, type: "image/jpeg", name: "image.jpg" })'
      });
    }

    // Validate that images are actual file objects
    if (images && images.length > 0) {
      const validImages = images.filter(img => {
        return img && img.buffer && img.mimetype && img.buffer.length > 0;
      });

      if (validImages.length === 0 && images.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image files. Images must be properly formatted file objects.',
          details: 'Expected: FormData with image files. Received: Invalid file format.'
        });
      }
    }

    const product = await createProductService(productData, images, adminId);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProductsController = async (req, res, next) => {
  try {
    // Public route - only return active products
    const products = await getAllProductsService(false);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProductsForAdminController = async (req, res, next) => {
  try {
    const products = await getAllProductsService(true);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Public route - only return active products
    const product = await getProductByIdService(id, false);

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductByIdForAdminController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await getProductByIdService(id, true);

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const images = req.files || (req.file ? [req.file] : []);
    const adminId = req.admin._id;

    const product = await updateProductService(id, updateData, images, adminId);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductController = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteProductService(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductImageController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required',
      });
    }

    const product = await deleteProductImageService(id, imageUrl);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const searchProducts = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    // Public search - search only active products
    const products = await searchProductsService(query, category, true);

    res.status(200).json({
      success: true,
      message: 'Products found successfully',
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getSuggestedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const products = await getSuggestedProductsService(id);

    res.status(200).json({
      success: true,
      message: 'Suggested products retrieved successfully',
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

