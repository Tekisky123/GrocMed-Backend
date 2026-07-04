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
        const currentIST = moment().utcOffset("+05:30");
        const todayISTStr = currentIST.format('YYYY-MM-DD');

        const targetDateStr = date || todayISTStr;
        const targetDate = moment.utc(targetDateStr).startOf('day');
        
        // 1. Get settings
        const settings = await Setting.findOne({ singletonKey: 'config' });
        const maxOrders = settings?.maxOrdersPerDay || 50;
        const maxOrdersPerSlot = settings?.maxOrdersPerSlot || 20;

        // 2. Count orders for that date (scheduled for delivery on targetDate)
        const start = targetDate.toDate();
        const end = moment.utc(targetDate).endOf('day').toDate();
        
        const totalOrderCount = await Order.countDocuments({
            deliveryDate: { $gte: start, $lte: end },
            orderStatus: { $ne: 'Cancelled' }
        });

        // 3. Get active slots
        const slots = await DeliverySlot.find({ isActive: true }).sort({ displayOrder: 1 });

        // Calculate count of orders for each slot on this date
        const slotOrders = await Order.aggregate([
            {
                $match: {
                    deliveryDate: { $gte: start, $lte: end },
                    orderStatus: { $ne: 'Cancelled' }
                }
            },
            {
                $group: {
                    _id: "$deliverySlot",
                    count: { $sum: 1 }
                }
            }
        ]);

        const slotCountMap = {};
        slotOrders.forEach(item => {
            if (item._id) {
                slotCountMap[item._id] = item.count;
            }
        });

        // Add availability info to each slot
        const availableSlotsWithCapacity = slots.map(slot => {
            const currentOrdersForSlot = slotCountMap[slot.name] || 0;
            const isSlotFull = currentOrdersForSlot >= maxOrdersPerSlot;
            return {
                ...slot.toObject(),
                currentOrders: currentOrdersForSlot,
                maxOrders: maxOrdersPerSlot,
                isFull: isSlotFull
            };
        });

        // Filter out passed slots for today
        let finalAvailableSlots = availableSlotsWithCapacity;
        if (targetDateStr === todayISTStr) {
            const currentTimeStr = currentIST.format('HH:mm');
            finalAvailableSlots = availableSlotsWithCapacity.filter(slot => {
                return slot.startTime > currentTimeStr;
            });
        }

        // The day is full if the total day orders >= maxOrders OR if all active slots are full/passed
        const allSlotsFull = slots.length > 0 && (finalAvailableSlots.length === 0 || finalAvailableSlots.every(slot => slot.isFull));
        const dayIsFull = (totalOrderCount >= maxOrders) || allSlotsFull;

        res.status(200).json({
            success: true,
            data: {
                isFull: dayIsFull,
                maxOrders,
                currentOrders: totalOrderCount,
                availableSlots: finalAvailableSlots,
                date: targetDate.format('YYYY-MM-DD')
            }
        });
    } catch (error) {
        next(error);
    }
};
