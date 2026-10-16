import Order from '../model/orderModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Customer from '../model/customerModel.js';
import AdminNotification from '../model/adminNotificationModel.js';

export const registerCustomerService = async (customerData) => {
    const { name, phone, email, password, pan, adhaar, shopName, licenseNumber, adhaarImage, licenseImage } = customerData;

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPhone = phone ? phone.trim() : '';
    const cleanPan = (pan && typeof pan === 'string' && pan.trim()) ? pan.trim() : undefined;
    const cleanAdhaar = (adhaar && typeof adhaar === 'string' && adhaar.trim()) ? adhaar.trim() : undefined;

    const existingCustomer = await Customer.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] });
    if (existingCustomer) {
        if (existingCustomer.email === cleanEmail) throw new Error('Email already registered');
        if (existingCustomer.phone === cleanPhone) throw new Error('Phone number already registered');
    }

    // Check unique PAN/Adhaar if provided
    if (cleanPan) {
        const panExists = await Customer.findOne({ pan: cleanPan });
        if (panExists) throw new Error('PAN already registered');
    }
    if (cleanAdhaar) {
        const adhaarExists = await Customer.findOne({ adhaar: cleanAdhaar });
        if (adhaarExists) throw new Error('Adhaar already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
        name: name ? name.trim() : name,
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        pan: cleanPan,
        adhaar: cleanAdhaar,
        shopName: shopName ? shopName.trim() : shopName,
        licenseNumber: licenseNumber ? licenseNumber.trim() : licenseNumber,
        adhaarImage,
        licenseImage
    });

    const savedCustomer = await customer.save();
    savedCustomer.password = undefined;
    return savedCustomer;
};

export const loginCustomerService = async (credentials) => {
    const { email, phone, password } = credentials;

    const identifier = email || phone;
    const isEmail = identifier.toString().includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

    const customer = await Customer.findOne(query);

    if (!customer) {
        throw new Error('Customer not found');
    }

    if (!customer.isActive) {
        throw new Error('Account is inactive. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ id: customer._id, role: 'customer' }, process.env.TOKEN, {
        expiresIn: '60d',
    });

    customer.password = undefined;
    return { customer, token };
};

export const getAllCustomersService = async () => {
    return await Customer.find({}).select('-password').sort({ createdAt: -1 });
};

export const getCustomerByIdService = async (id) => {
    const customer = await Customer.findById(id).select('-password');
    if (!customer) throw new Error('Customer not found');
    return customer;
};

export const updateCustomerService = async (id, updateData) => {
    const { name, phone, email, addresses, pan, adhaar, shopName, licenseNumber, adhaarImage, licenseImage } = updateData;

    const customer = await Customer.findById(id);
    if (!customer) throw new Error('Customer not found');

    if (email && email !== customer.email) {
        const emailExists = await Customer.findOne({ email, _id: { $ne: id } });
        if (emailExists) throw new Error('Email already in use');
    }
    if (phone && phone !== customer.phone) {
        const phoneExists = await Customer.findOne({ phone, _id: { $ne: id } });
        if (phoneExists) throw new Error('Phone number already in use');
    }
    if (pan && pan !== customer.pan) {
        const panExists = await Customer.findOne({ pan, _id: { $ne: id } });
        if (panExists) throw new Error('PAN already in use');
    }
    if (adhaar && adhaar !== customer.adhaar) {
        const adhaarExists = await Customer.findOne({ adhaar, _id: { $ne: id } });
        if (adhaarExists) throw new Error('Adhaar already in use');
    }

    let hashedPassword = undefined;
    if (updateData.password && updateData.password.trim()) {
        if (updateData.password.trim().length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }
        hashedPassword = await bcrypt.hash(updateData.password.trim(), 10);
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
        id,
        {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(email && { email }),
            ...(addresses && { addresses }),
            ...(pan && { pan }),
            ...(adhaar && { adhaar }),
            ...(shopName && { shopName }),
            ...(licenseNumber && { licenseNumber }),
            ...(adhaarImage && { adhaarImage }),
            ...(licenseImage && { licenseImage }),
            ...(hashedPassword && { password: hashedPassword }),
        },
        { new: true, runValidators: true }
    ).select('-password');

    return updatedCustomer;
};

export const deleteCustomerService = async (id) => {
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) throw new Error('Customer not found');
    return customer;
};

export const updateCustomerFcmTokenService = async (customerId, fcmToken) => {
    const customer = await Customer.findByIdAndUpdate(
        customerId,
        { fcmToken },
        { new: true }
    );
    return customer;
};

export const searchCustomersService = async (query) => {
    // Search by Name, Email, Phone
    const customers = await Customer.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } }
        ]
    }).select('-password').sort({ createdAt: -1 });
    return customers;
};

export const getCustomerWithOrdersService = async (customerId) => {
    const customer = await Customer.findById(customerId).select('-password');
    if (!customer) throw new Error('Customer not found');

    const orders = await Order.find({ customer: customerId }).sort({ createdAt: -1 });

    return {
        customer,
        orders,
        orderCount: orders.length,
        totalSpent: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    };
};

export const getCustomerNotificationsService = async (customerId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    const query = {
        $or: [
            { targetAudience: { $in: ['all', 'customers'] } },
            { targetAudience: 'specific', recipientType: 'Customer', recipientId: customerId }
        ],
        status: 'sent'
    };

    const notifications = await AdminNotification.find(query)
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await AdminNotification.countDocuments(query);

    return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

export const adminUpdateCustomerPasswordService = async (customerId, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new Error('Customer not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPassword;
    await customer.save();

    // Reset any blocked password reset OTP records for this customer so their OTP limit is restored
    try {
        const PasswordResetOtp = (await import('../model/passwordResetOtpModel.js')).default;
        if (customer.phone) {
            await PasswordResetOtp.deleteMany({ phone: customer.phone, role: 'customer' });
        }
    } catch (e) {
        console.error('Failed to clear OTP record after admin reset:', e.message);
    }

    return {
        success: true,
        message: `Password for "${customer.name || customer.phone}" updated successfully.`
    };
};

