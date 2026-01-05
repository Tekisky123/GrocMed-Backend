import Product from '../model/productModel.js';
import { uploadImageToS3, uploadMultipleImagesToS3, deleteImageFromS3 } from '../utils/s3Upload.js';

export const createProductService = async (productData, images, adminId) => {
  const {
    name, description, brand, category,
    unitType, perUnitWeightVolume, unitsPerUnitType,
    mrp, offerPrice, singleUnitPrice,
    stock, minimumQuantity, manfDate, expiryDate,
    notifyCustomers, isOffer, isActive
  } = productData;

  // Check if product with same name already exists
  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    throw new Error('Product with this name already exists');
  }

  // Upload images to S3
  let imageUrls = [];
  if (images && images.length > 0) {
    imageUrls = await uploadMultipleImagesToS3(images);
  }

  const product = new Product({
    name,
    description,
    brand,
    category,
    unitType,
    perUnitWeightVolume,
    unitsPerUnitType: unitsPerUnitType || 1,
    mrp,
    offerPrice,
    singleUnitPrice,
    stock: stock || 0,
    minimumQuantity: minimumQuantity || 1,
    manfDate: manfDate ? new Date(manfDate) : undefined,
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    images: imageUrls,
    notifyCustomers: notifyCustomers !== undefined ? notifyCustomers : false,
    isOffer: isOffer !== undefined ? isOffer : false,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: adminId,
  });

  const savedProduct = await product.save();
  return savedProduct;
};

export const getAllProductsService = async (isAdmin = false) => {
  let query = {};

  // For non-admin users, only return active products
  if (!isAdmin) {
    query.isActive = true;
  }

  const products = await Product.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  return products;
};

export const getProductByIdService = async (productId, isAdmin = false) => {
  let query = { _id: productId };

  // For non-admin users, only return active products
  if (!isAdmin) {
    query.isActive = true;
  }

  const product = await Product.findOne(query).populate('createdBy', 'name email');

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

export const updateProductService = async (productId, updateData, images, adminId) => {
  const {
    name, description, brand, category,
    unitType, perUnitWeightVolume, unitsPerUnitType,
    mrp, offerPrice, singleUnitPrice,
    stock, minimumQuantity, manfDate, expiryDate,
    notifyCustomers, isOffer, isActive, existingImages
  } = updateData;

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Check if name is being updated and if it already exists
  if (name && name !== product.name) {
    const existingProduct = await Product.findOne({ name, _id: { $ne: productId } });
    if (existingProduct) {
      throw new Error('Product with this name already exists');
    }
  }

  // Handle image updates
  let imageUrls = existingImages || product.images || [];

  // Upload new images if provided
  if (images && images.length > 0) {
    const newImageUrls = await uploadMultipleImagesToS3(images);
    imageUrls = [...imageUrls, ...newImageUrls];
  }

  // Update product
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      ...(name && { name }),
      ...(description && { description }),
      ...(brand && { brand }),
      ...(category && { category }),
      ...(unitType && { unitType }),
      ...(perUnitWeightVolume && { perUnitWeightVolume }),
      ...(unitsPerUnitType !== undefined && { unitsPerUnitType }),
      ...(mrp !== undefined && { mrp }),
      ...(offerPrice !== undefined && { offerPrice }),
      ...(singleUnitPrice !== undefined && { singleUnitPrice }),
      ...(stock !== undefined && { stock }),
      ...(minimumQuantity !== undefined && { minimumQuantity }),
      ...(manfDate && { manfDate: new Date(manfDate) }),
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      ...(notifyCustomers !== undefined && { notifyCustomers }),
      ...(isOffer !== undefined && { isOffer }),
      ...(isActive !== undefined && { isActive }),
      images: imageUrls,
    },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  return updatedProduct;
};

export const deleteProductService = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Delete images from S3
  if (product.images && product.images.length > 0) {
    try {
      await Promise.all(product.images.map((imageUrl) => deleteImageFromS3(imageUrl)));
    } catch (error) {
      // Continue with product deletion even if image deletion fails
    }
  }

  await Product.findByIdAndDelete(productId);
  return { message: 'Product deleted successfully' };
};

export const deleteProductImageService = async (productId, imageUrl) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Remove image from product's images array
  product.images = product.images.filter((img) => img !== imageUrl);
  await product.save();

  // Delete image from S3
  try {
    await deleteImageFromS3(imageUrl);
  } catch (error) {
    throw new Error('Failed to delete image from S3');
  }

  return product;
};

export const searchProductsService = async (query, category, onlyActive = true) => {
  const searchCriteria = {};

  if (onlyActive) {
    searchCriteria.isActive = true;
  }

  if (query) {
    searchCriteria.$or = [
      { name: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ];
  }

  if (category) {
    searchCriteria.category = { $regex: category, $options: 'i' };
  }

  const products = await Product.find(searchCriteria).sort({ createdAt: -1 });
  return products;
};

export const getSuggestedProductsService = async (productId) => {
  const currentProduct = await Product.findById(productId);
  if (!currentProduct) {
    throw new Error('Product not found');
  }

  const suggestedProducts = await Product.find({
    category: currentProduct.category,
    _id: { $ne: productId }, // Exclude current product
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(10); // Limit to 10 suggestions

  return suggestedProducts;
};

