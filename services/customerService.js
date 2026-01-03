import Customer from '../model/customerModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerCustomerService = async (customerData) => {
    const { name, phone, email, password, pan, adhaar } = customerData;

    const existingCustomer = await Customer.findOne({ $or: [{ email }, { phone }] });
    if (existingCustomer) {
        if (existingCustomer.email === email) throw new Error('Email already registered');
        if (existingCustomer.phone === phone) throw new Error('Phone number already registered');
    }

    // Check unique PAN/Adhaar if provided
    if (pan) {
        const panExists = await Customer.findOne({ pan });
        if (panExists) throw new Error('PAN already registered');
    }
    if (adhaar) {
        const adhaarExists = await Customer.findOne({ adhaar });
        if (adhaarExists) throw new Error('Adhaar already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
        name,
        phone,
        email,
        password: hashedPassword,
        pan,
        adhaar,
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
        expiresIn: '7d',
    });

    customer.password = undefined;
    return { customer, token };
};

export const getAllCustomersService = async () => {
    return await Customer.find({}).select('-password');
};

export const getCustomerByIdService = async (id) => {
    const customer = await Customer.findById(id).select('-password');
    if (!customer) throw new Error('Customer not found');
    return customer;
};

export const updateCustomerService = async (id, updateData) => {
    const { name, phone, email, addresses, pan, adhaar } = updateData;

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

    const updatedCustomer = await Customer.findByIdAndUpdate(
        id,
        {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(email && { email }),
            ...(addresses && { addresses }),
            ...(pan && { pan }),
            ...(adhaar && { adhaar }),
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
    }).select('-password');
    return customers;
};
