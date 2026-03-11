import GSTReturn from '../model/gstModel.js';
import Order from '../model/orderModel.js';
import PurchaseInvoice from '../model/purchaseModel.js';

// @desc    Get GST returns history
// @route   GET /api/admin/gst
// @access  Private/Admin
export const getGSTReturns = async (req, res, next) => {
    try {
        const returns = await GSTReturn.find().sort('-createdAt');

        res.status(200).json({
            success: true,
            count: returns.length,
            data: returns,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate generic GSTR-1 JSON data for offline tool
// @route   GET /api/admin/gst/gstr1-json
// @access  Private/Admin
export const generateGSTR1Json = async (req, res, next) => {
    try {
        const { period } = req.query; // e.g., '032026'

        // In a real app, this would dynamically pull from the `Order` model 
        // to aggregate total B2B sales and B2C sales to exact state codes.

        // Mock payload structure required by Govt Offline Tool
        const jsonPayload = {
            "version": "MERGE1.0.0",
            "fp": period,
            "b2b": [],
            "b2cs": [],
            // Other GSTR-1 nodes (hsn, nil, doc_issue)
        };

        res.status(200).json({
            success: true,
            data: jsonPayload,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark a return as filed and save ARN
// @route   POST /api/admin/gst/mark-filed
// @access  Private/Admin
export const markAsFiled = async (req, res, next) => {
    try {
        const { returnType, period, arnNumber, jsonData } = req.body;

        const gstReturn = await GSTReturn.findOneAndUpdate(
            { returnType, period },
            {
                status: 'Filed',
                arnNumber,
                jsonData,
                filedDate: new Date()
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: `${returnType} marked as filed successfully with ARN ${arnNumber}`,
            data: gstReturn,
        });
    } catch (error) {
        next(error);
    }
};
