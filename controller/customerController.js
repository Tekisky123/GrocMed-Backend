import {
    registerCustomerService,
    loginCustomerService,
    getAllCustomersService,
    getCustomerByIdService,
    updateCustomerService,
    deleteCustomerService,
    updateCustomerFcmTokenService,
    searchCustomersService,
} from '../services/customerService.js';

export const registerCustomer = async (req, res) => {
    try {
        const customer = await registerCustomerService(req.body);
        res.status(201).json({
            success: true,
            message: 'Customer registered successfully',
            data: customer,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const loginCustomer = async (req, res) => {
    try {
        const { customer, token } = await loginCustomerService(req.body);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: customer,
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

export const logoutCustomer = async (req, res) => {
    // Stateless JWT logout - usually handled on client, but sending success here
    res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
};

export const getAllCustomers = async (req, res) => {
    try {
        const customers = await getAllCustomersService();
        res.status(200).json({
            success: true,
            data: customers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getCustomerProfile = async (req, res) => {
    try {
        const customerId = req.customer ? req.customer._id : req.params.id; // From auth token or param
        const customer = await getCustomerByIdService(customerId);
        res.status(200).json({
            success: true,
            data: customer,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateCustomerProfile = async (req, res) => {
    try {
        const customerId = req.customer._id; // Updates own profile
        const customer = await updateCustomerService(customerId, req.body);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: customer,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteCustomerService(id);
        res.status(200).json({
            success: true,
            message: 'Customer deleted successfully',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateFcmToken = async (req, res) => {
    try {
        const customerId = req.customer._id;
        const { fcmToken } = req.body;
        if (!fcmToken) throw new Error('FCM token is required');

        await updateCustomerFcmTokenService(customerId, fcmToken);

        res.status(200).json({
            success: true,
            message: 'FCM Token updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const searchCustomers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            const customers = await getAllCustomersService();
            return res.status(200).json({
                success: true,
                count: customers.length,
                data: customers
            });
        }

        const customers = await searchCustomersService(query);

        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
