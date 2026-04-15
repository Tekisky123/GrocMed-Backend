import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import Product from '../model/productModel.js';
import Order from '../model/orderModel.js';
import Customer from '../model/customerModel.js';
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
  return jwt.sign({ id, role: 'admin' }, process.env.TOKEN, {
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

// --- GENERIC CSV EXPORT ---
const exportCollectionToCSV = async (Model, res, filename) => {
  const data = await Model.find().lean();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dump');
  
  if (data.length > 0) {
    const keys = Array.from(new Set(data.flatMap(p => Object.keys(p))));
    worksheet.columns = keys.map(k => ({ header: k, key: k }));
    data.forEach(p => {
       const row = {};
       keys.forEach(k => { 
         row[k] = typeof p[k] === 'object' && p[k] !== null ? JSON.stringify(p[k]) : p[k];
       });
       worksheet.addRow(row);
    });
  } else {
    worksheet.columns = [{ header: 'Data', key: 'data' }];
    worksheet.addRow({ data: 'No records found' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  
  await workbook.csv.write(res);
  res.end();
};

export const exportProductsBackupController = async (req, res, next) => {
  try {
    await exportCollectionToCSV(Product, res, 'products_backup');
  } catch (error) {
    next(error);
  }
};

export const exportOrdersBackupController = async (req, res, next) => {
  try {
    await exportCollectionToCSV(Order, res, 'orders_backup');
  } catch (error) {
    next(error);
  }
};

export const exportCustomersBackupController = async (req, res, next) => {
  try {
    await exportCollectionToCSV(Customer, res, 'customers_backup');
  } catch (error) {
    next(error);
  }
};
