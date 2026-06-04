import Setting from '../model/settingModel.js';
import { uploadImageToS3, deleteImageFromS3 } from '../utils/s3Upload.js';

export const getSettings = async (req, res, next) => {
    try {
        let settings = await Setting.findOne({ singletonKey: 'config' });
        
        if (!settings) {
            settings = await Setting.create({ singletonKey: 'config' });
        }
        
        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

export const updateSettings = async (req, res, next) => {
    try {
        const { minOrderValue, freeDeliveryThreshold, deliveryCharge, maxOrdersPerDay } = req.body;
        
        let settings = await Setting.findOne({ singletonKey: 'config' });
        
        if (!settings) {
            settings = new Setting({ singletonKey: 'config' });
        }
        
        if (minOrderValue !== undefined) settings.minOrderValue = minOrderValue;
        if (freeDeliveryThreshold !== undefined) settings.freeDeliveryThreshold = freeDeliveryThreshold;
        if (deliveryCharge !== undefined) settings.deliveryCharge = deliveryCharge;
        if (maxOrdersPerDay !== undefined) settings.maxOrdersPerDay = maxOrdersPerDay;
        
        await settings.save();
        
        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload / replace the Payment QR image
// @route   POST /api/admin/settings/payment-qr
// @access  Private/Admin
export const uploadPaymentQr = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        let settings = await Setting.findOne({ singletonKey: 'config' });
        if (!settings) {
            settings = new Setting({ singletonKey: 'config' });
        }

        // Delete old QR from S3 if it exists
        if (settings.paymentQrUrl) {
            try {
                await deleteImageFromS3(settings.paymentQrUrl);
            } catch (_) {
                // Non-fatal: proceed even if old delete fails
            }
        }

        // Upload new image to S3
        const imageUrl = await uploadImageToS3(req.file, 'settings/payment-qr');
        settings.paymentQrUrl = imageUrl;
        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Payment QR image uploaded successfully',
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete the Payment QR image
// @route   DELETE /api/admin/settings/payment-qr
// @access  Private/Admin
export const deletePaymentQr = async (req, res, next) => {
    try {
        const settings = await Setting.findOne({ singletonKey: 'config' });
        if (!settings || !settings.paymentQrUrl) {
            return res.status(404).json({ success: false, message: 'No payment QR image found' });
        }

        await deleteImageFromS3(settings.paymentQrUrl);
        settings.paymentQrUrl = null;
        await settings.save();

        res.status(200).json({ success: true, message: 'Payment QR image removed', data: settings });
    } catch (error) {
        next(error);
    }
};
