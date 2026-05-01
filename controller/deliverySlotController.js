import DeliverySlot from '../model/deliverySlotModel.js';
import Order from '../model/orderModel.js';
import Setting from '../model/settingModel.js';
import moment from 'moment';

// Admin: Get all slots
export const getAllSlots = async (req, res, next) => {
    try {
        const slots = await DeliverySlot.find().sort({ displayOrder: 1 });
        res.status(200).json({ success: true, data: slots });
    } catch (error) {
        next(error);
    }
};

// Admin: Create slot
export const createSlot = async (req, res, next) => {
    try {
        const slot = await DeliverySlot.create(req.body);
        res.status(201).json({ success: true, data: slot });
    } catch (error) {
        next(error);
    }
};

// Admin: Update slot
export const updateSlot = async (req, res, next) => {
    try {
        const slot = await DeliverySlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: slot });
    } catch (error) {
        next(error);
    }
};

// Admin: Delete slot
export const deleteSlot = async (req, res, next) => {
    try {
        await DeliverySlot.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Slot deleted' });
    } catch (error) {
        next(error);
    }
};

// Public: Get availability for a specific date
export const checkAvailability = async (req, res, next) => {
    try {
        const { date } = req.query; // Format: YYYY-MM-DD
        const targetDate = date ? moment(date).startOf('day') : moment().startOf('day');
        
        // 1. Get settings
        const settings = await Setting.findOne({ singletonKey: 'config' });
        const maxOrders = settings?.maxOrdersPerDay || 50;

        // 2. Count orders for that date
        const start = targetDate.toDate();
        const end = moment(targetDate).endOf('day').toDate();
        
        const orderCount = await Order.countDocuments({
            createdAt: { $gte: start, $lte: end },
            orderStatus: { $ne: 'Cancelled' }
        });

        const isFull = orderCount >= maxOrders;

        // 3. Get active slots
        const slots = await DeliverySlot.find({ isActive: true }).sort({ displayOrder: 1 });

        res.status(200).json({
            success: true,
            data: {
                isFull,
                maxOrders,
                currentOrders: orderCount,
                availableSlots: slots,
                date: targetDate.format('YYYY-MM-DD')
            }
        });
    } catch (error) {
        next(error);
    }
};
