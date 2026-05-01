import Setting from '../model/settingModel.js';

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
