import AccountLedger from '../model/accountLedgerModel.js';
import Admin from '../model/adminModel.js';
import AdminNotification from '../model/adminNotificationModel.js';
import Banner from '../model/bannerModel.js';
import Cart from '../model/cartModel.js';
import Charge from '../model/chargeModel.js';
import Customer from '../model/customerModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';
import DeliverySlot from '../model/deliverySlotModel.js';
import Director from '../model/directorModel.js';
import Employee from '../model/employeeModel.js';
import FixedAsset from '../model/fixedAssetModel.js';
import GST from '../model/gstModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import Order from '../model/orderModel.js';
import Payroll from '../model/payrollModel.js';
import Pincode from '../model/pincodeModel.js';
import Product from '../model/productModel.js';
import Purchase from '../model/purchaseModel.js';
import Setting from '../model/settingModel.js';
import Shareholder from '../model/shareholderModel.js';
import StockAdjustment from '../model/stockAdjustmentModel.js';
import Vendor from '../model/vendorModel.js';

const modelsMap = {
  AccountLedger,
  Admin,
  AdminNotification,
  Banner,
  Cart,
  Charge,
  Customer,
  DeliveryPartner,
  DeliverySlot,
  Director,
  Employee,
  FixedAsset,
  GST,
  JournalEntry,
  Order,
  Payroll,
  Pincode,
  Product,
  Purchase,
  Setting,
  Shareholder,
  StockAdjustment,
  Vendor
};

const verifyAdminPassword = async (adminId, password) => {
  if (!password) return false;
  const admin = await Admin.findById(adminId);
  if (!admin) return false;
  return await admin.comparePassword(password);
};

export const exportAllDataController = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    const isPasswordValid = await verifyAdminPassword(req.admin._id, password);
    if (!isPasswordValid) {
      return res.status(403).json({ success: false, message: 'Incorrect password' });
    }

    const backup = {
      version: '1.0.0',
      backupDate: new Date().toISOString(),
      data: {}
    };

    for (const [modelName, Model] of Object.entries(modelsMap)) {
      backup.data[modelName] = await Model.find().lean();
    }

    res.status(200).json(backup);
  } catch (error) {
    next(error);
  }
};

export const restoreAllDataController = async (req, res, next) => {
  try {
    const { data, version, password } = req.body;

    const isPasswordValid = await verifyAdminPassword(req.admin._id, password);
    if (!isPasswordValid) {
      return res.status(403).json({ success: false, message: 'Incorrect password' });
    }
    
    if (!data) {
      return res.status(400).json({ success: false, message: 'Invalid backup file content: missing data' });
    }

    const summary = {};

    // Validate that all collections map to existing models first
    for (const modelName of Object.keys(data)) {
      if (!modelsMap[modelName]) {
        return res.status(400).json({ success: false, message: `Unknown collection: ${modelName} in backup file` });
      }
    }

    // Now clear and restore each collection
    for (const [modelName, documents] of Object.entries(data)) {
      const Model = modelsMap[modelName];
      
      // Clear all existing documents
      await Model.deleteMany({});
      
      if (documents && documents.length > 0) {
        // Mongoose insertMany handles schema casting (ObjectIds, numbers, dates)
        // and preserves original timestamps (createdAt/updatedAt)
        await Model.insertMany(documents, { timestamps: false });
      }
      summary[modelName] = documents.length;
    }

    res.status(200).json({
      success: true,
      message: 'Database restored successfully',
      summary
    });
  } catch (error) {
    console.error('Database Restore Error:', error);
    next(error);
  }
};
