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
            "fp": period?.replace('-', '') || "042026",
            "b2b": [],
            "b2cs": [],
            "hsn": { "data": [] },
            "doc_issue": { "doc_det": [] }
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
        const { returnType, formType, period, arnNumber, arn, totalLiability, jsonData } = req.body;

        const rType = returnType || formType;
        const rArn = arnNumber || arn;

        const gstReturn = await GSTReturn.findOneAndUpdate(
            { returnType: rType, period },
            {
                status: 'Filed',
                arnNumber: rArn,
                totalLiability: totalLiability || 0,
                jsonData: jsonData || { manual: true },
                filedDate: new Date()
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: `${rType} marked as filed successfully with ARN ${rArn}`,
            data: gstReturn,
        });
    } catch (error) {
        next(error);
    }
};
