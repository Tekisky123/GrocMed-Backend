import DeliveryPartner from '../model/deliveryPartnerModel.js';
import bcrypt from 'bcrypt';

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
    const { name, phone, vehicleType, vehicleNumber, status, isActive } = updateData;

    const partner = await DeliveryPartner.findById(id);
    if (!partner) {
        throw new Error('Delivery Partner not found');
    }

    // Check unique constraints if being updated
    if (phone && phone !== partner.phone) {
        const existingPhone = await DeliveryPartner.findOne({ phone, _id: { $ne: id } });
        if (existingPhone) throw new Error('Phone number already exists');
    }

    const updatedPartner = await DeliveryPartner.findByIdAndUpdate(
        id,
        {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(vehicleType && { vehicleType }),
            ...(vehicleNumber && { vehicleNumber }),
            ...(status && { status }),
            ...(isActive !== undefined && { isActive }),
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
