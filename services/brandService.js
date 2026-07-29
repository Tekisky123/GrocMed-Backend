import Brand from '../model/brandModel.js';

export const getAllBrandsService = async (onlyActive = false) => {
  const query = onlyActive ? { isActive: true } : {};
  return await Brand.find(query).sort({ name: 1 });
};

export const createBrandService = async (brandData) => {
  const { name, description, isActive } = brandData;
  
  const normalizedName = name.trim();
  const existing = await Brand.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
  if (existing) {
    throw new Error('Brand with this name already exists');
  }

  const brand = new Brand({
    name: normalizedName,
    description,
    isActive: isActive !== undefined ? isActive : true,
  });

  return await brand.save();
};

export const updateBrandService = async (id, brandData) => {
  const { name, description, isActive } = brandData;

  const brand = await Brand.findById(id);
  if (!brand) {
    throw new Error('Brand not found');
  }

  if (name && name.trim().toLowerCase() !== brand.name.toLowerCase()) {
    const normalizedName = name.trim();
    const existing = await Brand.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }, _id: { $ne: id } });
    if (existing) {
      throw new Error('Brand with this name already exists');
    }
    brand.name = normalizedName;
  }

  if (description !== undefined) brand.description = description;
  if (isActive !== undefined) brand.isActive = isActive;

  return await brand.save();
};

export const deleteBrandService = async (id) => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new Error('Brand not found');
  }

  await Brand.findByIdAndDelete(id);
  return { message: 'Brand deleted successfully' };
};
