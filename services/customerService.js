import Customer from '../model/customerModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const registerCustomerService = async (customerData) => {
    const { name, phone, email, password } = customerData;

    const existingCustomer = await Customer.findOne({ $or: [{ email }, { phone }] });
    if (existingCustomer) {
        if (existingCustomer.email === email) throw new Error('Email already registered');
        if (existingCustomer.phone === phone) throw new Error('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
        name,
        phone,
        email,
        password: hashedPassword,
    });

    const savedCustomer = await customer.save();
    savedCustomer.password = undefined;
    return savedCustomer;
};

export const loginCustomerService = async (credentials) => {
    const { email, phone, password } = credentials;

    const query = email ? { email } : { phone };
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
    const { name, phone, email, addresses } = updateData;

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

    const updatedCustomer = await Customer.findByIdAndUpdate(
        id,
        {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(email && { email }),
            ...(addresses && { addresses }),
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
