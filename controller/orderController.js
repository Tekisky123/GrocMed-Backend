import {
    createOrderService,
    getMyOrdersService,
    getOrderByIdService,
    trackOrderService,
} from '../services/orderService.js';

export const placeOrder = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const orderData = req.body;

        const order = await createOrderService(customerId, orderData);

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

export const getMyOrders = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const orders = await getMyOrdersService(customerId);

        res.status(200).json({
            success: true,
            message: 'Orders retrieved successfully',
            count: orders.length,
            data: orders,
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const { id } = req.params;

        const order = await getOrderByIdService(id, customerId);

        res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

export const trackOrder = async (req, res, next) => {
    try {
        const customerId = req.customer._id;
        const { id } = req.params;

        const tracking = await trackOrderService(id, customerId);

        res.status(200).json({
            success: true,
            message: 'Order tracking retrieved successfully',
            data: tracking,
        });
    } catch (error) {
        next(error);
    }
};
