import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Admin from '../model/adminModel.js';
import Customer from '../model/customerModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';

dotenv.config();

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const decoded = jwt.verify(token, process.env.TOKEN);

    if (decoded.role === 'customer') {
      const customer = await Customer.findById(decoded.id).select('-password');
      if (!customer || !customer.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive customer',
        });
      }
      req.customer = customer;
    } else if (decoded.role === 'delivery_partner') {
      const partner = await DeliveryPartner.findById(decoded.id).select('-password');
      if (!partner || !partner.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive delivery partner',
        });
      }
      req.deliveryPartner = partner;
    } else if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or inactive admin',
        });
      }
      req.admin = admin;
    } else {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized role',
      });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
};

