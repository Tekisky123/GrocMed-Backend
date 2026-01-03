import Order from '../model/orderModel.js';
import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';
import { sendPushNotification } from '../utils/notificationService.js';

export const createOrderService = async (customerId, orderData) => {
    const { shippingAddress, paymentMethod } = orderData;

    // Get customer's cart
    const cart = await Cart.findOne({ customer: customerId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
    }

    // Create order items snapshot
    const orderItems = cart.items.map((item) => {
        if (!item.product) {
            throw new Error('Product in cart not found');
        }
        return {
            product: item.product._id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price, // Price at time of adding to cart (or could refresh here)
            image: item.product.images && item.product.images.length > 0 ? item.product.images[0] : null,
        };
    });

    const totalAmount = cart.totalAmount;

    const order = new Order({
        customer: customerId,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        totalAmount,
        orderStatus: 'Placed',
        trackingHistory: [
            {
                status: 'Placed',
                description: 'Order placed successfully',
                timestamp: new Date(),
            },
        ],
    });

    await order.save();

    // Clear cart
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    return order;
};

export const getMyOrdersService = async (customerId) => {
    const orders = await Order.find({ customer: customerId }).sort({ createdAt: -1 });
    return orders;
};

export const getOrderByIdService = async (orderId, customerId) => {
    const order = await Order.findOne({ _id: orderId, customer: customerId });
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

export const trackOrderService = async (orderId, customerId) => {
    const order = await Order.findOne({ _id: orderId, customer: customerId }).select('trackingHistory orderStatus');
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

// Admin Services

export const getAllOrdersService = async () => {
    const orders = await Order.find({})
        .populate('customer', 'name phone email')
        .sort({ createdAt: -1 });
    return orders;
};

export const getOrderByIdForAdminService = async (orderId) => {
    const order = await Order.findById(orderId).populate('customer', 'name phone email');
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

export const updateOrderStatusService = async (orderId, status) => {
    const validStatuses = ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid order status');
    }

    const order = await Order.findById(orderId).populate('customer', 'name fcmToken');
    if (!order) {
        throw new Error('Order not found');
    }

    order.orderStatus = status;
    order.trackingHistory.push({
        status: status,
        description: `Order status updated to ${status}`,
        timestamp: new Date(),
    });

    await order.save();

    // Send Push Notification
    if (order.customer && order.customer.fcmToken) {
        console.log(`Sending notification to Customer: ${order.customer._id} | Token: ${order.customer.fcmToken}`);
        const title = 'Order Update';
        const body = `Your order #${order._id.toString().slice(-6)} is now ${status}`;
        await sendPushNotification(order.customer.fcmToken, title, body, { orderId: orderId });
    } else {
        console.log(`No FCM Token found for Customer: ${order.customer?._id}`);
    }

    return order;
};

export const searchOrdersService = async (query) => {
    // Search by Order ID (exact) or Customer Name/Phone (partial)
    // First, find customers matching name/phone
    const customers = await Customer.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } },
        ]
    }).select('_id');

    const customerIds = customers.map(c => c._id);

    const searchCriteria = {
        $or: [
            { customer: { $in: customerIds } },
        ]
    };

    // If query is valid ObjectId, add it to search
    if (query.match(/^[0-9a-fA-F]{24}$/)) {
        searchCriteria.$or.push({ _id: query });
    }

    const orders = await Order.find(searchCriteria)
        .populate('customer', 'name phone email')
        .sort({ createdAt: -1 });

    return orders;
};
