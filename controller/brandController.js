import {
  getAllBrandsService,
  createBrandService,
  updateBrandService,
  deleteBrandService,
} from '../services/brandService.js';

export const getAllBrandsController = async (req, res, next) => {
  try {
    const brands = await getAllBrandsService(true);
    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      data: brands,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBrandsAdminController = async (req, res, next) => {
  try {
    const brands = await getAllBrandsService(false);
    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      data: brands,
    });
  } catch (error) {
    next(error);
  }
};

export const createBrandController = async (req, res, next) => {
  try {
    const brand = await createBrandService(req.body);
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBrandController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await updateBrandService(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBrandController = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteBrandService(id);
    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
