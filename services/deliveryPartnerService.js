import DeliveryPartner from '../model/deliveryPartnerModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const createDeliveryPartnerService = async (partnerData, adminId) => {
    const { name, phone, email, password, vehicleType, vehicleNumber, licenseNumber } = partnerData;

    // Check if partner already exists
    const existingPartner = await DeliveryPartner.findOne({ $or: [{ email }, { phone }, { licenseNumber }] });
    if (existingPartner) {
        if (existingPartner.email === email) throw new Error('Email already exists');
        if (existingPartner.phone === phone) throw new Error('Phone number already exists');
        if (existingPartner.licenseNumber === licenseNumber) throw new Error('License number already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const deliveryPartner = new DeliveryPartner({
        name,
        phone,
        email,
        password: hashedPassword,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        createdBy: adminId,
    });

    const savedPartner = await deliveryPartner.save();
    // Remove password from response
    savedPartner.password = undefined;
    return savedPartner;
};

export const getAllDeliveryPartnersService = async () => {
    const partners = await DeliveryPartner.find({}).select('-password').sort({ createdAt: -1 });
    return partners;
};

export const getDeliveryPartnerByIdService = async (id) => {
    const partner = await DeliveryPartner.findById(id).select('-password');
    if (!partner) {
        throw new Error('Delivery Partner not found');
    }
    return partner;
};

export const updateDeliveryPartnerService = async (id, updateData) => {
    const { name, phone, email, licenseNumber, vehicleType, vehicleNumber, status, isActive, password } = updateData;

    const partner = await DeliveryPartner.findById(id);
    if (!partner) {
        throw new Error('Delivery Partner not found');
    }

    // Check unique constraints if being updated
    if (phone && phone !== partner.phone) {
        const existingPhone = await DeliveryPartner.findOne({ phone, _id: { $ne: id } });
        if (existingPhone) throw new Error('Phone number already exists');
    }
    if (email && email !== partner.email) {
        const existingEmail = await DeliveryPartner.findOne({ email, _id: { $ne: id } });
        if (existingEmail) throw new Error('Email already exists');
    }
    if (licenseNumber && licenseNumber !== partner.licenseNumber) {
        const existingLicense = await DeliveryPartner.findOne({ licenseNumber, _id: { $ne: id } });
        if (existingLicense) throw new Error('License number already exists');
    }

    let hashedPassword;
    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedPartner = await DeliveryPartner.findByIdAndUpdate(
        id,
        {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(email && { email }),
            ...(licenseNumber && { licenseNumber }),
            ...(vehicleType && { vehicleType }),
            ...(vehicleNumber && { vehicleNumber }),
            ...(status && { status }),
            ...(isActive !== undefined && { isActive }),
            ...(hashedPassword && { password: hashedPassword }),
        },
        { new: true, runValidators: true }
    ).select('-password');

    return updatedPartner;
};


export const deleteDeliveryPartnerService = async (id) => {
    const partner = await DeliveryPartner.findById(id);
    if (!partner) {
        throw new Error('Delivery Partner not found');
    }

    await DeliveryPartner.findByIdAndDelete(id);
    return partner;
};

export const loginDeliveryPartnerService = async (credentials) => {
    const { phone, email, password } = credentials;
    const query = phone ? { phone } : { email };

    const partner = await DeliveryPartner.findOne(query);
    if (!partner) {
        throw new Error('Delivery Partner not found');
    }

    if (!partner.isActive) {
        throw new Error('Account is inactive. Contact admin.');
    }

    const isPasswordValid = await bcrypt.compare(password, partner.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
        { id: partner._id, role: 'delivery_partner', email: partner.email },
        process.env.TOKEN,
        { expiresIn: '7d' }
    );

    partner.password = undefined;
    return { deliveryPartner: partner, token };
};

export const updateDeliveryPartnerFcmTokenService = async (id, fcmToken) => {
    const partner = await DeliveryPartner.findByIdAndUpdate(
        id,
        { fcmToken },
        { new: true }
    ).select('-password');
    return partner;
};

// --- New Services for Partner App ---

import Order from '../model/orderModel.js';

export const getAssignedOrdersService = async (partnerId) => {
    const orders = await Order.find({ deliveryPartner: partnerId })
        .populate('customer', 'name phone email')
        .sort({ updatedAt: -1 });
    return orders;
};

export const getPartnerStatsService = async (partnerId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const totalDeliveries = await Order.countDocuments({ 
        deliveryPartner: partnerId, 
        orderStatus: 'Delivered' 
    });

    const todayDeliveries = await Order.countDocuments({ 
        deliveryPartner: partnerId, 
        orderStatus: 'Delivered',
        updatedAt: { $gte: today }
    });

    const monthlyDeliveries = await Order.countDocuments({ 
        deliveryPartner: partnerId, 
        orderStatus: 'Delivered',
        updatedAt: { $gte: startOfMonth }
    });

    const pendingDeliveries = await Order.countDocuments({ 
        deliveryPartner: partnerId, 
        orderStatus: { $in: ['Shipped', 'Out for Delivery', 'Packed'] } 
    });

    // Earnings logic: ₹40 per delivery
    const totalEarnings = totalDeliveries * 40;
    const todayEarnings = todayDeliveries * 40;
    const monthlyEarnings = monthlyDeliveries * 40;

    // Get recent activities (last 5 status changes for this partner)
    const recentOrders = await Order.find({ deliveryPartner: partnerId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('orderStatus updatedAt _id totalAmount');

    return {
        totalDeliveries,
        todayDeliveries,
        monthlyDeliveries,
        pendingDeliveries,
        totalEarnings,
        todayEarnings,
        monthlyEarnings,
        recentActivities: recentOrders.map(o => ({
            id: o._id,
            status: o.orderStatus,
            time: o.updatedAt,
            orderId: o._id,
            amount: o.totalAmount
        }))
    };
};

import AdminNotification from '../model/adminNotificationModel.js';

export const getPartnerNotificationsService = async (partnerId) => {
    const notifications = await AdminNotification.find({
        $or: [
            { targetAudience: { $in: ['all', 'delivery_partners'] } },
            { targetAudience: 'specific', recipientType: 'DeliveryPartner', recipientId: partnerId }
        ],
        status: 'sent'
    }).sort({ sentAt: -1 });
    return notifications;
};
