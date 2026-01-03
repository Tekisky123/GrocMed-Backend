import {
    getAllOrdersService,
    getOrderByIdForAdminService,
    updateOrderStatusService,
    searchOrdersService,
} from '../services/orderService.js';

export const getAllOrders = async (req, res, next) => {
    try {
        const orders = await getAllOrdersService();
        res.status(200).json({
            success: true,
            message: 'All orders retrieved successfully',
            count: orders.length,
            data: orders,
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await getOrderByIdForAdminService(id);
        res.status(200).json({
            success: true,
            message: 'Order retrieved successfully',
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required',
            });
        }

        const order = await updateOrderStatusService(id, status);

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

export const searchOrders = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query) {
            // If no query, return all or empty. Let's return all for simplicity or error.
            // Reuse getAll
            const orders = await getAllOrdersService();
            return res.status(200).json({
                success: true,
                count: orders.length,
                data: orders
            });
        }

        const orders = await searchOrdersService(query);

        res.status(200).json({
            success: true,
            message: 'Orders found successfully',
            count: orders.length,
            data: orders,
        });
    } catch (error) {
        next(error);
    }
};
