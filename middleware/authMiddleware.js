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

// Authorization middleware for specific roles
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.customer ? 'customer' : req.admin ? 'admin' : req.deliveryPartner ? 'delivery_partner' : null;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role (${userRole}) is not authorized to access this resource`,
      });
    }
    next();
  };
};

// Shorthand helpers
export const isCustomer = (req, res, next) => {
  if (!req.customer) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer only resource.',
    });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only resource.',
    });
  }
  next();
};

export const isDeliveryPartner = (req, res, next) => {
  if (!req.deliveryPartner) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Delivery Partner only resource.',
    });
  }
  next();
};

