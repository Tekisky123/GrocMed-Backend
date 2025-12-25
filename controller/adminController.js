import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {
  createAdminService,
  getAllAdminsService,
  getAdminByIdService,
  updateAdminService,
  deleteAdminService,
  loginAdminService,
} from '../services/adminService.js';

dotenv.config();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.TOKEN, {
    expiresIn: '7d',
  });
};

export const createAdminController = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const admin = await createAdminService({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAdminsController = async (req, res, next) => {
  try {
    const admins = await getAllAdminsService();

    res.status(200).json({
      success: true,
      message: 'Admins retrieved successfully',
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const admin = await getAdminByIdService(id);

    res.status(200).json({
      success: true,
      message: 'Admin retrieved successfully',
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const admin = await updateAdminService(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminController = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteAdminService(id);

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const loginAdminController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await loginAdminService(email, password);

    const token = generateToken(admin.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

